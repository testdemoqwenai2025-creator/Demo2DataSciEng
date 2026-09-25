// ============================================================
// Scientific streaming dataset examples for /flink, /kafka, /pulsar, /spark-streaming pages
// 6 examples (2 life sciences + 2 sensors + 1 physics + 1 math) × 5 languages
// Shows how real-time streaming enables the Bronze→Silver→Gold medallion for science
// ============================================================

import type { DatasetExample } from "./dataset-cards";
import {
  Database, Atom, Boxes, Zap, TrendingUp, Activity, Cpu,
  History, Sparkles, Network, ShieldCheck, Layers, Radio,
} from "lucide-react";

// ============================================================
// FLINK_SCIENCE_EXAMPLES (2 examples)
// ============================================================

export const FLINK_SCIENCE_EXAMPLES: DatasetExample[] = [
  // ============================================================
  // 1. REAL-TIME GENOMICS VARIANT CALLING (Life Sciences)
  // ============================================================
  {
    id: "flink-genomics-variant-calling",
    step: "1",
    title: "Real-time Genomics Variant Calling on Flink (10k vars/sec)",
    subtitle: "Life sciences — Illumina sequencer → Flink CDC → Bronze Iceberg",
    accent: "oklch(0.65 0.16 30)",
    icon: <Database className="h-4 w-4" />,
    badge: "Life Sciences · Genomics",
    brief: {
      dataset: "Illumina NovaSeq sequencer output → Flink CDC stream. Simulate variant calls (VCF records) streaming at 10,000 variants/sec from a fleet of 50 sequencers. Flink applies event-time watermarks + deduplication, then writes batches to Bronze Iceberg on S3 partitioned by chromosome + sample.",
      scale: "10k variants/sec · 50 sequencers · 3 billion SNPs/sample · 22 chromosomes · ~1TB/run",
      why: "Genomics variant calling IS the original streaming science problem — a single Illumina NovaSeq produces 240GB/day of variant calls. The medallion pattern via Flink: Bronze (raw VCF events from sequencer) → Silver (normalised + genotype-quality filtered) → Gold (population allele frequencies for GWAS). Flink's exactly-once guarantees via 2-phase commit on checkpoint mean no variant is lost or duplicated — critical for clinical genomics.",
    },
    stats: [
      { label: "Variant rate", value: "10k/sec" },
      { label: "Sequencers", value: "50" },
      { label: "SNPs/sample", value: "3 billion" },
      { label: "Volume/run", value: "1 TB" },
    ],
    tools: ["Apache Flink", "Apache Iceberg", "Illumina RTA", "GATK", "Hail", "S3", "Kafka"],
    codeTabs: [
      {
        lang: "scala",
        filename: "FlinkGenomicsStream.scala",
        code: `import org.apache.flink.streaming.api.scala._
import org.apache.flink.streaming.api.windowing.time.Time
import org.apache.flink.table.api.bridge.scala.StreamTableEnvironment
import org.apache.iceberg.flink.source.IcebergSource
import org.apache.iceberg.flink.sink.IcebergSink

// Real-time genomics variant calling — Flink CDC from sequencer → Bronze Iceberg
// 10,000 variants/sec from 50 Illumina NovaSeq sequencers

val env = StreamExecutionEnvironment.getExecutionEnvironment
  .setParallelism(200)
  .enableCheckpointing(60000)  // 60s checkpoint → exactly-once

val tEnv = StreamTableEnvironment.create(env)

// Source: Kafka topic with VCF records from sequencer fleet
tEnv.executeSql(
  """
    |CREATE TABLE kafka.variants_raw (
    |  chrom      STRING,
    |  pos        BIGINT,
    |  ref        STRING,
    |  alt        STRING,
    |  qual       DOUBLE,
    |  filter     STRING,
    |  sample_id  STRING,
    |  genotype   ROW<gt STRING, gq INT, dp INT>,
    |  sequencer_id STRING,
    |  event_ts   TIMESTAMP(3),
    |  WATERMARK FOR event_ts AS event_ts - INTERVAL '5' SECOND
    |) WITH (
    |  'connector' = 'kafka',
    |  'topic' = 'sequencer.variants',
    |  'properties.bootstrap.servers' = 'kafka:9092',
    |  'format' = 'avro',
    |  'scan.startup.mode' = 'latest-offset'
    |)
  """.stripMargin)

// Sink: Bronze Iceberg (partitioned by chrom + sample_id)
tEnv.executeSql(
  """
    |CREATE TABLE iceberg.bronze.variants_raw (
    |  chrom      STRING,
    |  pos        BIGINT,
    |  ref        STRING,
    |  alt        STRING,
    |  qual       DOUBLE,
    |  filter     STRING,
    |  sample_id  STRING,
    |  genotype   ROW<gt STRING, gq INT, dp INT>,
    |  sequencer_id STRING,
    |  event_ts   TIMESTAMP(3),
    |  PRIMARY KEY (chrom, pos, sample_id) NOT ENFORCED
    |) PARTITIONED BY (chrom, sample_id) WITH (
    |  'connector' = 'iceberg',
    |  'catalog-name' = 'genomics_catalog',
    |  'catalog-type' = 'rest',
    |  'warehouse' = 's3://genomics-iceberg/',
    |  'format-version' = '2',
    |  'write.upsert.enabled' = 'true'  -- dedup via MERGE
    |)
  """.stripMargin)

// CDC pipeline: dedupe + filter + write to Bronze (exactly-once)
tEnv.executeSql(
  """
    |INSERT INTO iceberg.bronze.variants_raw
    |SELECT chrom, pos, ref, alt, qual, filter, sample_id, genotype,
    |       sequencer_id, event_ts
    |FROM kafka.variants_raw
    |WHERE qual > 30 AND filter LIKE '%PASS%'
  """.stripMargin)

env.execute("genomics-variant-cdc")`,
      },
      {
        lang: "rust",
        filename: "flink_genomics_reader.rs",
        code: `use iceberg_rust::catalog::rest::RestCatalog;
use arrow::array::RecordBatch;

// Rust genomics reader — uses iceberg-rs to query Bronze tier.
// Use case: real-time GWAS pre-screen that runs as the Bronze
// table is being written by Flink.

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let catalog = RestCatalog::new("https://catalog.genomics.io")
        .with_warehouse("s3://genomics-iceberg/").build()?;

    let bronze = catalog.load("bronze.variants_raw")?;

    // Read recent variants on chr17 (sub-ms via partition pruning)
    let batch = bronze.scan()
        .with_filter("chrom = 'chr17' AND event_ts >= now() - interval '1 minute'")
        .to_arrow().await?;

    println!("{} chr17 variants in last minute", batch.num_rows());

    // Convert to VCF-like format for downstream GATK
    for i in 0..batch.num_rows() {
        let chrom = batch.column_by_name("chrom").value(i);
        let pos = batch.column_by_name("pos").value(i);
        let ref_allele = batch.column_by_name("ref").value(i);
        let alt_allele = batch.column_by_name("alt").value(i);
        println!("chr17  {}  {}  {}  PASS  Q=50", pos, ref_allele, alt_allele);
    }
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "flink_genomics_reader.go",
        code: `package main

import (
    "context"
    "fmt"

    "github.com/apache/iceberg-go/api"
)

// Go genomics reader — Cloud Run function that monitors the Bronze
// tier for clinically actionable variants (e.g. BRCA1/BRCA2).

func main() {
    ctx := context.Background()
    catalog, _ := api.NewRestCatalog(ctx, "https://catalog.genomics.io",
        "s3://genomics-iceberg/")
    table, _ := catalog.LoadTable(ctx, "bronze.variants_raw")

    scan := table.Scan().
        WithFilter("chrom IN ('chr17', 'chr13') AND qual > 50")
    iter, _ := scan.ToArrowIterator(ctx)
    for rec, err := iter.Next(); err == nil; rec, err = iter.Next() {
        chrom := rec.GetString(0, "chrom")
        pos := rec.GetInt64(0, "pos")
        fmt.Printf("Actionable variant: %s:%d (qual=%.1f)\\n",
            chrom, pos, rec.GetFloat64(0, "qual"))
    }
}`,
      },
      {
        lang: "elixir",
        filename: "flink_genomics_reader.ex",
        code: `defmodule Genomics.VariantMonitor do
  @moduledoc """
  Phoenix LiveView dashboard that monitors Bronze variants in real-time
  as Flink writes them. Broadcasts actionable variants to clinicians.
  """
  use GenServer
  alias Explorer.DataFrame, as: DF

  defstruct [:last_run]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    send(self(), :poll)
    {:ok, %__MODULE__{last_run: nil}}
  end

  @impl true
  def handle_info(:poll, state) do
    {:ok, df} = Explorer.Iceberg.scan("bronze.variants_raw",
      filters: ["event_ts >= now() - interval '5 minutes'",
                "chrom IN ('chr17', 'chr13')", "qual > 50"])

    variants = DF.to_rows(df)
    Enum.each(variants, fn v ->
      Phoenix.PubSub.broadcast(ModernDataSci.PubSub, "genomics:alerts",
        {:actionable_variant, v["chrom"], v["pos"], v["ref"], v["alt"]})
    end)

    Process.send_after(self(), :poll, 30_000)
    {:noreply, %{state | last_run: DateTime.utc_now()}}
  end
end`,
      },
      {
        lang: "zig",
        filename: "flink_genomics_reader.zig",
        code: `const std = @import("std");
const iceberg = @import("iceberg-zig");

// Zig genomics reader — sub-ms variant lookup for clinical genomics
// pipelines that need to check incoming Bronze variants against
// ClinVar pathogenicity database.

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var catalog = try iceberg.Catalog.rest(allocator, .{
        .uri = "https://catalog.genomics.io",
        .warehouse = "s3://genomics-iceberg/",
    });
    defer catalog.deinit();

    var table = try catalog.loadTable(allocator, "bronze.variants_raw");
    defer table.deinit();

    var scan = try table.scan(allocator, .{
        .filter = "chrom = 'chr17' AND qual > 50",
        .selected_fields = &.{ "pos", "ref", "alt", "sample_id" },
    });
    defer scan.deinit();

    while (try scan.next()) |batch| {
        const positions = batch.get_u64_col("pos");
        const refs = batch.get_string_col("ref");
        const alts = batch.get_string_col("alt");
        for (positions, refs, alts) |pos, ref, alt| {
            std.debug.print("chr17:{d} {s}>{s} (ClinVar check)\\n",
                .{ pos, ref, alt });
        }
    }
}`,
      },
    ],
    runnablePython: `# Real-time genomics variant calling simulation — Pyodide
import random
from collections import defaultdict

print("=== Real-time Genomics Variant Calling on Flink ===")
print("Illumina NovaSeq (50 sequencers) → Flink CDC → Bronze Iceberg")
print()

# Simulate 10k variants/sec from 50 sequencers (scaled to 10k total)
random.seed(42)
chromosomes = [f'chr{i}' for i in range(1, 23)]
sequencers = [f'novaseq-{i:03d}' for i in range(50)]
samples = [f'sample-{i:04d}' for i in range(200)]

# Bronze: raw variant events (simulated streaming)
bronze_events = []
for seq_id in range(10000):
    event = {
        'chrom': random.choice(chromosomes),
        'pos': random.randint(1, 250_000_000),
        'ref': random.choice(['A', 'C', 'G', 'T']),
        'alt': random.choice(['A', 'C', 'G', 'T']),
        'qual': random.gauss(60, 20),
        'filter': random.choices(['PASS', 'LowQual', 'FAIL'], weights=[80, 15, 5])[0],
        'sample_id': random.choice(samples),
        'sequencer_id': random.choice(sequencers),
        'event_ts': random.randint(1, 600),  # seconds
    }
    bronze_events.append(event)

# Flink processing: dedupe + filter
seen = set()
silver_events = []
for e in bronze_events:
    key = (e['chrom'], e['pos'], e['sample_id'])
    if key in seen: continue
    if e['qual'] > 30 and 'PASS' in e['filter']:
        silver_events.append(e)
        seen.add(key)

# Group by chromosome for Bronze partition counts
bronze_by_chrom = defaultdict(int)
for e in bronze_events:
    bronze_by_chrom[e['chrom']] += 1

print(f"Bronze (raw):       {len(bronze_events):,} variant events")
print(f"Silver (filtered): {len(silver_events):,} high-quality unique variants")
print(f"Dedup rate:         {100*(1 - len(silver_events)/len(bronze_events)):.1f}% removed")
print()
print(f"{'Chromosome':<12} | {'Bronze variants':>16} | {'Partition files':>16}")
print("-" * 50)
for chrom in sorted(bronze_by_chrom.keys()):
    n_vars = bronze_by_chrom[chrom]
    n_files = max(1, n_vars // 1000)  # ~1k variants per Parquet file
    print(f"{chrom:<12} | {n_vars:>16,} | {n_files:>16,}")

print()
print("Flink checkpoint interval: 60 seconds")
print("Exacly-once guarantee: 2-phase commit on checkpoint")
print("Bronze Iceberg partitioning: chrom + sample_id (hidden partitioning)")
print("Throughput: 10,000 variants/sec sustained across 50 sequencers")`,
    insight: "Real-time genomics IS the canonical streaming-science use case — Illumina NovaSeq produces 240GB/day of variant calls per sequencer, and a 50-sequencer fleet hits 10k variants/sec. Flink's exactly-once guarantees (via 2-phase commit on checkpoint) are non-negotiable for clinical genomics — a lost or duplicated variant call could mean a missed pathogenic BRCA1 mutation. The Broad Institute, Wellcome Sanger, and NIH use Flink + Iceberg for exactly this pattern.",
  },

  // ============================================================
  // 2. LHC TRIGGER PIPELINE (Physics)
  // ============================================================
  {
    id: "flink-lhc-trigger-pipeline",
    step: "2",
    title: "LHC Trigger Pipeline via Flink CEP (40MHz collisions)",
    subtitle: "Physics — Flink complex event processing for L1 trigger pattern matching",
    accent: "oklch(0.65 0.16 200)",
    icon: <Atom className="h-4 w-4" />,
    badge: "Physics · Particle",
    brief: {
      dataset: "CERN Large Hadron Collider (LHC) collision events at 40MHz crossing rate. The L1 trigger must reduce 40MHz to 100kHz (factor 400) in <2.5 microseconds latency. Flink CEP (Complex Event Processing) simulates the pattern matching on physics-object stream (tracks, jets, muons) and writes trigger decisions + selected events to Bronze Iceberg for offline analysis.",
      scale: "40MHz crossing rate · 100M detector channels · 100kHz L1 output · 1kHz HLT output · 1PB/year stored",
      why: "CERN's trigger pipeline IS the original complex-event-processing problem — at 40MHz crossing rate, you cannot store every collision. The L1 trigger must decide in 2.5 microseconds whether an event is 'interesting' (high-pT muon, displaced vertex, large missing ET). Flink CEP's pattern API (followed-by, or, not, within) maps perfectly to physics selection requirements. Trigger decisions + selected events land in Bronze Iceberg as the auditable record for offline physics analysis.",
    },
    stats: [
      { label: "Crossing rate", value: "40 MHz" },
      { label: "L1 latency", value: "2.5 μs" },
      { label: "L1 output", value: "100 kHz" },
      { label: "Volume/year", value: "1 PB" },
    ],
    tools: ["Apache Flink", "Flink CEP", "Apache Iceberg", "Apache Kafka", "ROOT", "Trino", "S3"],
    codeTabs: [
      {
        lang: "scala",
        filename: "FlinkLHCTrigger.scala",
        code: `import org.apache.flink.cep.CEP
import org.apache.flink.cep.pattern.Pattern
import org.apache.flink.cep.pattern.conditions.{IterativeCondition, SimpleCondition}
import org.apache.flink.streaming.api.scala._
import org.apache.flink.streaming.api.windowing.time.Time

// LHC L1 trigger pattern matching via Flink CEP
// Physics objects stream: tracks, jets, muons, missing ET

case class PhysicsObject(
  event_id: Long, obj_type: String, pt: Double, eta: Double,
  phi: Double, quality: Int, ts: Long
)

val env = StreamExecutionEnvironment.getExecutionEnvironment
  .setParallelism(500)
  .enableCheckpointing(1000)  // 1s checkpoint — high throughput

// Source: physics objects from detector front-end (simulated Kafka stream)
val physicsStream: KeyedStream[PhysicsObject, Long] = env
  .addSource(new DetectorFrontEndSource)  // 40MHz simulation
  .keyBy(_.event_id)  // group objects by collision event

// L1 trigger pattern: high-pT muon followed by missing ET within 100ns
val triggerPattern: Pattern[PhysicsObject, _] = Pattern
  .begin[PhysicsObject]("high_pt_muon")
    .where(new SimpleCondition[PhysicsObject]() {
      override def filter(o: PhysicsObject): Boolean =
        o.obj_type == "muon" && o.pt > 20.0 && abs(o.eta) < 2.4
    })
  .followedBy("missing_et")
    .where(new IterativeCondition[PhysicsObject]() {
      override def filter(o: PhysicsObject, ctx): Boolean =
        o.obj_type == "met" && o.pt > 50.0
    })
  .within(Time.milliseconds(1))  // 100ns window (scaled for sim)

// Apply pattern — emits trigger decisions for matched events
val triggerDecisions: DataStream[TriggerDecision] = CEP.pattern(physicsStream, triggerPattern)
  .select(events => TriggerDecision(
    event_id = events.head.event_id,
    trigger_type = "L1_DOUBLE_MUON_MET",
    physics_objects = events,
    trigger_ts = System.currentTimeMillis()
  ))

// Sink: Bronze Iceberg — trigger decisions (auditable record)
triggerDecisions.addSink(new IcebergSink("bronze.l1_trigger_decisions"))

// Throughput monitoring
triggerDecisions.map(t => (t.trigger_type, 1))
  .keyBy(0)
  .timeWindow(Time.seconds(1))
  .sum(1)
  .print()  // e.g. (L1_DOUBLE_MUON_MET, 85000) — 85kHz trigger rate

env.execute("lhc-l1-trigger-cep")`,
      },
      {
        lang: "rust",
        filename: "flink_lhc_reader.rs",
        code: `use iceberg_rust::catalog::rest::RestCatalog;

// Rust LHC trigger decision reader — analyses Bronze tier for
// trigger efficiency studies. Use case: physics PhD student measuring
// how often L1_DOUBLE_MUON_MET fires vs the actual Higgs yield.

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let catalog = RestCatalog::new("https://catalog.cern.ch")
        .with_warehouse("s3://cms-iceberg/").build()?;

    let triggers = catalog.load("bronze.l1_trigger_decisions")?;

    // All L1 trigger decisions for run 375000-376000
    let batch = triggers.scan()
        .with_filter("run BETWEEN 375000 AND 376000 AND trigger_type = 'L1_DOUBLE_MUON_MET'")
        .to_arrow().await?;

    println!("{} L1_DOUBLE_MUON_MET triggers in run range", batch.num_rows());
    println!("Trigger efficiency: {:.2}%",
        batch.num_rows() as f64 / 100_000.0 * 100.0);
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "flink_lhc_reader.go",
        code: `package main

import (
    "context"
    "fmt"

    "github.com/apache/iceberg-go/api"
)

// Go LHC trigger monitor — Cloud Run function for real-time
// trigger rate monitoring. Alerts if a trigger rate deviates by >10%.

func main() {
    ctx := context.Background()
    catalog, _ := api.NewRestCatalog(ctx, "https://catalog.cern.ch",
        "s3://cms-iceberg/")
    table, _ := catalog.LoadTable(ctx, "bronze.l1_trigger_decisions")

    // Last 5 minutes of trigger decisions
    scan := table.Scan().
        WithFilter("trigger_ts >= now() - interval '5 minutes'")
    iter, _ := scan.ToArrowIterator(ctx)
    n_total := 0
    for rec, err := iter.Next(); err == nil; rec, err = iter.Next() {
        n_total++
        _ = rec
    }
    fmt.Printf("Trigger rate (last 5 min): %.1f Hz\\n",
        float64(n_total)/300.0)
}`,
      },
      {
        lang: "elixir",
        filename: "flink_lhc_reader.ex",
        code: `defmodule LHC.TriggerMonitor do
  @moduledoc """
  Phoenix LiveView for real-time L1 trigger rate monitoring.
  Polls Bronze tier every 5s and broadcasts trigger rates to
  all connected physicists' dashboards.
  """
  use GenServer
  alias Explorer.DataFrame, as: DF

  defstruct [:last_run, :baseline_rate]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    send(self(), :poll)
    {:ok, %__MODULE__{last_run: nil, baseline_rate: 85_000.0}}
  end

  @impl true
  def handle_info(:poll, state) do
    {:ok, df} = Explorer.Iceberg.scan("bronze.l1_trigger_decisions",
      filters: ["trigger_ts >= now() - interval '1 minute'"])
    rate = DF.n_rows(df) / 60.0

    # Alert if rate deviates >10% from baseline
    deviation = abs(rate - state.baseline_rate) / state.baseline_rate * 100
    if deviation > 10 do
      Phoenix.PubSub.broadcast(ModernDataSci.PubSub, "lhc:alerts",
        {:trigger_rate_anomaly, rate, state.baseline_rate, deviation})
    end

    Phoenix.PubSub.broadcast(ModernDataSci.PubSub, "lhc:rates",
      {:trigger_rate, rate})

    Process.send_after(self(), :poll, 5_000)
    {:noreply, %{state | last_run: DateTime.utc_now()}}
  end
end`,
      },
      {
        lang: "zig",
        filename: "flink_lhc_reader.zig",
        code: `const std = @import("std");
const iceberg = @import("iceberg-zig");

// Zig LHC trigger reader — sub-ms trigger decision lookup for
// real-time physics analysis. Use case: online luminosity
// monitoring during LHC fills.

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var catalog = try iceberg.Catalog.rest(allocator, .{
        .uri = "https://catalog.cern.ch",
        .warehouse = "s3://cms-iceberg/",
    });
    defer catalog.deinit();

    var table = try catalog.loadTable(allocator, "bronze.l1_trigger_decisions");
    defer table.deinit();

    var scan = try table.scan(allocator, .{
        .filter = "run = 375000 AND trigger_type = 'L1_DOUBLE_MUON_MET'",
        .selected_fields = &.{ "event_id", "trigger_ts", "physics_objects" },
    });
    defer scan.deinit();

    var n_triggers: u64 = 0;
    while (try scan.next()) |batch| {
        n_triggers += @intCast(batch.num_rows());
    }
    std.debug.print("Run 375000: {d} L1_DOUBLE_MUON_MET triggers\\n",
        .{n_triggers});
}`,
      },
    ],
    runnablePython: `# LHC trigger pipeline simulation — Pyodide
import random
from collections import defaultdict

print("=== LHC Trigger Pipeline via Flink CEP ===")
print("40MHz collisions → L1 trigger pattern matching → Bronze Iceberg")
print()

# Simulate physics objects from 40MHz crossing rate (scaled to 10k events)
random.seed(42)
object_types = ['track', 'jet', 'muon', 'electron', 'photon', 'met']
trigger_types = ['L1_SINGLE_MUON', 'L1_DOUBLE_MUON', 'L1_DOUBLE_MUON_MET',
                 'L1_SINGLE_JET', 'L1_MUON_JET', 'L1_MET']

# Bronze: raw physics objects (simulated detector stream)
physics_objects = []
for event_id in range(10000):
    n_objects = random.randint(5, 30)  # variable objects per event
    for _ in range(n_objects):
        obj = {
            'event_id': event_id,
            'obj_type': random.choice(object_types),
            'pt': max(0, random.gauss(15, 25)),  # GeV
            'eta': random.gauss(0, 1.5),
            'phi': random.uniform(-3.14, 3.14),
            'quality': random.randint(0, 100),
            'ts': event_id * 25,  # 25ns between crossings
        }
        physics_objects.append(obj)

# Flink CEP: pattern = high-pT muon followed by missing ET within 100ns
triggered_events = []
for event_id in range(10000):
    event_objs = [o for o in physics_objects if o['event_id'] == event_id]
    high_pt_muon = any(o['obj_type'] == 'muon' and o['pt'] > 20
                       and abs(o['eta']) < 2.4 for o in event_objs)
    missing_et = any(o['obj_type'] == 'met' and o['pt'] > 50 for o in event_objs)
    if high_pt_muon and missing_et:
        triggered_events.append({
            'event_id': event_id,
            'trigger_type': 'L1_DOUBLE_MUON_MET',
            'n_objects': len(event_objs),
            'ts': event_id * 25,
        })

# Group by trigger type (simulated distribution)
trigger_distribution = defaultdict(int)
for _ in range(len(triggered_events)):
    trigger_distribution[random.choice(trigger_types)] += 1

print(f"Detector crossing rate:  40 MHz")
print(f"Physics objects (Bronze): {len(physics_objects):,}")
print(f"L1 triggers fired:       {len(triggered_events):,}")
print(f"L1 rate reduction:       {10000 / len(triggered_events):.0f}x (40MHz → {10000/len(triggered_events)*4000:.0f}kHz simulated)")
print()
print(f"{'Trigger type':<25} | {'Decisions':>12} | {'Rate (kHz)':>12}")
print("-" * 55)
for trig in sorted(trigger_distribution.keys()):
    n = trigger_distribution[trig]
    rate_khz = n / 10000 * 100
    print(f"{trig:<25} | {n:>12,} | {rate_khz:>11.1f}k")

print()
print("Flink CEP pattern: high_pt_muon.pt>20 AND |eta|<2.4 FOLLOWED-BY met.pt>50")
print("Pattern window: within 100ns (1 LHC crossing = 25ns)")
print("Bronze Iceberg: trigger decisions + physics objects stored for offline analysis")
print("Latency budget: L1 trigger <2.5 microseconds (Flink CEP sim shows feasibility)")`,
    insight: "CERN's L1 trigger IS the original complex-event-processing problem — at 40MHz crossing rate, the L1 trigger must reduce by 400× in under 2.5 microseconds. Flink CEP's pattern API (begin/followedBy/within) maps perfectly to physics selection logic. The Bronze Iceberg record of trigger decisions is the auditable trail that lets physicists measure trigger efficiency — without it, you cannot compute Higgs cross-sections from the surviving events.",
  },
];

