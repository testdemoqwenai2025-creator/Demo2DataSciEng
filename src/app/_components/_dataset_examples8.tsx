// ============================================================
// Scientific dataset examples for /data-lakehouse page
// 6 examples (3 life sciences + 1 sensors + 1 physics + 1 math) × 5 languages
// Shows the medallion Bronze→Silver→Gold pattern applied to scientific domains
// ============================================================

import type { DatasetExample } from "./dataset-cards";
import {
  Database, Atom, Boxes, Zap, TrendingUp, Activity, Cpu,
  History, Sparkles, Network, ShieldCheck, Layers,
} from "lucide-react";

export const LAKEHOUSE_SCIENCE_EXAMPLES: DatasetExample[] = [
  // ============================================================
  // 1. GENOMICS ON ICEBERG (Life Sciences)
  // ============================================================
  {
    id: "science-genomics-1000g",
    step: "1",
    title: "1000 Genomes Project on Iceberg (100TB)",
    subtitle: "Life sciences — whole-genome variants partitioned by chromosome + population",
    accent: "oklch(0.65 0.16 30)",
    icon: <Database className="h-4 w-4" />,
    badge: "Life Sciences · Genomics",
    brief: {
      dataset: "1000 Genomes Project — whole-genome sequencing data for 2,504 individuals across 26 populations. ~100TB VCF files on S3, stored as Iceberg tables partitioned by chromosome + population. Free download from NIH.",
      scale: "~100TB · 2,504 individuals · 3 billion SNPs · 26 populations · 22 chromosomes",
      why: "Genomics IS the original big-data problem — 3 billion base pairs × 2,504 individuals = 7.5 trillion data points. The medallion pattern: Bronze (raw VCF from sequencer) → Silver (normalised + QC-filtered variants) → Gold (population-level allele frequencies + GWAS statistics). Iceberg's hidden partitioning on (chromosome, population) enables sub-second variant queries.",
    },
    stats: [
      { label: "Volume", value: "100 TB" },
      { label: "Individuals", value: "2,504" },
      { label: "SNPs", value: "3 billion" },
      { label: "Populations", value: "26" },
    ],
    tools: ["Apache Iceberg", "Apache Spark", "GATK", "Hail", "ADAM", "Trino", "S3"],
    codeTabs: [
      {
        lang: "scala",
        filename: "GenomicsMedallion.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

// 1000 Genomes on Iceberg — Bronze→Silver→Gold medallion for genomics
val spark = SparkSession.builder()
  .config("spark.sql.catalog.iceberg", "org.apache.iceberg.spark.SparkCatalog")
  .config("spark.sql.catalog.iceberg.catalog-impl", "org.apache.iceberg.aws.glue.GlueCatalog")
  .config("spark.sql.catalog.iceberg.warehouse", "s3://genomics-iceberg/")
  .getOrCreate()

// Bronze: raw VCF parsed into structured rows (from 1000 Genomes FTP)
val bronze = spark.read.format("csv").option("delimiter", "\\t")
  .schema("chrom STRING, pos LONG, id STRING, ref STRING, alt STRING, qual DOUBLE, filter STRING, info STRING")
  .load("s3://genomics-bronze/1000g/vcf/")
  .withColumn("population", split(input_file_name(), "/").getItem(4))
  .withColumn("ingest_ts", current_timestamp())

bronze.writeTo("iceberg.bronze.variants_raw").createOrReplace()

// Silver: normalise multi-allelic + QC filter + annotate
val silver = spark.table("iceberg.bronze.variants_raw")
  .filter(\$"qual" > 30 && \$"filter".contains("PASS"))
  .withColumn("alt_alleles", split(\$"alt", ","))  // split multi-allelic
  .selectExpr("chrom", "pos", "ref", "explode(alt_alleles) as alt", "population")

silver.writeTo("iceberg.silver.variants_qc")
  .merge(\$"chrom" === silver("chrom") && \$"pos" === silver("pos")).execute()

// Gold: population-level allele frequencies (GWAS-ready)
val gold = spark.table("iceberg.silver.variants_qc")
  .groupBy(\$"chrom", \$"pos", \$"ref", \$"alt", \$"population")
  .agg(
    count("*").as("allele_count"),
    collect_set("individual_id").as("carriers")
  )
  .withColumn("allele_freq", size(\$"carriers") / lit(2504.0))

gold.writeTo("iceberg.gold.allele_frequencies")
  .partitionedBy("chrom", "population")
  .createOrReplace()

// Query: find variants with frequency > 10% in European populations
spark.sql("""
  SELECT chrom, pos, ref, alt, allele_freq
  FROM iceberg.gold.allele_frequencies
  WHERE population LIKE 'EUR%' AND allele_freq > 0.10
  ORDER BY allele_freq DESC LIMIT 100
""").show()`,
      },
      {
        lang: "rust",
        filename: "genomics_medallion.rs",
        code: `use iceberg_rust::catalog::glue::GlueCatalog;
use arrow::array::RecordBatch;

// Rust genomics reader — uses iceberg-rs for zero-JVM variant queries.
// Use case: GATK-like variant caller that reads from Iceberg instead of VCF files.

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let catalog = GlueCatalog::new("genomics_warehouse")
        .with_warehouse("s3://genomics-iceberg/").build()?;

    // Read allele frequencies (Gold tier) — partitioned by chromosome
    let gold = catalog.load("gold.allele_frequencies")?;
    let batch = gold.scan()
        .with_filter("chrom = 'chr17' AND population LIKE 'EUR%' AND allele_freq > 0.10")
        .to_arrow().await?;

    println!("Found {} high-frequency variants on chr17 in EUR populations",
        batch.num_rows());
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "genomics_medallion.go",
        code: `package main

import (
    "context"
    "fmt"

    "github.com/apache/iceberg-go/api"
)

// Go genomics reader — serverless function for GWAS lookup.
// Use case: Cloud Run function that returns population-level allele freqs.

func main() {
    ctx := context.Background()
    catalog, _ := api.NewGlueCatalog(ctx, "genomics_warehouse",
        "s3://genomics-iceberg/")
    table, _ := catalog.LoadTable(ctx, "gold.allele_frequencies")

    scan := table.Scan().
        WithFilter("chrom = 'chr17' AND population LIKE 'EUR%' AND allele_freq > 0.10")
    iter, _ := scan.ToArrowIterator(ctx)
    for rec, err := iter.Next(); err == nil; rec, err = iter.Next() {
        fmt.Printf("chr17:%d %s>%s freq=%.4f pop=%s\\n",
            rec.GetInt64(0, "pos"),
            rec.GetString(0, "ref"),
            rec.GetString(0, "alt"),
            rec.GetFloat64(0, "allele_freq"),
            rec.GetString(0, "population"))
    }
}`,
      },
      {
        lang: "elixir",
        filename: "genomics_medallion.ex",
        code: `defmodule Genomics.PopulationBrowser do
  @moduledoc """
  Phoenix LiveView dashboard for exploring allele frequencies across
  populations. Each chromosome+population partition is cached in ETS.
  """
  use GenServer
  alias Explorer.DataFrame, as: DF

  defstruct [:cache]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    cache = :ets.new(:allele_cache, [:set, :public, read_concurrency: true])
    {:ok, %__MODULE__{cache: cache}}
  end

  @impl true
  def handle_call({:lookup, chrom, population, min_freq}, _from, state) do
    key = {chrom, population, min_freq}
    case :ets.lookup(state.cache, key) do
      [{_, cached}] -> {:reply, cached, state}
      _ ->
        {:ok, df} = Explorer.Iceberg.scan("gold.allele_frequencies",
          filters: ["chrom = '\#{chrom}'", "population LIKE '\#{population}%'",
                    "allele_freq > \#{min_freq}"])
        rows = DF.to_rows(df)
        :ets.insert(state.cache, {key, rows})
        Process.send_after(self(), {:evict, key}, 3_600_000)
        {:reply, rows, state}
    end
  end

  @impl true
  def handle_info({:evict, key}, state) do
    :ets.delete(state.cache, key)
    {:noreply, state}
  end
end`,
      },
      {
        lang: "zig",
        filename: "genomics_medallion.zig",
        code: `const std = @import("std");
const iceberg = @import("iceberg-zig");

// Zig genomics reader — ultra-fast variant lookup for GWAS pipelines.
// Use case: bioinformatics pipeline that needs sub-ms allele frequency
// lookups across 3 billion SNPs × 26 populations.

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var catalog = try iceberg.Catalog.glue(allocator, .{
        .database = "genomics_warehouse",
        .warehouse = "s3://genomics-iceberg/",
    });
    defer catalog.deinit();

    var table = try catalog.loadTable(allocator, "gold.allele_frequencies");
    defer table.deinit();

    // Partition-pruned scan: chr17 + EUR populations + freq > 10%
    var scan = try table.scan(allocator, .{
        .filter = "chrom = 'chr17' AND population LIKE 'EUR%' AND allele_freq > 0.10",
        .selected_fields = &.{ "pos", "ref", "alt", "allele_freq", "population" },
    });
    defer scan.deinit();

    while (try scan.next()) |batch| {
        const positions = batch.get_u64_col("pos");
        const freqs = batch.get_f64_col("allele_freq");
        const refs = batch.get_string_col("ref");
        const alts = batch.get_string_col("alt");
        for (positions, freqs, refs, alts) |pos, freq, ref, alt| {
            std.debug.print("chr17:{d} {s}>{s} freq={d:.4}\\n", .{ pos, ref, alt, freq });
        }
    }
}`,
      },
    ],
    runnablePython: `# 1000 Genomes medallion simulation — Pyodide
import random
from collections import defaultdict

print("=== 1000 Genomes on Iceberg — Bronze → Silver → Gold ===")
print("Raw VCF (100TB) → QC-filtered variants → Population allele frequencies")
print()

# Simulate variants on chr17 for 5 populations
random.seed(42)
populations = ['EUR', 'AFR', 'ASN', 'AMR', 'SAS']
n_individuals = 2504
bronze_variants = defaultdict(lambda: defaultdict(int))

# Bronze: raw variants (simulated)
for i in range(50000):
    pos = random.randint(1, 80_000_000)
    pop = random.choice(populations)
    bronze_variants[pop][pos] += 1

# Silver: QC filter (qual > 30, PASS)
silver_variants = {pop: {pos: c for pos, c in vars.items() if c > 5}
                   for pop, vars in bronze_variants.items()}

# Gold: allele frequencies
print(f"{'Population':<10} | {'Bronze vars':>12} | {'Silver vars':>12} | {'Gold (freq>10%)':>16}")
print("-" * 60)
for pop in populations:
    b_count = len(bronze_variants[pop])
    s_count = len(silver_variants[pop])
    g_count = sum(1 for pos, c in silver_variants[pop].items()
                  if c / n_individuals > 0.10)
    print(f"{pop:<10} | {b_count:>12,} | {s_count:>12,} | {g_count:>16,}")

print()
print("Partition pruning: WHERE chrom='chr17' AND population LIKE 'EUR%'")
print("Scans ~2GB out of 100TB total — 50,000x speedup")`,
    insight: "Genomics IS the original big-data problem — 3 billion base pairs × 2,504 individuals = 7.5 trillion data points. The medallion pattern (raw VCF → QC-filtered → allele frequencies) is how the Broad Institute, Wellcome Sanger, and NIH process petabyte-scale genomics data on S3 + Iceberg.",
  },

  // ============================================================
  // 2. CLINICAL TRIALS DATA LAKE (Life Sciences)
  // ============================================================
  {
    id: "science-clinical-trials",
    step: "2",
    title: "Clinical Trials + FDA FAERS Data Lake (15M reports)",
    subtitle: "Life sciences — pharmacovigilance medallion for regulatory compliance",
    accent: "oklch(0.65 0.16 165)",
    icon: <ShieldCheck className="h-4 w-4" />,
    badge: "Life Sciences · Pharmacovigilance",
    brief: {
      dataset: "FDA FAERS (adverse event reporting system) + ClinicalTrials.gov — ~15M adverse event reports across 20 years, 500k+ clinical trials, 5,000+ drugs. Stored as Iceberg tables partitioned by drug + quarter for regulatory audit.",
      scale: "~15M adverse event reports · 500k+ trials · 5,000+ drugs · 20-year history · ~2TB Parquet",
      why: "Pharmacovigilance IS the canonical regulated-lakehouse use case — every adverse event must be traceable from raw FDA XML (Bronze) through deduplicated + cleansed reports (Silver) to drug safety signals (Gold). OpenLineage tracks the full audit trail for FDA inspections.",
    },
    stats: [
      { label: "Reports", value: "15M" },
      { label: "Trials", value: "500k+" },
      { label: "Drugs", value: "5,000+" },
      { label: "Years", value: "20" },
    ],
    tools: ["Apache Iceberg", "Apache Spark", "Trino", "dbt", "Great Expectations", "OpenLineage", "S3"],
    codeTabs: [
      {
        lang: "scala",
        filename: "PharmacovigilanceMedallion.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

// FDA FAERS medallion — Bronze→Silver→Gold for pharmacovigilance
val spark = SparkSession.builder()
  .config("spark.sql.catalog.iceberg", "org.apache.iceberg.spark.SparkCatalog")
  .getOrCreate()

// Bronze: raw FDA XML (parsed into structured rows)
val bronze = spark.read.format("xml")
  .option("rowTag", "safetyreport")
  .load("s3://faers-bronze/xml/*/")
  .selectExpr(
    "safetyreportid as report_id",
    "receivedate as receive_date",
    "patient.drug[*].medicinalproduct as drug_names",
    "patient.reaction[*].reactionmeddrapt as adverse_reactions",
    "primarysourcecountry as country",
    "serious as is_serious"
  )
bronze.writeTo("iceberg.bronze.faers_raw")
  .partitionedBy("quarter(receive_date)").createOrReplace()

// Silver: deduplicate by report_id (FDA re-submits corrected reports)
val silver = spark.table("iceberg.bronze.faers_raw")
  .withColumn("rn", row_number().over(
    Window.partitionBy(\$"report_id").orderBy(desc("receive_date"))))
  .filter(\$"rn" === 1).drop("rn")
  .filter(\$"drug_names".isNotNull)
silver.writeTo("iceberg.silver.faers_cleansed")
  .merge(\$"report_id" === silver("report_id")).execute()

// Gold: drug safety signals (proportional reporting ratio)
val gold = spark.table("iceberg.silver.faers_cleansed")
  .selectExpr("explode(drug_names) as drug", "explode(adverse_reactions) as reaction",
              "receive_date", "is_serious")
  .groupBy(\$"drug", \$"reaction")
  .agg(
    count("*").as("n_reports"),
    sum(when(\$"is_serious" === "1", 1).otherwise(0)).as("n_serious"),
    countDistinct("receive_date").as("n_quarters")
  )
  .withColumn("serious_rate", \$"n_serious" / \$"n_reports")
gold.writeTo("iceberg.gold.drug_safety_signals")
  .partitionedBy("drug").createOrReplace()

// Query: find drugs with elevated serious-report rates
spark.sql("""
  SELECT drug, reaction, n_reports, serious_rate
  FROM iceberg.gold.drug_safety_signals
  WHERE n_reports > 100 AND serious_rate > 0.5
  ORDER BY serious_rate DESC LIMIT 20
""").show()`,
      },
      {
        lang: "rust",
        filename: "clinical_trials_medallion.rs",
        code: `use iceberg_rust::catalog::glue::GlueCatalog;

// Rust pharmacovigilance reader — reads drug safety signals from Gold tier.
// Use case: drug safety alerting service that monitors new adverse event reports.

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let catalog = GlueCatalog::new("pharmacovigilance_warehouse").build()?;
    let signals = catalog.load("gold.drug_safety_signals")?;

    // Find drugs with elevated serious-report rates
    let batch = signals.scan()
        .with_filter("n_reports > 100 AND serious_rate > 0.5")
        .to_arrow().await?;

    println!("{} elevated safety signals detected", batch.num_rows());
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "clinical_trials_medallion.go",
        code: `package main

import (
    "context"
    "fmt"

    "github.com/apache/iceberg-go/api"
)

// Go pharmacovigilance — Cloud Run function for drug safety alerts.
func main() {
    ctx := context.Background()
    catalog, _ := api.NewGlueCatalog(ctx, "pharmacovigilance_warehouse",
        "s3://pharma-iceberg/")
    table, _ := catalog.LoadTable(ctx, "gold.drug_safety_signals")
    scan := table.Scan().WithFilter("n_reports > 100 AND serious_rate > 0.5")
    iter, _ := scan.ToArrowIterator(ctx)
    for rec, err := iter.Next(); err == nil; rec, err = iter.Next() {
        fmt.Printf("Drug: %s, Reaction: %s, Reports: %d, Serious: %.1f%%\\n",
            rec.GetString(0, "drug"),
            rec.GetString(0, "reaction"),
            rec.GetInt64(0, "n_reports"),
            rec.GetFloat64(0, "serious_rate") * 100)
    }
}`,
      },
      {
        lang: "elixir",
        filename: "clinical_trials_medallion.ex",
        code: `defmodule Pharmacovigilance.AlertService do
  @moduledoc """
  Phoenix LiveView dashboard for drug safety monitoring.
  Polls the Gold tier every 5 min for new adverse event signals.
  """
  use GenServer
  alias Explorer.DataFrame, as: DF

  defstruct [:last_run]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    send(self(), :check_signals)
    {:ok, %__MODULE__{last_run: nil}}
  end

  @impl true
  def handle_info(:check_signals, state) do
    {:ok, df} = Explorer.Iceberg.scan("gold.drug_safety_signals",
      filters: ["n_reports > 100", "serious_rate > 0.5"])

    alerts = DF.to_rows(df)
    Enum.each(alerts, fn alert ->
      Phoenix.PubSub.broadcast(ModernDataSci.PubSub, "pharma:alerts",
        {:safety_alert, alert["drug"], alert["reaction"], alert["serious_rate"]})
    end)

    Process.send_after(self(), :check_signals, 5 * 60_000)
    {:noreply, %{state | last_run: DateTime.utc_now()}}
  end
end`,
      },
      {
        lang: "zig",
        filename: "clinical_trials_medallion.zig",
        code: `const std = @import("std");
const iceberg = @import("iceberg-zig");

// Zig pharmacovigilance — sub-ms drug safety signal queries.
// Use case: real-time FDA compliance monitoring system.

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var catalog = try iceberg.Catalog.glue(allocator, .{
        .database = "pharmacovigilance_warehouse",
        .warehouse = "s3://pharma-iceberg/",
    });
    defer catalog.deinit();

    var table = try catalog.loadTable(allocator, "gold.drug_safety_signals");
    defer table.deinit();

    var scan = try table.scan(allocator, .{
        .filter = "n_reports > 100 AND serious_rate > 0.5",
        .selected_fields = &.{ "drug", "reaction", "n_reports", "serious_rate" },
    });
    defer scan.deinit();

    while (try scan.next()) |batch| {
        const drugs = batch.get_string_col("drug");
        const reactions = batch.get_string_col("reaction");
        const rates = batch.get_f64_col("serious_rate");
        for (drugs, reactions, rates, 0..) |drug, reaction, rate, i| {
            _ = i;
            std.debug.print("ALERT: {s} + {s} = {d:.1f}% serious\\n",
                .{ drug, reaction, rate * 100 });
        }
    }
}`,
      },
    ],
    runnablePython: `# Clinical trials pharmacovigilance simulation — Pyodide
import random
from collections import defaultdict

print("=== FDA FAERS Pharmacovigilance — Bronze → Silver → Gold ===")
print("Raw FDA XML (15M reports) → Deduplicated + QC → Drug safety signals")
print()

# Simulate adverse event reports
random.seed(42)
drugs = ['Aspirin', 'Metformin', 'Atorvastatin', 'Lisinopril', 'Omeprazole']
reactions = ['Nausea', 'Headache', 'Dizziness', 'Rash', 'Fatigue', 'Liver toxicity']
bronze_reports = []

for _ in range(10000):
    report = {
        'report_id': random.randint(1, 15_000_000),
        'drug': random.choice(drugs),
        'reaction': random.choice(reactions),
        'is_serious': random.choices([0, 1], weights=[70, 30])[0],
        'receive_date': f'2024-Q{random.randint(1, 4)}',
    }
    bronze_reports.append(report)

# Silver: deduplicate by report_id (keep latest)
seen = {}
for r in bronze_reports:
    seen[r['report_id']] = r
silver_reports = list(seen.values())

# Gold: aggregate by drug + reaction
gold_signals = defaultdict(lambda: {'n_reports': 0, 'n_serious': 0})
for r in silver_reports:
    key = (r['drug'], r['reaction'])
    gold_signals[key]['n_reports'] += 1
    gold_signals[key]['n_serious'] += r['is_serious']

print(f"Bronze: {len(bronze_reports):,} raw reports")
print(f"Silver: {len(silver_reports):,} deduplicated")
print(f"Gold:   {len(gold_signals)} drug-reaction signals")
print()
print(f"{'Drug':<15} | {'Reaction':<15} | {'Reports':>8} | {'Serious%':>9}")
print("-" * 55)
for (drug, reaction), stats in sorted(gold_signals.items(),
    key=lambda x: -x[1]['n_serious'] / max(x[1]['n_reports'], 1))[:8]:
    serious_rate = stats['n_serious'] / stats['n_reports'] * 100
    print(f"{drug:<15} | {reaction:<15} | {stats['n_reports']:>8} | {serious_rate:>8.1f}%")`,
    insight: "Pharmacovigilance IS the canonical regulated-lakehouse use case — every adverse event must be traceable from raw FDA XML through deduplicated reports to safety signals. The FDA requires full audit trail for inspections; OpenLineage + Iceberg time travel provide it natively. Pharma companies (Pfizer, Novartis, Roche) use this pattern for post-market surveillance.",
  },

  // ============================================================
  // 3. SINGLE-CELL GENOMICS (Life Sciences)
  // ============================================================
  {
    id: "science-single-cell-genomics",
    step: "3",
    title: "Single-cell Genomics on Iceberg (50TB, 10M cells)",
    subtitle: "Life sciences — sparse gene×cell matrix partitioned by tissue + donor",
    accent: "oklch(0.65 0.16 250)",
    icon: <Atom className="h-4 w-4" />,
    badge: "Life Sciences · Single-cell",
    brief: {
      dataset: "Human Cell Atlas + 10x Genomics — 10M+ cells across 200+ tissues, 30k+ genes per cell. ~50TB sparse gene×cell expression matrix stored as Iceberg tables partitioned by tissue + donor.",
      scale: "~50TB · 10M+ cells · 200+ tissues · 30k+ genes per cell · 95% zeros (sparse matrix)",
      why: "Single-cell genomics IS the sparse-matrix lakehouse — 30k genes × 10M cells = 300 billion entries, 95% zeros. The medallion pattern: Bronze (raw 10x BAM files) → Silver (filtered + normalised expression matrix) → Gold (cell-type clusters + tissue-level statistics). Iceberg's column pruning on gene_id is essential for sparse data.",
    },
    stats: [
      { label: "Volume", value: "50 TB" },
      { label: "Cells", value: "10M+" },
      { label: "Genes/cell", value: "30k+" },
      { label: "Sparsity", value: "95% zeros" },
    ],
    tools: ["Apache Iceberg", "Apache Spark", "Scanpy", "AnnData", "Zarr", "Trino", "S3"],
    codeTabs: [
      {
        lang: "scala",
        filename: "SingleCellMedallion.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

// Single-cell genomics on Iceberg — Bronze→Silver→Gold
val spark = SparkSession.builder()
  .config("spark.sql.catalog.iceberg", "org.apache.iceberg.spark.SparkCatalog")
  .getOrCreate()

// Bronze: raw 10x cellranger output (gene×cell counts)
val bronze = spark.read.parquet("s3://scrna-bronze/cellranger/")
  .withColumn("tissue", split(input_file_name(), "/").getItem(4))
  .withColumn("donor_id", split(input_file_name(), "/").getItem(5))

bronze.writeTo("iceberg.bronze.scrna_raw")
  .partitionedBy("tissue", "donor_id").createOrReplace()

// Silver: filter low-quality cells + normalise + log-transform
val silver = spark.table("iceberg.bronze.scrna_raw")
  .filter(\$"n_genes" > 200 && \$"n_genes" < 8000)  // QC: remove outliers
  .filter(\$"percent_mito" < 20)  // remove dying cells
  .withColumn("log_counts", log1p(\$"counts"))
silver.writeTo("iceberg.silver.scrna_filtered")
  .partitionedBy("tissue").createOrReplace()

// Gold: cell-type clusters via Leiden on KNN graph
val gold = spark.table("iceberg.silver.scrna_filtered")
  .groupBy(\$"tissue", \$"cell_type", \$"gene_id")
  .agg(mean("log_counts").as("mean_expression"),
       count("*").as("n_cells"))
gold.writeTo("iceberg.gold.tissue_expression")
  .partitionedBy("tissue", "cell_type").createOrReplace()

// Query: marker genes for T-cells in lung tissue
spark.sql("""
  SELECT gene_id, mean_expression, n_cells
  FROM iceberg.gold.tissue_expression
  WHERE tissue = 'lung' AND cell_type = 'T_cell'
  ORDER BY mean_expression DESC LIMIT 50
""").show()`,
      },
      {
        lang: "rust",
        filename: "single_cell_medallion.rs",
        code: `use iceberg_rust::catalog::glue::GlueCatalog;

// Rust single-cell reader — uses iceberg-rs for sparse matrix queries.
// Use case: Scanpy-like analysis outside Python/Jupyter.

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let catalog = GlueCatalog::new("scrna_warehouse").build()?;
    let gold = catalog.load("gold.tissue_expression")?;

    // Marker genes for T-cells in lung tissue
    let batch = gold.scan()
        .with_filter("tissue = 'lung' AND cell_type = 'T_cell'")
        .to_arrow().await?;

    println!("{} marker genes for T-cells in lung", batch.num_rows());
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "single_cell_medallion.go",
        code: `package main

import (
    "context"
    "fmt"

    "github.com/apache/iceberg-go/api"
)

// Go single-cell genomics — serverless marker gene lookup.
func main() {
    ctx := context.Background()
    catalog, _ := api.NewGlueCatalog(ctx, "scrna_warehouse", "s3://scrna-iceberg/")
    table, _ := catalog.LoadTable(ctx, "gold.tissue_expression")
    scan := table.Scan().WithFilter("tissue = 'lung' AND cell_type = 'T_cell'")
    iter, _ := scan.ToArrowIterator(ctx)
    for rec, err := iter.Next(); err == nil; rec, err = iter.Next() {
        fmt.Printf("Gene: %s, Expression: %.2f, Cells: %d\\n",
            rec.GetString(0, "gene_id"),
            rec.GetFloat64(0, "mean_expression"),
            rec.GetInt64(0, "n_cells"))
    }
}`,
      },
      {
        lang: "elixir",
        filename: "single_cell_medallion.ex",
        code: `defmodule SingleCell.MarkerExplorer do
  @moduledoc """
  Phoenix LiveView for exploring cell-type marker genes across tissues.
  """
  use GenServer
  alias Explorer.DataFrame, as: DF

  defstruct [:cache]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    cache = :ets.new(:marker_cache, [:set, :public, read_concurrency: true])
    {:ok, %__MODULE__{cache: cache}}
  end

  @impl true
  def handle_call({:markers, tissue, cell_type}, _from, state) do
    key = {tissue, cell_type}
    case :ets.lookup(state.cache, key) do
      [{_, cached}] -> {:reply, cached, state}
      _ ->
        {:ok, df} = Explorer.Iceberg.scan("gold.tissue_expression",
          filters: ["tissue = '\#{tissue}'", "cell_type = '\#{cell_type}'"])
        markers = DF.to_rows(df) |> Enum.sort_by(& &1["mean_expression"], :desc) |> Enum.take(50)
        :ets.insert(state.cache, {key, markers})
        {:reply, markers, state}
    end
  end
end`,
      },
      {
        lang: "zig",
        filename: "single_cell_medallion.zig",
        code: `const std = @import("std");
const iceberg = @import("iceberg-zig");

// Zig single-cell — ultra-fast sparse matrix scan.
// Use case: bioinformatics pipeline that needs sub-ms gene queries.

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var catalog = try iceberg.Catalog.glue(allocator, .{
        .database = "scrna_warehouse",
        .warehouse = "s3://scrna-iceberg/",
    });
    defer catalog.deinit();

    var table = try catalog.loadTable(allocator, "gold.tissue_expression");
    defer table.deinit();

    var scan = try table.scan(allocator, .{
        .filter = "tissue = 'lung' AND cell_type = 'T_cell'",
        .selected_fields = &.{ "gene_id", "mean_expression", "n_cells" },
    });
    defer scan.deinit();

    while (try scan.next()) |batch| {
        const genes = batch.get_string_col("gene_id");
        const exprs = batch.get_f64_col("mean_expression");
        for (genes, exprs) |gene, expr| {
            std.debug.print("Gene {s}: expression {d:.2}\\n", .{ gene, expr });
        }
    }
}`,
      },
    ],
    runnablePython: `# Single-cell genomics medallion simulation — Pyodide
import random
from collections import defaultdict

print("=== Single-cell Genomics — Bronze → Silver → Gold ===")
print("Raw 10x (50TB) → QC-filtered cells → Cell-type marker genes")
print()

# Simulate 1000 cells (scaled from 10M) across 5 tissues
random.seed(42)
tissues = ['lung', 'brain', 'heart', 'liver', 'kidney']
cell_types = ['T_cell', 'B_cell', 'Macrophage', 'Fibroblast', 'Endothelial']
genes = [f'GENE{i}' for i in range(1, 301)]

# Bronze: raw counts (sparse, 95% zeros)
bronze_cells = []
for tissue in tissues:
    for _ in range(200):
        cell = {
            'cell_id': random.randint(1, 10_000_000),
            'tissue': tissue,
            'n_genes': random.randint(150, 600),
            'percent_mito': random.uniform(5, 25),
        }
        bronze_cells.append(cell)

# Silver: QC filter
silver_cells = [c for c in bronze_cells
                if 200 <= c['n_genes'] <= 8000 and c['percent_mito'] < 20]

# Gold: marker genes per cell type per tissue
gold_markers = defaultdict(lambda: {'genes': [], 'n_cells': 0})
for c in silver_cells:
    ct = random.choice(cell_types)
    gold_markers[(c['tissue'], ct)]['n_cells'] += 1
    gold_markers[(c['tissue'], ct)]['genes'].append(random.choice(genes))

print(f"Bronze: {len(bronze_cells):,} raw cells")
print(f"Silver: {len(silver_cells):,} QC-filtered ({len(silver_cells)/len(bronze_cells)*100:.0f}%)")
print(f"Gold:   {len(gold_markers)} tissue+celltype combinations")
print()
print("Top marker genes (lung, T_cell):")
lung_t = [g for g in gold_markers[('lung', 'T_cell')]['genes'][:5]]
for i, gene in enumerate(lung_t):
    print(f"  {i+1}. {gene} (expression: {random.uniform(2, 8):.2f})")`,
    insight: "Single-cell genomics IS the sparse-matrix lakehouse — 30k genes × 10M cells = 300 billion entries, 95% zeros. Iceberg's column pruning on gene_id skips the 95% zero entries without scanning. The Human Cell Atlas uses this pattern for the 1B-cell atlas (projected 2030).",
  },

  // ============================================================
  // 4. ENVIRONMENTAL SENSOR NETWORK (Sensors)
  // ============================================================
  {
    id: "science-environmental-sensors",
    step: "4",
    title: "EPA AirNow + NOAA Sensor Network (10TB)",
    subtitle: "Sensors — real-time air quality + weather on the lakehouse",
    accent: "oklch(0.65 0.16 60)",
    icon: <Activity className="h-4 w-4" />,
    badge: "Sensors · Environmental",
    brief: {
      dataset: "EPA AirNow (50k+ air quality sensors) + NOAA ASOS (10k+ weather stations) — PM2.5, O3, CO, NO2, SO2, temperature, humidity, wind. ~10TB, 10-year history. Kafka streaming ingest → Iceberg tables partitioned by sensor_id + hour.",
      scale: "~10TB · 50k+ sensors · 7 metrics · 1Hz sample rate · 10-year history · ~250k events/sec",
      why: "Environmental sensors ARE the IoT lakehouse — 50k sensors × 7 metrics × 1Hz = 250k events/sec. The medallion pattern: Bronze (raw sensor JSON from Kafka) → Silver (validated + calibrated + unit-converted) → Gold (EPA Air Quality Index by region + time). Shows real-time + historical on the same lakehouse.",
    },
    stats: [
      { label: "Volume", value: "10 TB" },
      { label: "Sensors", value: "50k+" },
      { label: "Metrics", value: "7" },
      { label: "Event rate", value: "250k/sec" },
    ],
    tools: ["Apache Kafka", "Apache Flink", "Apache Iceberg", "Apache Spark", "Trino", "Grafana", "S3"],
    codeTabs: [
      {
        lang: "scala",
        filename: "EnvironmentalSensorsMedallion.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._
import org.apache.spark.sql.streaming.Trigger

// Environmental sensor network — Bronze→Silver→Gold
val spark = SparkSession.builder()
  .config("spark.sql.catalog.iceberg", "org.apache.iceberg.spark.SparkCatalog")
  .getOrCreate()

// Bronze: raw sensor events from Kafka (streaming)
val bronze = spark.readStream.format("kafka")
  .option("subscribe", "sensors.airnow,sensors.noaa")
  .option("kafka.bootstrap.servers", "kafka:9092")
  .load()
  .selectExpr("CAST(value AS STRING) as json", "topic", "timestamp as kafka_ts")
  .selectExpr(
    "json:payload.sensor_id as sensor_id",
    "json:payload.metric as metric",
    "json:payload.value as raw_value",
    "json:payload.unit as unit",
    "json:payload.ts as sensor_ts",
    "topic as source",
    "kafka_ts"
  )
bronze.writeStream.format("iceberg")
  .toTable("iceberg.bronze.sensor_raw")
  .trigger(Trigger.ProcessingTime("60 seconds"))
  .option("checkpointLocation", "s3://cp/sensor-bronze/").start()

// Silver: validate + calibrate + unit-convert
val silver = spark.table("iceberg.bronze.sensor_raw")
  .filter(\$"raw_value".isNotNull && \$"raw_value" > 0)
  .join(spark.table("ref.sensor_calibration"), Seq("sensor_id"), "left")
  .withColumn("calibrated_value", \$"raw_value" * \$"calibration_factor" + \$"offset")
  .withColumn("value_standard", when(\$"unit" === "ppb", \$"calibrated_value" / 1000)
              .otherwise(\$"calibrated_value"))  // convert ppb → ppm
silver.writeTo("iceberg.silver.sensor_calibrated")
  .merge(\$"sensor_id" === silver("sensor_id") && \$"sensor_ts" === silver("sensor_ts"))
  .execute()

// Gold: EPA Air Quality Index by region + hour
val gold = spark.table("iceberg.silver.sensor_calibrated")
  .join(spark.table("ref.sensor_regions"), Seq("sensor_id"), "left")
  .groupBy(\$"region", window(\$"sensor_ts", "1 hour"), \$"metric")
  .agg(
    avg("value_standard").as("avg_value"),
    max("value_standard").as("max_value"),
    count("*").as("n_readings")
  )
  .withColumn("aqi", when(\$"metric" === "pm25" && \$"avg_value" > 35, lit("Unhealthy"))
              .when(\$"metric" === "pm25" && \$"avg_value" > 12, lit("Moderate"))
              .otherwise(lit("Good")))
gold.writeTo("iceberg.gold.aqi_by_region")
  .partitionedBy("region").createOrReplace()`,
      },
      {
        lang: "rust",
        filename: "environmental_sensors_medallion.rs",
        code: `use iceberg_rust::catalog::glue::GlueCatalog;

// Rust sensor reader — real-time AQI lookup.
// Use case: Grafana plugin that reads the Gold tier every 60s.

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let catalog = GlueCatalog::new("sensors_warehouse").build()?;
    let aqi = catalog.load("gold.aqi_by_region")?;

    // Latest AQI for all regions
    let batch = aqi.scan()
        .with_filter("sensor_ts >= now() - interval '1 hour'")
        .to_arrow().await?;

    println!("{} region AQI readings in last hour", batch.num_rows());
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "environmental_sensors_medallion.go",
        code: `package main

import (
    "context"
    "fmt"

    "github.com/apache/iceberg-go/api"
)

// Go environmental sensors — Cloud Run function for AQI alerts.
func main() {
    ctx := context.Background()
    catalog, _ := api.NewGlueCatalog(ctx, "sensors_warehouse", "s3://sensors-iceberg/")
    table, _ := catalog.LoadTable(ctx, "gold.aqi_by_region")
    scan := table.Scan().WithFilter("aqi = 'Unhealthy' AND sensor_ts >= now() - interval '1 hour'")
    iter, _ := scan.ToArrowIterator(ctx)
    for rec, err := iter.Next(); err == nil; rec, err = iter.Next() {
        fmt.Printf("ALERT: Region %s AQI=Unhealthy (PM2.5 avg=%.1f)\\n",
            rec.GetString(0, "region"),
            rec.GetFloat64(0, "avg_value"))
    }
}`,
      },
      {
        lang: "elixir",
        filename: "environmental_sensors_medallion.ex",
        code: `defmodule Environmental.AQIDashboard do
  @moduledoc """
  Phoenix LiveView dashboard for real-time air quality monitoring.
  Polls the Gold tier every 60 seconds, broadcasts to all connected dashboards.
  """
  use GenServer
  alias Explorer.DataFrame, as: DF

  defstruct [:last_run]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    send(self(), :refresh)
    {:ok, %__MODULE__{last_run: nil}}
  end

  @impl true
  def handle_info(:refresh, state) do
    {:ok, df} = Explorer.Iceberg.scan("gold.aqi_by_region",
      filters: ["sensor_ts >= now() - interval '1 hour'"])
    aqi_data = DF.to_rows(df)

    Phoenix.PubSub.broadcast(ModernDataSci.PubSub, "sensors:aqi",
      {:aqi_update, aqi_data})

    # Alert on unhealthy readings
    Enum.each(aqi_data, fn row ->
      if row["aqi"] == "Unhealthy" do
        Phoenix.PubSub.broadcast(ModernDataSci.PubSub, "sensors:alerts",
          {:aqi_alert, row["region"], row["avg_value"]})
      end
    end)

    Process.send_after(self(), :refresh, 60_000)
    {:noreply, %{state | last_run: DateTime.utc_now()}}
  end
end`,
      },
      {
        lang: "zig",
        filename: "environmental_sensors_medallion.zig",
        code: `const std = @import("std");
const iceberg = @import("iceberg-zig");

// Zig sensor reader — sub-ms AQI queries for real-time alerting.
// Use case: environmental monitoring system that alerts within 1ms
// of a sensor crossing the unhealthy threshold.

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var catalog = try iceberg.Catalog.glue(allocator, .{
        .database = "sensors_warehouse",
        .warehouse = "s3://sensors-iceberg/",
    });
    defer catalog.deinit();

    var table = try catalog.loadTable(allocator, "gold.aqi_by_region");
    defer table.deinit();

    // Scan for unhealthy readings in the last hour
    var scan = try table.scan(allocator, .{
        .filter = "aqi = 'Unhealthy' AND sensor_ts >= now() - interval '1 hour'",
        .selected_fields = &.{ "region", "avg_value", "max_value", "n_readings" },
    });
    defer scan.deinit();

    while (try scan.next()) |batch| {
        const regions = batch.get_string_col("region");
        const values = batch.get_f64_col("avg_value");
        for (regions, values) |region, value| {
            std.debug.print("ALERT: {s} PM2.5 = {d:.1} (Unhealthy)\\n", .{ region, value });
        }
    }
}`,
      },
    ],
    runnablePython: `# Environmental sensors medallion simulation — Pyodide
import random
from collections import defaultdict

print("=== EPA AirNow + NOAA Sensor Network — Bronze → Silver → Gold ===")
print("50k sensors × 7 metrics × 1Hz = 250k events/sec → Kafka → Iceberg")
print()

# Simulate 1 hour of sensor data (scaled from 50k sensors)
random.seed(42)
regions = ['Northeast', 'Midwest', 'South', 'West', 'Pacific']
metrics = ['pm25', 'o3', 'co', 'no2', 'so2', 'temp', 'humidity']

# Bronze: raw sensor readings
bronze_readings = []
for _ in range(10000):
    reading = {
        'sensor_id': random.randint(1, 50000),
        'metric': random.choice(metrics),
        'raw_value': max(0, random.gauss(15, 10)),
        'unit': random.choice(['ppb', 'ppm', 'ugm3']),
        'region': random.choice(regions),
    }
    bronze_readings.append(reading)

# Silver: calibrate + filter + unit-convert
calibration = {r: random.uniform(0.95, 1.05) for r in regions}
silver_readings = []
for r in bronze_readings:
    if r['raw_value'] <= 0: continue
    r['calibrated'] = r['raw_value'] * calibration[r['region']]
    if r['unit'] == 'ppb':
        r['value_standard'] = r['calibrated'] / 1000  # → ppm
    else:
        r['value_standard'] = r['calibrated']
    silver_readings.append(r)

# Gold: AQI by region
gold_aqi = defaultdict(lambda: defaultdict(list))
for r in silver_readings:
    gold_aqi[r['region']][r['metric']].append(r['value_standard'])

print(f"Bronze: {len(bronze_readings):,} raw readings")
print(f"Silver: {len(silver_readings):,} calibrated ({len(silver_readings)/len(bronze_readings)*100:.0f}%)")
print(f"Gold:   {len(gold_aqi)} regions × {len(metrics)} metrics")
print()
print(f"{'Region':<12} | {'PM2.5 avg':>10} | {'AQI Level':>12}")
print("-" * 40)
for region in regions:
    pm25_vals = gold_aqi[region].get('pm25', [0])
    avg_pm25 = sum(pm25_vals) / len(pm25_vals) if pm25_vals else 0
    if avg_pm25 > 35: aqi = 'Unhealthy'
    elif avg_pm25 > 12: aqi = 'Moderate'
    else: aqi = 'Good'
    print(f"{region:<12} | {avg_pm25:>9.1f}  | {aqi:>12}")`,
    insight: "Environmental sensors ARE the IoT lakehouse — 50k sensors × 7 metrics × 1Hz = 250k events/sec. The medallion pattern (raw JSON → calibrated + unit-converted → EPA AQI by region) is how the EPA and NOAA process real-time environmental data. Kafka → Flink → Iceberg is the standard streaming-to-lakehouse pipeline.",
  },

  // ============================================================
  // 5. LHC PARTICLE PHYSICS (Physics)
  // ============================================================
  {
    id: "science-lhc-particle-physics",
    step: "5",
    title: "CERN LHC Open Data on Iceberg (1PB)",
    subtitle: "Physics — CMS/ATLAS collision data with medallion trigger pipeline",
    accent: "oklch(0.65 0.16 200)",
    icon: <Atom className="h-4 w-4" />,
    badge: "Physics · Particle",
    brief: {
      dataset: "CERN CMS/ATLAS Open Data — 10B+ proton-proton collision events at 13 TeV. ~1PB after trigger + reconstruction. Free download from opendata.cern.ch. Stored as Iceberg tables partitioned by run + luminosity block.",
      scale: "~1PB · 10B+ events · 100M+ detector channels · 40MHz crossing rate · 10-year history",
      why: "CERN's trigger pipeline IS the original medallion architecture — 40TB/s raw → 100GB/s L1 trigger → 1GB/s HLT → 1PB/year stored. The lakehouse pattern maps perfectly: Bronze (raw detector data) → Silver (reconstructed physics objects) → Gold (analysis-level ntuples). This is the extreme-scale proof that the lakehouse pattern works for petabyte science.",
    },
    stats: [
      { label: "Volume", value: "1 PB" },
      { label: "Events", value: "10B+" },
      { label: "Channels", value: "100M+" },
      { label: "Crossing rate", value: "40 MHz" },
    ],
    tools: ["Apache Iceberg", "Apache Spark", "ROOT", "Trino", "CERN EOS", "XRootD", "S3"],
    codeTabs: [
      {
        lang: "scala",
        filename: "LHCMedallion.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

// CERN LHC on Iceberg — the ultimate medallion at petabyte scale
val spark = SparkSession.builder()
  .config("spark.sql.catalog.iceberg", "org.apache.iceberg.spark.SparkCatalog")
  .getOrCreate()

// Bronze: raw detector data (after HLT — ~1GB/s, already heavily filtered)
val bronze = spark.read.format("root").option("tree", "Events")
  .load("s3://cms-bronze/Run2024D/HLTPhysics/*/")
  .selectExpr(
    "event_id as event_id", "run_number as run", "lumi_block as lumi",
    "explode(track_pt) as track_pt", "explode(track_eta) as track_eta",
    "explode(jet_pt) as jet_pt", "explode(jet_eta) as jet_eta",
    "missing_et as met"
  )
bronze.writeTo("iceberg.bronze.cms_events_raw")
  .partitionedBy("run", "lumi").createOrReplace()

// Silver: reconstructed physics objects (filtered for quality)
val silver = spark.table("iceberg.bronze.cms_events_raw")
  .filter(\$"track_pt" > 0.5 && \$"jet_pt" > 30)  // physics quality cuts
  .withColumn("n_tracks", size(\$"track_pt"))
  .withColumn("n_jets", size(\$"jet_pt"))
  .filter(\$"n_tracks" > 0 && \$"n_jets" > 0)
silver.writeTo("iceberg.silver.cms_physics_objects")
  .partitionedBy("run").createOrReplace()

// Gold: analysis-level ntuples (Higgs→bb search)
val gold = spark.table("iceberg.silver.cms_physics_objects")
  .filter(\$"jet_pt" > 25 && abs(\$"jet_eta") < 2.4)
  .groupBy(\$"run", \$"lumi")
  .agg(
    count("*").as("n_events"),
    mean("met").as("avg_met"),
    max("jet_pt").as("max_jet_pt")
  )
gold.writeTo("iceberg.gold.higgs_bb_search")
  .partitionedBy("run").createOrReplace()

// Query: event count per run (luminosity monitoring)
spark.sql("""
  SELECT run, sum(n_events) as total_events
  FROM iceberg.gold.higgs_bb_search
  WHERE run BETWEEN 375000 AND 376000
  GROUP BY run ORDER BY run
""").show()`,
      },
      {
        lang: "rust",
        filename: "lhc_medallion.rs",
        code: `use iceberg_rust::catalog::glue::GlueCatalog;

// Rust LHC reader — uses iceberg-rs for ROOT-free physics analysis.
// Use case: physics analysis outside CERN's ROOT framework.

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let catalog = GlueCatalog::new("cms_warehouse").build()?;
    let gold = catalog.load("gold.higgs_bb_search")?;

    // Events per run for luminosity monitoring
    let batch = gold.scan()
        .with_filter("run BETWEEN 375000 AND 376000")
        .to_arrow().await?;

    println!("{} runs in range 375000-376000", batch.num_rows());
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "lhc_medallion.go",
        code: `package main

import (
    "context"
    "fmt"

    "github.com/apache/iceberg-go/api"
)

// Go LHC reader — serverless physics analysis function.
func main() {
    ctx := context.Background()
    catalog, _ := api.NewGlueCatalog(ctx, "cms_warehouse", "s3://cms-iceberg/")
    table, _ := catalog.LoadTable(ctx, "gold.higgs_bb_search")
    scan := table.Scan().WithFilter("run BETWEEN 375000 AND 376000")
    iter, _ := scan.ToArrowIterator(ctx)
    for rec, err := iter.Next(); err == nil; rec, err = iter.Next() {
        fmt.Printf("Run %d: %d events, avg MET=%.1f, max jet pt=%.1f\\n",
            rec.GetInt64(0, "run"),
            rec.GetInt64(0, "n_events"),
            rec.GetFloat64(0, "avg_met"),
            rec.GetFloat64(0, "max_jet_pt"))
    }
}`,
      },
      {
        lang: "elixir",
        filename: "lhc_medallion.ex",
        code: `defmodule LHC.LuminosityMonitor do
  @moduledoc """
  Phoenix LiveView for monitoring LHC run luminosity from the Gold tier.
  """
  use GenServer
  alias Explorer.DataFrame, as: DF

  defstruct [:last_run]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    send(self(), :refresh)
    {:ok, %__MODULE__{last_run: nil}}
  end

  @impl true
  def handle_info(:refresh, state) do
    {:ok, df} = Explorer.Iceberg.scan("gold.higgs_bb_search",
      filters: ["run BETWEEN 375000 AND 376000"])
    runs = DF.to_rows(df) |> Enum.sort_by(& &1["run"])
    Phoenix.PubSub.broadcast(ModernDataSci.PubSub, "lhc:luminosity",
      {:luminosity_update, runs})
    Process.send_after(self(), :refresh, 300_000)  # 5-min refresh
    {:noreply, %{state | last_run: DateTime.utc_now()}}
  end
end`,
      },
      {
        lang: "zig",
        filename: "lhc_medallion.zig",
        code: `const std = @import("std");
const iceberg = @import("iceberg-zig");

// Zig LHC reader — fastest possible physics analysis on petabyte-scale data.
// Use case: real-time trigger monitoring that flags anomalous runs within 1ms.

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var catalog = try iceberg.Catalog.glue(allocator, .{
        .database = "cms_warehouse",
        .warehouse = "s3://cms-iceberg/",
    });
    defer catalog.deinit();

    var table = try catalog.loadTable(allocator, "gold.higgs_bb_search");
    defer table.deinit();

    var scan = try table.scan(allocator, .{
        .filter = "run BETWEEN 375000 AND 376000",
        .selected_fields = &.{ "run", "n_events", "avg_met", "max_jet_pt" },
    });
    defer scan.deinit();

    while (try scan.next()) |batch| {
        const runs = batch.get_u64_col("run");
        const events = batch.get_u64_col("n_events");
        const mets = batch.get_f64_col("avg_met");
        for (runs, events, mets, 0..) |run, n, met, i| {
            _ = i;
            std.debug.print("Run {d}: {d} events, avg MET {d:.1}\\n", .{ run, n, met });
        }
    }
}`,
      },
    ],
    runnablePython: `# LHC particle physics medallion simulation — Pyodide
import random
from collections import defaultdict

print("=== CERN LHC on Iceberg — Bronze → Silver → Gold ===")
print("40TB/s raw → 100GB/s L1 trigger → 1GB/s HLT → 1PB/year stored")
print()

# Simulate collision events (scaled from 10B to 10000)
random.seed(42)
runs = list(range(375000, 376010))
bronze_events = []

for _ in range(10000):
    event = {
        'event_id': random.randint(1, 10_000_000_000),
        'run': random.choice(runs),
        'lumi_block': random.randint(1, 500),
        'n_tracks': random.randint(0, 50),
        'n_jets': random.randint(0, 10),
        'jet_pt': max(0, random.gauss(40, 20)),
        'jet_eta': random.gauss(0, 1.5),
        'met': max(0, random.gauss(30, 15)),
    }
    bronze_events.append(event)

# Silver: physics quality cuts
silver_events = [e for e in bronze_events
                 if e['jet_pt'] > 30 and abs(e['jet_eta']) < 2.4
                 and e['n_tracks'] > 0 and e['n_jets'] > 0]

# Gold: aggregate per run
gold_runs = defaultdict(lambda: {'n_events': 0, 'met_sum': 0, 'max_jet_pt': 0})
for e in silver_events:
    g = gold_runs[e['run']]
    g['n_events'] += 1
    g['met_sum'] += e['met']
    g['max_jet_pt'] = max(g['max_jet_pt'], e['jet_pt'])

print(f"Bronze: {len(bronze_events):,} raw events")
print(f"Silver: {len(silver_events):,} physics-quality ({len(silver_events)/len(bronze_events)*100:.0f}%)")
print(f"Gold:   {len(gold_runs)} runs aggregated")
print()
print(f"{'Run':>8} | {'Events':>8} | {'Avg MET':>8} | {'Max Jet Pt':>10}")
print("-" * 45)
for run in list(sorted(gold_runs.keys()))[:10]:
    g = gold_runs[run]
    print(f"{run:>8} | {g['n_events']:>8} | {g['met_sum']/g['n_events']:>7.1f} | {g['max_jet_pt']:>9.1f} GeV")
print(f"... ({len(gold_runs) - 10} more runs)")

print()
print("CERN's trigger pipeline IS the original medallion:")
print("  Bronze = raw detector (40TB/s)")
print("  Silver = L1 trigger + HLT (100GB/s → 1GB/s)")
print("  Gold = analysis ntuples (1PB/year)")`,
    insight: "CERN's trigger pipeline IS the original medallion architecture — 40TB/s raw → 100GB/s L1 → 1GB/s HLT → 1PB/year stored. The data reduction ratio (40,000:1) is the most extreme in any industry. CERN pioneered the Bronze→Silver→Gold pattern decades before Databricks named it 'medallion'. The LHC Open Data portal makes this petabyte-scale physics data freely available on S3+Iceberg.",
  },

  // ============================================================
  // 6. COMPUTATIONAL MATHEMATICS (Mathematics)
  // ============================================================
  {
    id: "science-mathematics-oeis",
    step: "6",
    title: "OEIS + LMFDB on Iceberg (370k sequences)",
    subtitle: "Mathematics — integer sequences + L-functions on the lakehouse",
    accent: "oklch(0.65 0.16 320)",
    icon: <Layers className="h-4 w-4" />,
    badge: "Mathematics",
    brief: {
      dataset: "OEIS (Online Encyclopedia of Integer Sequences) — 370k+ sequences with 5M+ terms total. LMFDB (L-functions and Modular Forms Database) — 1M+ L-functions. ~5GB total, stored as Iceberg tables partitioned by sequence type + modular form degree.",
      scale: "~370k sequences · 5M+ terms · 1M+ L-functions · 50-year history · ~5GB Parquet",
      why: "Mathematics IS the purest lakehouse — every sequence has a Bronze (raw terms), Silver (computed properties like growth rate, generating function), Gold (pattern discovery + conjecture verification) tier. Shows the medallion pattern applied to pure mathematics, proving its universality beyond business/physics data.",
    },
    stats: [
      { label: "Sequences", value: "370k+" },
      { label: "Terms", value: "5M+" },
      { label: "L-functions", value: "1M+" },
      { label: "History", value: "50 years" },
    ],
    tools: ["Apache Iceberg", "Apache Spark", "SageMath", "Trino", "Pari/GP", "S3"],
    codeTabs: [
      {
        lang: "scala",
        filename: "MathematicsMedallion.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

// OEIS + LMFDB on Iceberg — Bronze→Silver→Gold for pure mathematics
val spark = SparkSession.builder()
  .config("spark.sql.catalog.iceberg", "org.apache.iceberg.spark.SparkCatalog")
  .getOrCreate()

// Bronze: raw OEIS sequence data (A-number, terms, description)
val bronze = spark.read.format("csv").option("delimiter", "\\t")
  .schema("oeis_id STRING, terms STRING, description STRING, author STRING, date STRING")
  .load("s3://math-bronze/oeis/")
bronze.writeTo("iceberg.bronze.oeis_raw").createOrReplace()

// Silver: compute properties (growth rate, generating function, OEIS cross-refs)
val silver = bronze
  .withColumn("term_array", split(\$"terms", ","))
  .withColumn("n_terms", size(\$"term_array"))
  .withColumn("growth_rate",
    when(size(\$"term_array") > 10,
      log(lit(\$"term_array"(10).cast("double")) / lit(\$"term_array"(5).cast("double")))))
  .withColumn("is_monotonic",
    when(\$"term_array".cast("array<double>").isNotNull,
      size(array_distinct(\$"term_array")) === size(\$"term_array")))
silver.writeTo("iceberg.silver.oeis_properties").createOrReplace()

// Gold: pattern discovery (sequences with same growth rate → conjecture candidates)
val gold = spark.table("iceberg.silver.oeis_properties")
  .filter(\$"growth_rate".isNotNull)
  .groupBy(round(\$"growth_rate", 2).as("growth_bucket"))
  .agg(
    collect_set("oeis_id").as("sequences"),
    count("*").as("n_sequences")
  )
  .filter(size(\$"sequences") > 1)  // groups of sequences with same growth rate
gold.writeTo("iceberg.gold.growth_clusters").createOrReplace()

// Query: find sequences with similar growth rates (conjecture candidates)
spark.sql("""
  SELECT growth_bucket, n_sequences, sequences
  FROM iceberg.gold.growth_clusters
  WHERE n_sequences > 5
  ORDER BY n_sequences DESC LIMIT 10
""").show()`,
      },
      {
        lang: "rust",
        filename: "mathematics_medallion.rs",
        code: `use iceberg_rust::catalog::glue::GlueCatalog;

// Rust mathematics reader — uses iceberg-rs for OEIS sequence queries.
// Use case: SageMath plugin that reads computed properties from the lakehouse.

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let catalog = GlueCatalog::new("math_warehouse").build()?;

    // Read OEIS properties (Silver tier) for a specific sequence
    let silver = catalog.load("silver.oeis_properties")?;
    let batch = silver.scan()
        .with_filter("oeis_id = 'A000045'")  // Fibonacci sequence
        .to_arrow().await?;

    println!("Found {} property rows for A000045 (Fibonacci)", batch.num_rows());
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "mathematics_medallion.go",
        code: `package main

import (
    "context"
    "fmt"

    "github.com/apache/iceberg-go/api"
)

// Go mathematics reader — serverless OEIS lookup.
func main() {
    ctx := context.Background()
    catalog, _ := api.NewGlueCatalog(ctx, "math_warehouse", "s3://math-iceberg/")
    table, _ := catalog.LoadTable(ctx, "silver.oeis_properties")
    scan := table.Scan().WithFilter("oeis_id = 'A000045'")
    iter, _ := scan.ToArrowIterator(ctx)
    for rec, err := iter.Next(); err == nil; rec, err = iter.Next() {
        fmt.Printf("Sequence %s: %d terms, growth rate %.4f\\n",
            rec.GetString(0, "oeis_id"),
            rec.GetInt64(0, "n_terms"),
            rec.GetFloat64(0, "growth_rate"))
    }
}`,
      },
      {
        lang: "elixir",
        filename: "mathematics_medallion.ex",
        code: `defmodule Mathematics.SequenceExplorer do
  @moduledoc """
  Phoenix LiveView for exploring OEIS sequences and their computed properties.
  """
  use GenServer
  alias Explorer.DataFrame, as: DF

  defstruct [:cache]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    cache = :ets.new(:oeis_cache, [:set, :public, read_concurrency: true])
    {:ok, %__MODULE__{cache: cache}}
  end

  @impl true
  def handle_call({:lookup, oeis_id}, _from, state) do
    case :ets.lookup(state.cache, oeis_id) do
      [{_, cached}] -> {:reply, cached, state}
      _ ->
        {:ok, df} = Explorer.Iceberg.scan("silver.oeis_properties",
          filters: ["oeis_id = '\#{oeis_id}'"])
        props = DF.to_rows(df) |> Enum.at(0)
        :ets.insert(state.cache, {oeis_id, props})
        {:reply, props, state}
    end
  end
end`,
      },
      {
        lang: "zig",
        filename: "mathematics_medallion.zig",
        code: `const std = @import("std");
const iceberg = @import("iceberg-zig");

// Zig mathematics reader — sub-ms OEIS sequence property lookups.
// Use case: Pari/GP plugin for conjecture verification at scale.

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var catalog = try iceberg.Catalog.glue(allocator, .{
        .database = "math_warehouse",
        .warehouse = "s3://math-iceberg/",
    });
    defer catalog.deinit();

    // Growth clusters (Gold tier) — sequences with similar growth rates
    var table = try catalog.loadTable(allocator, "gold.growth_clusters");
    defer table.deinit();

    var scan = try table.scan(allocator, .{
        .filter = "n_sequences > 5",
        .selected_fields = &.{ "growth_bucket", "n_sequences", "sequences" },
    });
    defer scan.deinit();

    while (try scan.next()) |batch| {
        const buckets = batch.get_f64_col("growth_bucket");
        const counts = batch.get_u64_col("n_sequences");
        for (buckets, counts) |bucket, count| {
            std.debug.print("Growth rate {d:.2}: {d} sequences (conjecture candidates)\\n",
                .{ bucket, count });
        }
    }
}`,
      },
    ],
    runnablePython: `# Computational mathematics medallion simulation — Pyodide
import random
from collections import defaultdict

print("=== OEIS + LMFDB on Iceberg — Bronze → Silver → Gold ===")
print("Raw sequence terms → Computed properties → Pattern discovery")
print()

# Simulate OEIS sequences (scaled from 370k to 1000)
random.seed(42)

# Famous sequences for reference
known_sequences = {
    'A000045': [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610],
    'A000040': [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53],
    'A000079': [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192],
    'A000142': [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800],
}

# Bronze: raw sequences
bronze = []
for i in range(1000):
    oeis_id = f'A{random.randint(1, 999999):06d}'
    terms = [random.randint(1, 1000) for _ in range(random.randint(5, 20))]
    bronze.append({'oeis_id': oeis_id, 'terms': terms, 'description': f'Sequence {oeis_id}'})

# Add known sequences
for oeis_id, terms in known_sequences.items():
    bronze.append({'oeis_id': oeis_id, 'terms': terms, 'description': f'Known sequence {oeis_id}'})

# Silver: compute growth rate
silver = []
for seq in bronze:
    terms = seq['terms']
    if len(terms) > 5 and terms[5] > 0 and terms[0] > 0:
        import math
        growth = math.log(terms[5] / max(terms[0], 1)) / 5
    else:
        growth = 0
    silver.append({**seq, 'n_terms': len(terms), 'growth_rate': growth})

# Gold: cluster by growth rate
gold_clusters = defaultdict(list)
for seq in silver:
    bucket = round(seq['growth_rate'], 2)
    gold_clusters[bucket].append(seq['oeis_id'])

print(f"Bronze: {len(bronze):,} raw sequences")
print(f"Silver: {len(silver):,} with computed properties")
print(f"Gold:   {len(gold_clusters)} growth-rate clusters")
print()
print("Top clusters (conjecture candidates — sequences with same growth rate):")
sorted_clusters = sorted(gold_clusters.items(), key=lambda x: -len(x[1]))
for bucket, seqs in sorted_clusters[:5]:
    known = [s for s in seqs if s in known_sequences]
    print(f"  Growth {bucket:.2f}: {len(seqs)} sequences" +
          (f" (incl. {', '.join(known)})" if known else ""))

print()
print("Mathematics IS the purest lakehouse:")
print("  Bronze = raw sequence terms (from OEIS)")
print("  Silver = computed properties (growth rate, monotonicity)")
print("  Gold = pattern discovery (conjecture candidates by growth cluster)")`,
    insight: "Mathematics IS the purest lakehouse — every sequence has a Bronze (raw terms), Silver (computed properties like growth rate), Gold (pattern discovery via clustering) tier. OEIS (370k sequences) and LMFDB (1M L-functions) are the canonical pure-math datasets. The medallion pattern applies even here — proving its universality beyond business and physics.",
  },
];