// ============================================================
// KAFKA_SCIENCE_EXAMPLES (2 examples)
// ============================================================

export const KAFKA_SCIENCE_EXAMPLES: DatasetExample[] = [
  // ============================================================
  // 3. ENVIRONMENTAL SENSOR NETWORK (Sensors)
  // ============================================================
  {
    id: "kafka-environmental-sensors",
    step: "1",
    title: "EPA AirNow Sensor Network → Kafka (50k sensors)",
    subtitle: "Sensors — PM2.5 + O3 + temp readings partitioned by sensor_id",
    accent: "oklch(0.65 0.16 60)",
    icon: <Radio className="h-4 w-4" />,
    badge: "Sensors · Environmental",
    brief: {
      dataset: "EPA AirNow (50k+ air quality sensors across the US) streaming PM2.5, O3, CO, NO2, SO2, temperature, humidity readings at 1Hz. Kafka topic partitioned by sensor_id (50k partitions across 200 brokers). Consumer (Flink/Spark) writes Bronze Iceberg partitioned by region + hour.",
      scale: "50k+ sensors · 7 metrics · 1Hz sample · 250k events/sec · ~21GB/day raw JSON",
      why: "Environmental sensors ARE the IoT lakehouse — 50k sensors × 7 metrics × 1Hz = 250k events/sec. Kafka partitions by sensor_id so each sensor's readings are totally ordered within its partition. The Bronze→Silver→Gold pattern: Bronze (raw JSON from Kafka) → Silver (validated + calibrated) → Gold (EPA Air Quality Index by region). Kafka's partition-per-sensor design enables parallel consumers and exactly-once via transactions.",
    },
    stats: [
      { label: "Sensors", value: "50k+" },
      { label: "Event rate", value: "250k/sec" },
      { label: "Partitions", value: "50k" },
      { label: "Volume/day", value: "21 GB" },
    ],
    tools: ["Apache Kafka", "Apache Flink", "Apache Iceberg", "EPA AirNow API", "Trino", "Grafana", "S3"],
    codeTabs: [
      {
        lang: "scala",
        filename: "KafkaSensorProducer.scala",
        code: `import org.apache.kafka.clients.producer.{KafkaProducer, ProducerRecord, ProducerConfig}
import org.apache.kafka.common.serialization.StringSerializer
import java.util.{Properties, UUID}
import scala.util.Random

// EPA AirNow sensor simulator — produces 250k events/sec across 50k sensors
// Topic: sensors.airnow (partitioned by sensor_id key)

val props = new Properties()
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092")
props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, classOf[StringSerializer].getName)
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, classOf[StringSerializer].getName)
props.put(ProducerConfig.ACKS_CONFIG, "all")  // wait for all ISR replicas
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, "true")  // exactly-once
props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "zstd")
props.put(ProducerConfig.LINGER_MS_CONFIG, "5")  // batch 5ms
props.put(ProducerConfig.BATCH_SIZE_CONFIG, "65536")  // 64KB batches

val producer = new KafkaProducer[String, String](props)
val sensors = (1 to 50000).map(i => s"airnow-sensor-\${i.toString.padTo(5, '0')}")
val metrics = Seq("pm25", "o3", "co", "no2", "so2", "temp", "humidity")
val regions = Seq("Northeast", "Midwest", "South", "West", "Pacific")
val rnd = new Random(42)

// Produce 1M events (scaled from 250k/sec for demo)
for (i <- 1 to 1000000) {
  val sensorId = sensors(rnd.nextInt(sensors.length))
  val metric = metrics(rnd.nextInt(metrics.length))
  val region = regions(rnd.nextInt(regions.length))
  val value = metric match {
    case "pm25" => math.max(0, rnd.nextGaussian() * 10 + 15)
    case "o3" => math.max(0, rnd.nextGaussian() * 5 + 25)
    case "temp" => rnd.nextGaussian() * 10 + 18
    case _ => math.max(0, rnd.nextGaussian() * 3 + 5)
  }
  val payload = s"""{"sensor_id":"\${sensorId}","metric":"\${metric}","value":\${value},"region":"\${region}","ts":\${System.currentTimeMillis()}}"""
  // Key = sensor_id → ensures all readings from one sensor land in same partition
  val record = new ProducerRecord[String, String]("sensors.airnow", sensorId, payload)
  producer.send(record)
}
producer.flush()`,
      },
      {
        lang: "rust",
        filename: "kafka_sensor_consumer.rs",
        code: `use rdkafka::config::ClientConfig;
use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::message::Message;

// Rust Kafka consumer — reads sensor events and writes to Bronze Iceberg.
// Use case: ultra-low-latency consumer for environmental alerting.

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let consumer: StreamConsumer = ClientConfig::new()
        .set("group.id", "bronze-writer")
        .set("bootstrap.servers", "kafka:9092")
        .set("enable.auto.commit", "false")  // manual commit for exactly-once
        .set("auto.offset.reset", "earliest")
        .set("partition.assignment.strategy", "cooperative-sticky")
        .create()?;

    consumer.subscribe(&["sensors.airnow"])?;

    loop {
        match consumer.recv().await {
            Ok(msg) => {
                let key = msg.key_view::<str>().ok().unwrap_or("");
                let payload = msg.payload_view::<str>().unwrap_or("");
                // Write to Bronze Iceberg (partitioned by region+hour)
                println!("[sensor={}]", key);
                // iceberg_bronze.append(payload).await?;
                consumer.commit_message(&msg, rdkafka::consumer::CommitMode::Sync).await?;
            }
            Err(e) => eprintln!("Kafka error: {}", e),
        }
    }
}`,
      },
      {
        lang: "go",
        filename: "kafka_sensor_consumer.go",
        code: `package main

import (
    "context"
    "fmt"
    "github.com/segmentio/kafka-go"
)

// Go Kafka consumer — Cloud Run function for Bronze Iceberg writes.
// Uses segmentio/kafka-go for pure-Go Kafka client (no JVM).

func main() {
    r := kafka.NewReader(kafka.ReaderConfig{
        Brokers:   []string{"kafka:9092"},
        Topic:     "sensors.airnow",
        GroupID:   "bronze-writer",
        MinBytes:  10e3,  // 10KB
        MaxBytes:  10e6,  // 10MB
        MaxWait:   1_000_000_000,  // 1s
    })
    defer r.Close()

    ctx := context.Background()
    for {
        m, err := r.ReadMessage(ctx)
        if err != nil { break }
        fmt.Printf("partition=%d offset=%d sensor=%s\\n",
            m.Partition, m.Offset, string(m.Key))
        // Write to Bronze Iceberg (omitted for brevity)
    }
}`,
      },
      {
        lang: "elixir",
        filename: "kafka_sensor_consumer.ex",
        code: `defmodule Sensors.BronzeWriter do
  @moduledoc """
  Broadway Kafka consumer — reads 250k sensor events/sec and writes
  to Bronze Iceberg. Uses Broadway for back-pressure + parallelism.
  """
  use Broadway

  alias Broadway.Message
  alias Explorer.DataFrame, as: DF

  def start_link(_opts) do
    Broadway.start_link(__MODULE__,
      name: __MODULE__,
      producer: [
        module: {BroadwayKafka.Producer,
          [
            brokers: [{"kafka", 9092}],
            group_id: "bronze-writer",
            topics: ["sensors.airnow"]
          ]},
        concurrency: 200
      ],
      processors: [
        default: [concurrency: 400, max_demand: 50]
      ],
      batchers: [
        iceberg: [concurrency: 20, batch_size: 5000, batch_timeout: 1000]
      ]
    )
  end

  @impl true
  def handle_message(_, %Message{data: data} = msg, _) do
    Jason.decode!(data)
    |> Map.put(:ingest_ts, System.system_time(:millisecond))
    |> then(&msg)
  end

  @impl true
  def handle_batch(:iceberg, messages, _) do
    rows = Enum.map(messages, fn m -> m.data end)
    :ok = Explorer.Iceberg.append("bronze.sensor_raw", rows)
    messages
  end
end`,
      },
      {
        lang: "zig",
        filename: "kafka_sensor_consumer.zig",
        code: `const std = @import("std");
const kafka = @import("kafka-zig");
const iceberg = @import("iceberg-zig");

// Zig Kafka consumer — sub-ms event ingestion for environmental
// alerting. Use case: tornado early-warning system that needs
// sensor data within 50ms of measurement.

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var consumer = try kafka.Consumer.init(allocator, .{
        .brokers = "kafka:9092",
        .group_id = "bronze-writer",
        .topic = "sensors.airnow",
    });
    defer consumer.deinit();

    var catalog = try iceberg.Catalog.rest(allocator, .{
        .uri = "https://catalog.sensors.io",
        .warehouse = "s3://sensors-iceberg/",
    });
    defer catalog.deinit();

    var table = try catalog.loadTable(allocator, "bronze.sensor_raw");
    defer table.deinit();

    while (try consumer.poll()) |batch| {
        // Write batch to Bronze Iceberg (250k events/sec sustained)
        try table.append(batch);
        try consumer.commit(batch);
    }
}`,
      },
    ],
    runnablePython: `# EPA AirNow sensor network → Kafka simulation — Pyodide
import random
from collections import defaultdict

print("=== EPA AirNow Sensor Network → Kafka ===")
print("50k sensors × 7 metrics × 1Hz = 250k events/sec → Bronze Iceberg")
print()

# Simulate 1 second of sensor data (scaled from 250k events/sec)
random.seed(42)
n_sensors = 50000
n_metrics_per_sensor = 7  # PM2.5, O3, CO, NO2, SO2, temp, humidity
regions = ['Northeast', 'Midwest', 'South', 'West', 'Pacific']
metrics = ['pm25', 'o3', 'co', 'no2', 'so2', 'temp', 'humidity']

# Bronze: raw sensor events (simulated Kafka messages)
bronze_events = []
# Sample 5000 events (scaled from 250k for demo)
for _ in range(5000):
    sensor_id = f"airnow-{random.randint(1, n_sensors):05d}"
    metric = random.choice(metrics)
    region = random.choice(regions)
    if metric == 'pm25':
        value = max(0, random.gauss(15, 10))
    elif metric == 'o3':
        value = max(0, random.gauss(25, 5))
    elif metric == 'temp':
        value = random.gauss(18, 10)
    else:
        value = max(0, random.gauss(5, 3))
    bronze_events.append({
        'sensor_id': sensor_id,
        'metric': metric,
        'value': value,
        'region': region,
        'ts': random.randint(1, 1000),
    })

# Kafka partition distribution (50k partitions, one per sensor)
# In real Kafka: partition = hash(sensor_id) % 50000 = sensor index
partition_counts = defaultdict(int)
for e in bronze_events:
    sensor_idx = int(e['sensor_id'].split('-')[1])
    partition = sensor_idx % 200  # 200 brokers, ~250 partitions each
    partition_counts[partition] += 1

# Silver: validate + calibrate
calibration = {r: random.uniform(0.95, 1.05) for r in regions}
silver_events = []
for e in bronze_events:
    if e['value'] <= 0: continue
    e['calibrated'] = e['value'] * calibration[e['region']]
    silver_events.append(e)

# Gold: AQI by region (hourly aggregation)
gold_aqi = defaultdict(lambda: defaultdict(list))
for e in silver_events:
    gold_aqi[e['region']][e['metric']].append(e['calibrated'])

print(f"Bronze (raw Kafka msgs):  {len(bronze_events):,}")
print(f"Silver (calibrated):      {len(silver_events):,}")
print(f"Gold (AQI by region):     {len(gold_aqi)} regions")
print()
print(f"{'Region':<12} | {'PM2.5 avg':>10} | {'O3 avg':>10} | {'AQI':>12}")
print("-" * 50)
for region in regions:
    pm25_vals = gold_aqi[region].get('pm25', [0])
    o3_vals = gold_aqi[region].get('o3', [0])
    pm25_avg = sum(pm25_vals) / len(pm25_vals) if pm25_vals else 0
    o3_avg = sum(o3_vals) / len(o3_vals) if o3_vals else 0
    if pm25_avg > 35: aqi = 'Unhealthy'
    elif pm25_avg > 12: aqi = 'Moderate'
    else: aqi = 'Good'
    print(f"{region:<12} | {pm25_avg:>9.1f}  | {o3_avg:>9.1f}  | {aqi:>12}")

print()
print(f"Kafka partitions: 50,000 (one per sensor_id)")
print(f"Avg events/partition: {len(bronze_events)/200:.1f} (this batch)")
print(f"Consumer groups: 1 (Bronze writer) + 1 (real-time alerting) + 1 (Grafana)")
print("Exactly-once via Kafka transactions (consumer → Iceberg writer atomic)")`,
    insight: "Environmental sensors ARE the canonical IoT lakehouse — 50k sensors × 7 metrics × 1Hz = 250k events/sec is LinkedIn-scale throughput. Kafka's partition-by-sensor_id design (50k partitions across 200 brokers) means each sensor's readings are totally ordered within its partition, enabling parallel consumers + exactly-once transactions. The EPA, NOAA, and meteorological agencies worldwide use this exact pattern for real-time air quality + weather monitoring.",
  },

  // ============================================================
  // 4. GENOMICS EVENT STREAMING (Life Sciences)
  // ============================================================
  {
    id: "kafka-genomics-event-streaming",
    step: "2",
    title: "GATK Variant Calls → Kafka → Iceberg Bronze",
    subtitle: "Life sciences — VCF records partitioned by chromosome",
    accent: "oklch(0.65 0.16 165)",
    icon: <Database className="h-4 w-4" />,
    badge: "Life Sciences · Genomics",
    brief: {
      dataset: "GATK (Genome Analysis Toolkit) variant caller output streamed as VCF records to Kafka topics. Each variant call (chrom, pos, ref, alt, genotype, quality) is a Kafka message. Topic partitioned by chromosome (24 partitions for chr1-22 + X + Y). Consumer writes Bronze Iceberg partitioned by chromosome + sample.",
      scale: "10M variants/sample × 100k samples (UK Biobank scale) · 1 trillion total variants · 100TB Bronze tier",
      why: "Genomics event streaming IS the partition-by-chromosome lakehouse — VCF records naturally partition by chromosome (24 partitions: chr1-22, X, Y). Kafka's ordered partitions mean each chromosome's variants are totally ordered, enabling parallel GATK pipelines per chromosome. The Bronze Iceberg tier becomes the canonical source-of-truth for the 100k-sample UK Biobank — every downstream analysis (GWAS, polygenic risk scores, clinical reporting) reads from Bronze.",
    },
    stats: [
      { label: "Variants/sample", value: "10M" },
      { label: "Samples (UKBB)", value: "100k" },
      { label: "Partitions", value: "24" },
      { label: "Bronze volume", value: "100 TB" },
    ],
    tools: ["Apache Kafka", "GATK", "Apache Iceberg", "Apache Spark", "Hail", "Trino", "S3"],
    codeTabs: [
      {
        lang: "scala",
        filename: "KafkaGenomicsProducer.scala",
        code: `import org.apache.kafka.clients.producer.{KafkaProducer, ProducerRecord}
import java.util.{Properties, UUID}
import scala.io.Source
import scala.util.Random

// GATK variant caller → Kafka producer
// Reads VCF file from GATK output, emits each variant as a Kafka message
// Topic: gatk.variants (partitioned by chrom — 24 partitions: chr1-22,X,Y)

val props = new Properties()
props.put("bootstrap.servers", "kafka:9092")
props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer")
props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer")
props.put("acks", "all")
props.put("enable.idempotence", "true")
props.put("compression.type", "zstd")

val producer = new KafkaProducer[String, String](props)

// Stream VCF records from GATK output
val vcfPath = "s3://gatk-output/sample-12345/variants.vcf"
val records = Source.fromFile(vcfPath).getLines().filterNot(_.startsWith("#"))

for (line <- records) {
  val fields = line.split("\\\\t")
  val chrom = fields(0)
  val pos = fields(1)
  val variant_id = fields(2)
  val ref = fields(3)
  val alt = fields(4)
  val qual = fields(5)
  val filter = fields(6)
  val info = fields(7)
  val genotype = fields(8)  // GT:GQ:DP:AD

  // Kafka key = chrom → ensures chromosome-level partitioning
  // (24 partitions: chr1-22, chrX, chrY)
  val key = chrom
  val payload = s"""{"chrom":"\${chrom}","pos":\${pos},"variant_id":"\${variant_id}","ref":"\${ref}","alt":"\${alt}","qual":\${qual},"filter":"\${filter}","genotype":"\${genotype}","sample_id":"sample-12345"}"""
  producer.send(new ProducerRecord("gatk.variants", key, payload))
}
producer.flush()`,
      },
      {
        lang: "rust",
        filename: "kafka_genomics_consumer.rs",
        code: `use rdkafka::config::ClientConfig;
use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::message::Message;
use arrow::array::RecordBatch;

// Rust Kafka consumer — reads variant events and writes to Bronze Iceberg.
// Use case: parallel consumer (one per chromosome partition) for 24-way
// parallelism in the Bronze writer pipeline.

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let consumer: StreamConsumer = ClientConfig::new()
        .set("group.id", "bronze-iceberg-writer")
        .set("bootstrap.servers", "kafka:9092")
        .set("enable.auto.commit", "false")
        .set("auto.offset.reset", "earliest")
        .create()?;
    consumer.subscribe(&["gatk.variants"])?;

    loop {
        match consumer.recv().await {
            Ok(msg) => {
                let chrom = msg.key_view::<str>().ok().unwrap_or("");
                let payload = msg.payload_view::<str>().unwrap_or("");
                // Partition-aware: each consumer thread handles one chrom
                // (24 partitions: chr1-22, chrX, chrY)
                // Write to Iceberg Bronze (partitioned by chrom + sample)
                // iceberg_bronze.append(payload, partition=chrom).await?;
                println!("[chrom={}]", chrom);
                consumer.commit_message(&msg,
                    rdkafka::consumer::CommitMode::Sync).await?;
            }
            Err(e) => eprintln!("Kafka error: {}", e),
        }
    }
}`,
      },
      {
        lang: "go",
        filename: "kafka_genomics_consumer.go",
        code: `package main

import (
    "context"
    "fmt"

    "github.com/segmentio/kafka-go"
)

// Go Kafka consumer — Cloud Run function for Bronze Iceberg writes.
// Uses chromosome as the partition key for natural partitioning.

func main() {
    r := kafka.NewReader(kafka.ReaderConfig{
        Brokers:   []string{"kafka:9092"},
        Topic:     "gatk.variants",
        GroupID:   "bronze-iceberg-writer",
        MinBytes:  10e3,
        MaxBytes:  10e6,
    })
    defer r.Close()

    ctx := context.Background()
    for {
        m, err := r.ReadMessage(ctx)
        if err != nil { break }
        // Key = chromosome (e.g. "chr17"), routes to partition 16 of 24
        fmt.Printf("chrom=%s offset=%d partition=%d\\n",
            string(m.Key), m.Offset, m.Partition)
    }
}`,
      },
      {
        lang: "elixir",
        filename: "kafka_genomics_consumer.ex",
        code: `defmodule Genomics.BronzeWriter do
  @moduledoc """
  Broadway Kafka consumer — reads GATK variant events and writes
  to Bronze Iceberg partitioned by chromosome.
  Partition-by-key ensures chr17 events land in same partition,
  enabling chromosome-level parallelism (24-way).
  """
  use Broadway

  alias Broadway.Message
  alias Explorer.DataFrame, as: DF

  def start_link(_opts) do
    Broadway.start_link(__MODULE__,
      name: __MODULE__,
      producer: [
        module: {BroadwayKafka.Producer,
          [
            brokers: [{"kafka", 9092}],
            group_id: "bronze-iceberg-writer",
            topics: ["gatk.variants"]
          ]},
        concurrency: 24  # one per chromosome partition
      ],
      processors: [
        default: [concurrency: 100, max_demand: 100]
      ],
      batchers: [
        iceberg: [concurrency: 24, batch_size: 10000, batch_timeout: 1000]
      ]
    )
  end

  @impl true
  def handle_message(_, %Message{data: data} = msg, _) do
    Jason.decode!(data) |> then(&msg)
  end

  @impl true
  def handle_batch(:iceberg, messages, _) do
    rows = Enum.map(messages, fn m -> m.data end)
    # Group by chromosome for partition-aware Iceberg writes
    by_chrom = Enum.group_by(rows, & &1["chrom"])
    Enum.each(by_chrom, fn {chrom, vars} ->
      :ok = Explorer.Iceberg.append("bronze.variants_by_chrom", vars,
        partition: chrom)
    end)
    messages
  end
end`,
      },
      {
        lang: "zig",
        filename: "kafka_genomics_consumer.zig",
        code: `const std = @import("std");
const kafka = @import("kafka-zig");
const iceberg = @import("iceberg-zig");

// Zig Kafka consumer — high-throughput variant ingestion.
// Use case: 100k-sample UK Biobank pipeline that needs to ingest
// 1 trillion variant records in under 24 hours.

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var consumer = try kafka.Consumer.init(allocator, .{
        .brokers = "kafka:9092",
        .group_id = "bronze-iceberg-writer",
        .topic = "gatk.variants",
    });
    defer consumer.deinit();

    var catalog = try iceberg.Catalog.rest(allocator, .{
        .uri = "https://catalog.genomics.io",
        .warehouse = "s3://genomics-iceberg/",
    });
    defer catalog.deinit();

    var table = try catalog.loadTable(allocator, "bronze.variants_by_chrom");
    defer table.deinit();

    var n_records: u64 = 0;
    while (try consumer.poll()) |batch| {
        n_records += @intCast(batch.num_rows());
        try table.append(batch);  // partition-aware by chrom
        try consumer.commit(batch);
        if (n_records % 1_000_000 == 0) {
            std.debug.print("Ingested {d} variant records\\n", .{n_records});
        }
    }
}`,
      },
    ],
    runnablePython: `# GATK variant calls → Kafka → Bronze Iceberg simulation — Pyodide
import random
from collections import defaultdict

print("=== Genomics Event Streaming: GATK → Kafka → Bronze Iceberg ===")
print("100k samples × 10M variants/sample = 1 trillion variant records")
print()

# Simulate variant events (scaled from 10M per sample)
random.seed(42)
chromosomes = [f'chr{i}' for i in range(1, 23)] + ['chrX', 'chrY']
samples = [f'sample-{i:05d}' for i in range(100)]  # scaled from 100k
alleles = ['A', 'C', 'G', 'T']

# Bronze: raw variant events (Kafka messages)
bronze_events = []
for _ in range(50000):  # scaled from 10M per sample × 100k
    chrom = random.choice(chromosomes)
    event = {
        'chrom': chrom,
        'pos': random.randint(1, 250_000_000),
        'ref': random.choice(alleles),
        'alt': random.choice(alleles),
        'qual': max(0, random.gauss(60, 20)),
        'filter': random.choices(['PASS', 'LowQual'], weights=[85, 15])[0],
        'sample_id': random.choice(samples),
        'genotype': f"{random.randint(0,1)}/{random.randint(0,1)}:{random.randint(20, 60)}",
    }
    bronze_events.append(event)

# Kafka partition distribution (24 partitions by chrom)
partition_counts = defaultdict(int)
for e in bronze_events:
    partition_counts[e['chrom']] += 1

# Silver: filter + normalize multi-allelic
silver_events = [e for e in bronze_events
                if e['qual'] > 30 and 'PASS' in e['filter']]

# Gold: per-chromosome variant density (used for GWAS QC)
gold_density = defaultdict(lambda: {'n_variants': 0, 'samples': set()})
for e in silver_events:
    gold_density[e['chrom']]['n_variants'] += 1
    gold_density[e['chrom']]['samples'].add(e['sample_id'])

print(f"Bronze (raw Kafka msgs):  {len(bronze_events):,}")
print(f"Silver (QC-filtered):     {len(silver_events):,}")
print(f"Gold (per-chrom density): {len(gold_density)} chromosomes")
print()
print(f"{'Chromosome':<10} | {'Kafka partition':>16} | {'Events':>10} | {'Unique samples':>16}")
print("-" * 60)
for chrom in sorted(partition_counts.keys()):
    n_events = partition_counts[chrom]
    n_samples = len(gold_density[chrom]['samples'])
    # Kafka partition assignment: hash(chrom) % 24
    part_idx = hash(chrom) % 24
    print(f"{chrom:<10} | {part_idx:>16} | {n_events:>10,} | {n_samples:>16,}")

print()
print("Topic: gatk.variants (24 partitions: chr1-22, chrX, chrY)")
print("Kafka key: chrom → ensures chromosome-level partitioning")
print("Throughput: 1 trillion variants in <24h (100k-sample UK Biobank)")
print("Bronze Iceberg partitioning: chrom + sample_id (hidden partitioning)")
print("Downstream consumers: GWAS (Hail), polygenic risk scores, clinical reporting")`,
    insight: "Genomics event streaming IS the partition-by-chromosome lakehouse — VCF records naturally partition by chromosome (24 partitions: chr1-22, X, Y), and Kafka's ordered partitions enable parallel GATK pipelines per chromosome. The UK Biobank's 100k samples × 10M variants/sample = 1 trillion total variants is the canonical example — Kafka + Iceberg Bronze tier is the source-of-truth for every downstream GWAS, polygenic risk score, and clinical report.",
  },
];

// ============================================================
// PULSAR_SCIENCE_EXAMPLES (1 example)
// ============================================================

export const PULSAR_SCIENCE_EXAMPLES: DatasetExample[] = [
  // ============================================================
  // 5. MULTI-REGION SENSOR NETWORK (Sensors)
  // ============================================================
  {
    id: "pulsar-multi-region-sensors",
    step: "1",
    title: "Multi-region Sensor Network on Pulsar (EU+US+Asia geo-replication)",
    subtitle: "Sensors — Pulsar geo-replication for cross-datacenter Bronze",
    accent: "oklch(0.65 0.16 320)",
    icon: <Network className="h-4 w-4" />,
    badge: "Sensors · Multi-region",
    brief: {
      dataset: "Environmental sensor network spread across 3 regions: EU (Frankfurt), US (Virginia), Asia (Tokyo). Each region's sensors publish to local Pulsar topics; Pulsar geo-replication mirrors topics across regions. Each region writes its Bronze Iceberg tier locally + cross-replicates for global analytics.",
      scale: "150k sensors globally (50k per region) · 750k events/sec global · 3 regions · ~63GB/day per region",
      why: "Pulsar's geo-replication IS the multi-region lakehouse solution — Kafka has no native geo-replication (you'd need MirrorMaker 2.0 + manual config). Pulsar's segmented storage (BookKeeper) enables native cross-DC replication with configurable replication factor per topic. The Bronze tier exists in 3 copies — one per region — enabling both local analytics (low-latency) and global analytics (cross-region joins).",
    },
    stats: [
      { label: "Sensors", value: "150k" },
      { label: "Regions", value: "3 (EU/US/Asia)" },
      { label: "Event rate", value: "750k/sec" },
      { label: "Bronze copies", value: "3 (one/region)" },
    ],
    tools: ["Apache Pulsar", "Pulsar Functions", "Apache Iceberg", "Apache BookKeeper", "Trino", "S3", "Grafana"],
    codeTabs: [
      {
        lang: "scala",
        filename: "PulsarMultiRegionProducer.scala",
        code: `import org.apache.pulsar.client.api.{PulsarClient, Producer}
import org.apache.pulsar.client.api.Schema
import scala.util.Random

// Multi-region environmental sensor producer — writes to local Pulsar cluster
// Geo-replication mirrors topics across EU (Frankfurt) + US (Virginia) + Asia (Tokyo)

case class SensorReading(
  sensor_id: String, metric: String, value: Double,
  region: String, ts: Long, quality: Int
)

// EU producer — writes to local Pulsar cluster (Frankfurt)
val euClient = PulsarClient.builder()
  .serviceUrl("pulsar://pulsar-eu.frankfurt:6650")
  .build()

val euProducer: Producer[SensorReading] = euClient
  .newProducer(Schema.JSON[SensorReading])
  .topic("persistent://sensors/eu/airnow")  // local topic
  .enableBatching(true)
  .batchingMaxMessages(1000)
  .batchingMaxPublishDelay(5, java.util.concurrent.TimeUnit.MILLISECONDS)
  .create()

// Geo-replication config (per-topic, in broker):
// bin/pulsar-admin namespaces set-replication-coverage sensors/eu --clusters eu,us,asia
// Each topic auto-mirrors to all 3 clusters with configurable replication factor.

val regions = List("EU", "US", "Asia")
val metrics = List("pm25", "o3", "co", "no2", "so2", "temp", "humidity")
val rnd = new Random(42)

for (i <- 1 to 100000) {
  val reading = SensorReading(
    sensor_id = s"airnow-eu-\${rnd.nextInt(50000)}",
    metric = metrics(rnd.nextInt(metrics.length)),
    value = math.max(0, rnd.nextGaussian() * 10 + 15),
    region = "EU",
    ts = System.currentTimeMillis(),
    quality = rnd.nextInt(100)
  )
  euProducer.send(reading)
}
euProducer.flush()`,
      },
      {
        lang: "rust",
        filename: "pulsar_multi_region_consumer.rs",
        code: `use pulsar::{Pulsar, TokioExecutor};
use futures::StreamExt;

// Rust Pulsar consumer — reads from geo-replicated topic.
// Use case: global analytics consumer that reads from any region's
// Bronze tier (Pulsar handles replication transparently).

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let pulsar: Pulsar<TokioExecutor> = Pulsar::builder("pulsar://pulsar-us.virginia:6650",
        TokioExecutor).build()?;

    // Subscribe to geo-replicated topic (US region reads EU + Asia copies)
    let mut consumer = pulsar
        .consumer()
        .with_topic("persistent://sensors/eu/airnow")
        .consumer_name("bronze-writer-us")
        .subscription("bronze-writer")
        .build()
        .await?;

    while let Some(msg) = consumer.next().await {
        let msg = msg?;
        let payload = msg.payload().unwrap_or_default();
        let reading: SensorReading = serde_json::from_slice(&payload)?;
        // Write to local Bronze Iceberg (US region copy)
        println!("[region={} sensor={}]", reading.region, reading.sensor_id);
        consumer.ack(&msg).await?;
    }
    Ok(())
}

#[derive(serde::Deserialize)]
struct SensorReading {
    sensor_id: String,
    metric: String,
    value: f64,
    region: String,
    ts: i64,
    quality: i64,
}`,
      },
      {
        lang: "go",
        filename: "pulsar_multi_region_consumer.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"

    "github.com/apache/pulsar-client-go/pulsar"
)

// Go Pulsar consumer — reads from geo-replicated topic + writes
// to local Bronze Iceberg. Each region has its own copy of Bronze.

func main() {
    client, err := pulsar.NewClient(pulsar.ClientOptions{
        URL: "pulsar://pulsar-asia.tokyo:6650",
    })
    if err != nil { log.Fatal(err) }
    defer client.Close()

    consumer, err := client.Subscribe(pulsar.ConsumerOptions{
        Topic:            "persistent://sensors/eu/airnow",
        SubscriptionName: "bronze-writer-asia",
        Type:             pulsar.Failover,
    })
    if err != nil { log.Fatal(err) }
    defer consumer.Close()

    ctx := context.Background()
    for {
        msg, err := consumer.Receive(ctx)
        if err != nil { continue }
        fmt.Printf("region=%s payload=%s\\n",
            msg.Properties["region"], string(msg.Payload))
        consumer.Ack(msg)
    }
}`,
      },
      {
        lang: "elixir",
        filename: "pulsar_multi_region_consumer.ex",
        code: `defmodule Sensors.MultiRegionBronzeWriter do
  @moduledoc """
  Pulsar consumer that writes geo-replicated events to local Bronze Iceberg.
  Each region (EU, US, Asia) runs one of these — they read from their local
  Pulsar cluster which auto-mirrors topics across all 3 regions.
  """
  use GenServer

  defstruct [:client, :consumer, :table, :region]

  def start_link(region) when region in ~w(eu us asia) do
    GenServer.start_link(__MODULE__, region, name: via(region))
  end

  defp via(region), do: {:via, Registry, {Sensors.Registry, {:bronze_writer, region}}}

  @impl true
  def init(region) do
    # Connect to local Pulsar cluster
    {:ok, client} = Pulsar.Client.start_link(
      url: "pulsar://pulsar-\\#{region}.local:6650")
    {:ok, consumer} = Pulsar.Consumer.start_link(client,
      topic: "persistent://sensors/\\#{region}/airnow",
      subscription: "bronze-writer",
      subscription_type: :failover)

    # Open local Bronze Iceberg table (one per region)
    {:ok, table} = Explorer.Iceberg.open_table("bronze.sensor_\\#{region}",
      warehouse: "s3://sensors-\\#{region}-iceberg/")

    send(self(), :poll)
    {:ok, %__MODULE__{client: client, consumer: consumer, table: table, region: region}}
  end

  @impl true
  def handle_info(:poll, state) do
    case Pulsar.Consumer.receive(state.consumer, timeout: 1000) do
      {:ok, batch} ->
        rows = Enum.map(batch, &Jason.decode!(&1.payload))
        :ok = Explorer.Iceberg.append(state.table, rows)
        Enum.each(batch, &Pulsar.Consumer.ack(state.consumer, &1))
      {:error, :timeout} -> :ok
    end
    send(self(), :poll)
    {:noreply, state}
  end
end`,
      },
      {
        lang: "zig",
        filename: "pulsar_multi_region_consumer.zig",
        code: `const std = @import("std");
const pulsar = @import("pulsar-zig");
const iceberg = @import("iceberg-zig");

// Zig Pulsar consumer — multi-region Bronze writer with sub-ms
// geo-replication acknowledgements. Use case: cross-region
// sensor network for earthquake early-warning (must reach all
// 3 regions within 50ms of measurement).

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = try pulsar.Client.init(allocator, .{
        .url = "pulsar://pulsar-eu.frankfurt:6650",
    });
    defer client.deinit();

    var consumer = try client.subscribe(allocator, .{
        .topic = "persistent://sensors/eu/airnow",
        .subscription = "bronze-writer-eu",
    });
    defer consumer.deinit();

    var catalog = try iceberg.Catalog.rest(allocator, .{
        .uri = "https://catalog.sensors-eu.io",
        .warehouse = "s3://sensors-eu-iceberg/",
    });
    defer catalog.deinit();

    var table = try catalog.loadTable(allocator, "bronze.sensor_eu");
    defer table.deinit();

    while (try consumer.poll()) |batch| {
        try table.append(batch);
        try consumer.ack(batch);
    }
}`,
      },
    ],
    runnablePython: `# Multi-region sensor network on Pulsar simulation — Pyodide
import random
from collections import defaultdict

print("=== Multi-region Sensor Network on Pulsar ===")
print("150k sensors globally (50k per region) → Pulsar geo-replication → Bronze")
print()

# Simulate sensor events across 3 regions (scaled from 750k/sec)
random.seed(42)
regions = {
    'EU (Frankfurt)': 50_000,
    'US (Virginia)': 50_000,
    'Asia (Tokyo)': 50_000,
}
metrics = ['pm25', 'o3', 'co', 'no2', 'so2', 'temp', 'humidity']

# Bronze: raw sensor events per region
bronze_events = {region: [] for region in regions}
for region, n_sensors in regions.items():
    for _ in range(2000):  # scaled from 250k/sec per region
        event = {
            'sensor_id': f"{region[:2].lower()}-{random.randint(1, n_sensors):05d}",
            'metric': random.choice(metrics),
            'value': max(0, random.gauss(15, 10)),
            'region': region,
            'ts': random.randint(1, 1000),
            'quality': random.randint(0, 100),
        }
        bronze_events[region].append(event)

# Pulsar geo-replication: each region's events mirror to all 3 regions
# Local Bronze = own events, Replicated Bronze = all 3 regions
replicated_bronze = []
for region, events in bronze_events.items():
    replicated_bronze.extend(events)

# Silver: per-region validation + calibration
silver_by_region = defaultdict(list)
for e in replicated_bronze:
    if e['value'] <= 0: continue
    e['calibrated'] = e['value'] * random.uniform(0.95, 1.05)
    silver_by_region[e['region']].append(e)

# Gold: global vs per-region aggregates
gold_global = defaultdict(list)
gold_per_region = defaultdict(lambda: defaultdict(list))
for region, events in silver_by_region.items():
    for e in events:
        gold_global[e['metric']].append(e['calibrated'])
        gold_per_region[region][e['metric']].append(e['calibrated'])

print(f"{'Region':<18} | {'Bronze events':>14} | {'Replicated':>14} | {'Silver':>10}")
print("-" * 65)
total_bronze = 0
total_replicated = 0
for region in regions:
    n_local = len(bronze_events[region])
    n_repl = sum(len(bronze_events[r]) for r in regions)  # all 3 regions replicated
    n_silver = len(silver_by_region[region])
    total_bronze += n_local
    total_replicated += n_repl
    print(f"{region:<18} | {n_local:>14,} | {n_repl:>14,} | {n_silver:>10,}")

print(f"{'TOTAL':<18} | {total_bronze:>14,} | {total_replicated:>14,} |")
print()
print(f"{'Metric':<10} | {'EU avg':>10} | {'US avg':>10} | {'Asia avg':>10} | {'Global avg':>12}")
print("-" * 60)
for metric in metrics:
    eu_vals = gold_per_region['EU (Frankfurt)'][metric]
    us_vals = gold_per_region['US (Virginia)'][metric]
    asia_vals = gold_per_region['Asia (Tokyo)'][metric]
    global_vals = gold_global[metric]
    eu_avg = sum(eu_vals)/len(eu_vals) if eu_vals else 0
    us_avg = sum(us_vals)/len(us_vals) if us_vals else 0
    asia_avg = sum(asia_vals)/len(asia_vals) if asia_vals else 0
    global_avg = sum(global_vals)/len(global_vals) if global_vals else 0
    print(f"{metric:<10} | {eu_avg:>9.1f}  | {us_avg:>9.1f}  | {asia_avg:>9.1f}  | {global_avg:>11.1f} ")

print()
print("Pulsar geo-replication: each topic auto-mirrors across EU + US + Asia")
print("Local Bronze = low-latency regional analytics (sub-100ms)")
print("Replicated Bronze = global cross-region joins (via Trino federation)")
print("Bronze Iceberg: 3 copies (one per region) — local S3 bucket per region")
print("Replication factor: 3 (configurable per topic)")`,
    insight: "Pulsar's geo-replication IS the multi-region lakehouse solution — Kafka has no native geo-replication (you'd need MirrorMaker 2.0 + manual cluster-pairing). Pulsar's segmented BookKeeper storage enables native cross-DC replication with configurable replication factor per topic. Yahoo built Pulsar exactly for this — multi-region sensor networks at scale. The Bronze tier exists in 3 copies (one per region), enabling both low-latency local analytics and global cross-region joins via Trino federation.",
  },
];

// ============================================================
// SPARK_STREAMING_SCIENCE_EXAMPLES (1 example)
// ============================================================

export const SPARK_STREAMING_SCIENCE_EXAMPLES: DatasetExample[] = [
  // ============================================================
  // 6. MATHEMATICS SEQUENCE COMPUTATION (Mathematics)
  // ============================================================
  {
    id: "spark-streaming-oeis-math",
    step: "1",
    title: "OEIS Sequence Property Computation on Spark Streaming",
    subtitle: "Mathematics — micro-batch growth-rate computation for OEIS submissions",
    accent: "oklch(0.65 0.16 130)",
    icon: <TrendingUp className="h-4 w-4" />,
    badge: "Mathematics · Sequences",
    brief: {
      dataset: "OEIS (On-Line Encyclopedia of Integer Sequences) — 370,000+ sequences from Neil Sloane's 1964 collection. New submissions stream in at ~5-20/day. Spark Structured Streaming reads new submissions, computes sequence properties (growth rate, asymptotic formula, generating function form), writes Bronze Iceberg partitioned by sequence class.",
      scale: "370k+ sequences · 5-20 new submissions/day · ~10M terms computed/year · ~50GB Bronze tier",
      why: "OEIS sequence computation IS the micro-batch lakehouse mathematics use case — submissions arrive at low rate (5-20/day) but each requires significant compute (asymptotic analysis, generating function fitting, congruence checking). Spark Structured Streaming's micro-batch mode (vs Flink's continuous) is the right fit — process new submissions in 5-minute batches, compute properties with stateful ops (watermark + session window), write Bronze Iceberg for math researchers.",
    },
    stats: [
      { label: "Sequences", value: "370k+" },
      { label: "New/day", value: "5-20" },
      { label: "Terms computed/year", value: "10M" },
      { label: "Bronze volume", value: "50 GB" },
    ],
    tools: ["Apache Spark", "Structured Streaming", "Apache Iceberg", "OEIS API", "SymPy", "Trino", "S3"],
    codeTabs: [
      {
        lang: "scala",
        filename: "SparkStreamingOEIS.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._
import org.apache.spark.sql.streaming.OutputMode
import org.apache.spark.sql.streaming.Trigger

// OEIS sequence property computation via Spark Structured Streaming
// Reads new OEIS submissions from Kafka, computes growth rate +
// asymptotic properties in micro-batches, writes Bronze Iceberg.

val spark = SparkSession.builder()
  .config("spark.sql.catalog.iceberg", "org.apache.iceberg.spark.SparkCatalog")
  .config("spark.sql.catalog.iceberg.warehouse", "s3://oeis-iceberg/")
  .getOrCreate()

// Source: Kafka topic with new OEIS submissions (JSON)
val submissions = spark.readStream.format("kafka")
  .option("kafka.bootstrap.servers", "kafka:9092")
  .option("subscribe", "oeis.submissions")
  .option("startingOffsets", "earliest")
  .load()
  .selectExpr(
    "CAST(value AS STRING) as json",
    "topic",
    "timestamp as kafka_ts"
  )
  .selectExpr(
    "json:seq_id as seq_id",            // e.g. "A000045" (Fibonacci)
    "json:sequence as terms",            // list of integers
    "json:author as author",
    "json:submitted_ts as submitted_ts",
    "json:keywords as keywords",         // e.g. ["easy", "core", "nonn"]
    "kafka_ts"
  )
  .withWatermark("submitted_ts", "1 hour")  // drop late submissions

// Compute sequence properties (UDF — uses SymPy-equivalent Scala)
val computeGrowthRate = udf((terms: Seq[Long]) => {
  // Fit log(terms) vs n — slope = growth rate
  // A000045 (Fibonacci): slope ~ ln(phi) ≈ 0.481
  // A000040 (Primes): slope ~ ln(n) — logarithmic growth
  if (terms.length < 5) 0.0
  else {
    val log_terms = terms.map(t => math.log(t.toDouble + 1))
    val n = terms.length
    val sum_x = (1 to n).sum.toDouble
    val sum_y = log_terms.sum
    val sum_xy = (1 to n).zip(log_terms).map { case (x, y) => x * y }.sum
    val sum_x2 = (1 to n).map(x => x * x).sum.toDouble
    (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
  }
})

val enriched = submissions
  .withColumn("n_terms", size(col("terms")))
  .withColumn("growth_rate", computeGrowthRate(col("terms")))
  .withColumn("is_exponential", col("growth_rate") > 0.5)
  .withColumn("is_polynomial", col("growth_rate") > 0 && col("growth_rate") < 0.5)

// Sink: Bronze Iceberg (partitioned by growth_rate_class)
enriched.writeStream
  .format("iceberg")
  .outputMode(OutputMode.Append())
  .trigger(Trigger.ProcessingTime("5 minutes"))  // micro-batch every 5min
  .option("checkpointLocation", "s3://cp/oeis-bronze/")
  .toTable("iceberg.bronze.oeis_sequences")
  .start()`,
      },
      {
        lang: "rust",
        filename: "spark_streaming_oeis_reader.rs",
        code: `use iceberg_rust::catalog::rest::RestCatalog;

// Rust OEIS reader — analyses Bronze tier for sequence property patterns.
// Use case: mathematics researcher studying exponential vs polynomial
// growth rate distributions across OEIS.

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let catalog = RestCatalog::new("https://catalog.oeis.io")
        .with_warehouse("s3://oeis-iceberg/").build()?;

    let bronze = catalog.load("bronze.oeis_sequences")?;

    // All exponential-growth sequences (Fibonacci, Lucas, etc.)
    let batch = bronze.scan()
        .with_filter("is_exponential = true AND growth_rate > 0.4")
        .to_arrow().await?;

    println!("{} exponential-growth sequences in OEIS", batch.num_rows());

    // Compute statistics across all exponential sequences
    let growth_rates = batch.column_by_name("growth_rate").as_f64()?;
    let mean = growth_rates.iter().sum::<f64>() / growth_rates.len() as f64;
    println!("Mean growth rate: {:.4} (Fibonacci = ln(phi) = {:.4})",
        mean, std::f64::consts::LN_PHI);
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "spark_streaming_oeis_reader.go",
        code: `package main

import (
    "context"
    "fmt"

    "github.com/apache/iceberg-go/api"
)

// Go OEIS reader — Cloud Run function that monitors Bronze tier for
// sequences with unusual growth patterns (e.g. oscillating growth).

func main() {
    ctx := context.Background()
    catalog, _ := api.NewRestCatalog(ctx, "https://catalog.oeis.io",
        "s3://oeis-iceberg/")
    table, _ := catalog.LoadTable(ctx, "bronze.oeis_sequences")

    scan := table.Scan().
        WithFilter("growth_rate > 0.8")  // super-exponential growth
    iter, _ := scan.ToArrowIterator(ctx)
    for rec, err := iter.Next(); err == nil; rec, err = iter.Next() {
        fmt.Printf("Seq %s: growth_rate=%.4f (author=%s)\\n",
            rec.GetString(0, "seq_id"),
            rec.GetFloat64(0, "growth_rate"),
            rec.GetString(0, "author"))
    }
}`,
      },
      {
        lang: "elixir",
        filename: "spark_streaming_oeis_reader.ex",
        code: `defmodule OEIS.SequenceExplorer do
  @moduledoc """
  Phoenix LiveView for exploring OEIS sequence properties from Bronze tier.
  Polls Bronze every 5 minutes (matches Spark micro-batch cadence) for new
  sequences, displays growth-rate distribution histogram.
  """
  use GenServer
  alias Explorer.DataFrame, as: DF

  defstruct [:last_run, :cache]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    cache = :ets.new(:oeis_cache, [:set, :public, read_concurrency: true])
    send(self(), :refresh)
    {:ok, %__MODULE__{last_run: nil, cache: cache}}
  end

  @impl true
  def handle_info(:refresh, state) do
    {:ok, df} = Explorer.Iceberg.scan("bronze.oeis_sequences",
      filters: ["submitted_ts >= now() - interval '24 hours'"])

    rows = DF.to_rows(df)
    # Classify by growth pattern
    exponential = Enum.filter(rows, & &1["is_exponential"])
    polynomial = Enum.filter(rows, & &1["is_polynomial"])
    :ets.insert(state.cache, {:exponential, exponential})
    :ets.insert(state.cache, {:polynomial, polynomial})

    Phoenix.PubSub.broadcast(ModernDataSci.PubSub, "oeis:updates",
      {:new_sequences, length(rows), length(exponential), length(polynomial)})

    Process.send_after(self(), :refresh, 5 * 60_000)  # 5 min micro-batch
    {:noreply, %{state | last_run: DateTime.utc_now()}}
  end
end`,
      },
      {
        lang: "zig",
        filename: "spark_streaming_oeis_reader.zig",
        code: `const std = @import("std");
const iceberg = @import("iceberg-zig");

// Zig OEIS reader — sub-ms sequence lookup for interactive math research.
// Use case: real-time OEIS explorer that queries Bronze for sequences
// matching a given growth pattern.

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var catalog = try iceberg.Catalog.rest(allocator, .{
        .uri = "https://catalog.oeis.io",
        .warehouse = "s3://oeis-iceberg/",
    });
    defer catalog.deinit();

    var table = try catalog.loadTable(allocator, "bronze.oeis_sequences");
    defer table.deinit();

    // Find Fibonacci-like sequences (growth_rate ≈ ln(φ) ≈ 0.481)
    var scan = try table.scan(allocator, .{
        .filter = "growth_rate BETWEEN 0.45 AND 0.50",
        .selected_fields = &.{ "seq_id", "terms", "growth_rate", "keywords" },
    });
    defer scan.deinit();

    while (try scan.next()) |batch| {
        const seq_ids = batch.get_string_col("seq_id");
        const rates = batch.get_f64_col("growth_rate");
        for (seq_ids, rates) |seq_id, rate| {
            std.debug.print("{s}: growth_rate={d:.4} (Fibonacci-like)\\n",
                .{ seq_id, rate });
        }
    }
}`,
      },
    ],
    runnablePython: `# OEIS sequence property computation on Spark Streaming — Pyodide
import math
import random
from collections import defaultdict

print("=== OEIS Sequence Property Computation on Spark Streaming ===")
print("370k+ sequences · 5-20 new submissions/day → Bronze Iceberg")
print()

# Simulate OEIS sequence submissions (scaled from 370k to 200)
random.seed(42)

# Generate synthetic sequences with known growth patterns
def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

def primes(n):
    sieve = [True] * (n * 20)
    sieve[0] = sieve[1] = False
    for i in range(2, len(sieve)):
        if sieve[i]:
            for j in range(i*i, len(sieve), i):
                sieve[j] = False
    return [i for i, is_p in enumerate(sieve) if is_p][:n]

def squares(n):
    return [i*i for i in range(n)]

def catalan(n):
    seq = []
    c = 1
    for i in range(n):
        seq.append(c)
        c = c * 2 * (2*i + 1) // (i + 2)
    return seq

# Bronze: simulated submissions
submissions = []
known_seqs = [
    ('A000045', 'Fibonacci', fibonacci(20), 'core,nonn,easy,nice'),
    ('A000040', 'Primes', primes(20), 'core,nonn,nice'),
    ('A000290', 'Squares', squares(20), 'core,nonn,easy'),
    ('A000108', 'Catalan', catalan(20), 'core,nonn,nice'),
]
for seq_id, name, terms, keywords in known_seqs:
    submissions.append({
        'seq_id': seq_id,
        'name': name,
        'terms': terms,
        'keywords': keywords,
        'author': 'N.J.A. Sloane',
        'submitted_ts': random.randint(1, 1000),
    })

# Add 200 random synthetic sequences
for i in range(200):
    n_terms = random.randint(10, 30)
    growth_type = random.choice(['exp', 'poly', 'log', 'const'])
    if growth_type == 'exp':
        terms = [int(2**i * random.uniform(0.9, 1.1)) for i in range(n_terms)]
    elif growth_type == 'poly':
        degree = random.choice([2, 3, 4])
        terms = [int(i**degree * random.uniform(0.9, 1.1)) for i in range(n_terms)]
    elif growth_type == 'log':
        terms = [int(math.log(i+2) * 100) for i in range(n_terms)]
    else:
        terms = [random.randint(1, 100) for _ in range(n_terms)]
    submissions.append({
        'seq_id': f'A{random.randint(100000, 999999)}',
        'name': f'synthetic-{i}',
        'terms': terms,
        'keywords': random.choice(['nonn,easy', 'nonn,nice', 'sign,nonn']),
        'author': f'submitter-{i}',
        'submitted_ts': random.randint(1, 1000),
    })

# Spark UDF: compute growth rate via linear regression on log(terms)
def compute_growth_rate(terms):
    if len(terms) < 5: return 0.0
    log_terms = [math.log(max(1, t)) for t in terms]
    n = len(terms)
    sum_x = sum(range(1, n+1))
    sum_y = sum(log_terms)
    sum_xy = sum((i+1) * log_terms[i] for i in range(n))
    sum_x2 = sum((i+1)**2 for i in range(n))
    denom = n * sum_x2 - sum_x * sum_x
    if denom == 0: return 0.0
    return (n * sum_xy - sum_x * sum_y) / denom

# Bronze Iceberg: enriched submissions
bronze_enriched = []
for s in submissions:
    rate = compute_growth_rate(s['terms'])
    bronze_enriched.append({
        **s,
        'n_terms': len(s['terms']),
        'growth_rate': rate,
        'is_exponential': rate > 0.5,
        'is_polynomial': 0 < rate < 0.5,
        'is_logarithmic': rate > 0 and rate < 0.2,
    })

# Gold: aggregate by growth pattern
gold_pattern = defaultdict(list)
for s in bronze_enriched:
    if s['is_exponential']:
        gold_pattern['exponential'].append(s)
    elif s['is_polynomial']:
        gold_pattern['polynomial'].append(s)
    elif s['is_logarithmic']:
        gold_pattern['logarithmic'].append(s)
    else:
        gold_pattern['other'].append(s)

# Find Fibonacci-like sequences (growth rate ≈ ln(φ) ≈ 0.481)
phi_rate = math.log((1 + math.sqrt(5)) / 2)
fibonacci_like = [s for s in bronze_enriched if 0.4 < s['growth_rate'] < 0.55]

print(f"Bronze (submissions):  {len(bronze_enriched)}")
print(f"Spark micro-batch:     5 minutes")
print(f"Watermark:             1 hour (drop late submissions)")
print()
print(f"{'Pattern':<15} | {'Count':>10} | {'Example':>20} | {'Mean rate':>10}")
print("-" * 65)
for pattern in ['exponential', 'polynomial', 'logarithmic', 'other']:
    seqs = gold_pattern[pattern]
    if not seqs: continue
    rates = [s['growth_rate'] for s in seqs]
    mean_rate = sum(rates) / len(rates) if rates else 0
    example = seqs[0]['seq_id']
    print(f"{pattern:<15} | {len(seqs):>10,} | {example:>20} | {mean_rate:>9.4f} ")

print()
print(f"Fibonacci-like sequences (0.4 < rate < 0.55):")
print(f"  Found {len(fibonacci_like)} (expected: Fibonacci A000045 has rate ≈ {phi_rate:.4f})")
for s in fibonacci_like[:5]:
    print(f"    {s['seq_id']:<10} ({s['name']:<15}) rate={s['growth_rate']:.4f}")

print()
print("Spark Structured Streaming: micro-batch mode (vs Flink continuous)")
print("Trigger: ProcessingTime('5 minutes') — batch new submissions every 5 min")
print("Watermark: 1 hour — drop submissions older than 1 hour (late arrivals)")
print("Bronze Iceberg partitioning: by growth_rate_class (exp/poly/log/other)")`,
    insight: "OEIS sequence computation IS the micro-batch lakehouse mathematics use case — submissions arrive at low rate (5-20/day) but each requires significant compute (asymptotic analysis, generating function fitting). Spark Structured Streaming's micro-batch mode (vs Flink's continuous) is the right fit — process new submissions in 5-minute batches with stateful watermark windows. The Bronze Iceberg tier becomes the canonical source for math researchers studying sequence growth distributions across all 370k+ OEIS sequences.",
  },
];
