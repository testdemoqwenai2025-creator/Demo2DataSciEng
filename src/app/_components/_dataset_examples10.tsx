// ============================================================
// Scientific warehouse dataset examples for /bigquery, /redshift, /clickhouse pages
// 6 examples (2 life sciences + 2 physics/earth + 2 sensors) × 5 languages
// Shows how cloud data warehouses + OLAP engines power science workloads
// ============================================================

import type { DatasetExample } from "./dataset-cards";
import {
  Database, Atom, Boxes, Zap, TrendingUp, Activity, Cpu,
  History, Sparkles, Network, ShieldCheck, Layers, Radio,
  Satellite, Microscope, Cpu as CpuIcon, Cloud, Server,
} from "lucide-react";

// ============================================================
// BIGQUERY_SCIENCE_EXAMPLES (2 examples)
// ============================================================

export const BIGQUERY_SCIENCE_EXAMPLES: DatasetExample[] = [
  // ============================================================
  // 1. GENOMICS ON BIGQUERY (Life Sciences)
  // ============================================================
  {
    id: "bigquery-genomics-1000genomes",
    step: "1",
    title: "1000 Genomes Project on BigQuery (~100TB)",
    subtitle: "Life sciences — variant queries on 3 billion SNPs × 3,500 samples",
    accent: "oklch(0.65 0.16 30)",
    icon: <Microscope className="h-4 w-4" />,
    badge: "Life Sciences · Genomics",
    brief: {
      dataset: "1000 Genomes Project Phase 3 release: ~85 million variants × 2,504 samples from 26 populations. BigQuery public dataset genomics_benchmark contains 100TB of variant calls loaded via BigQuery Genomics. SQL queries return allele frequencies for any genomic region in seconds — partitions prune via chromosome + position ranges.",
      scale: "~100TB variant table · 85M variants × 2,504 samples × 26 populations · 22 chromosomes · 3B reference bases",
      why: "BigQuery is the de-facto public genomics warehouse — Google hosts 1000 Genomes, gnomAD, ClinVar, GTEx as public BigQuery datasets. Population-geneticists run GWAS-style allele frequency queries in 5-15 seconds that would take hours on a Spark cluster. BigQuery's columnar storage scans only the chrom/pos columns relevant to a region; partitions prune via clustering on chrom+pos. Free tier 1TB/month covers most academic queries.",
    },
    stats: [
      { label: "Table size", value: "~100 TB" },
      { label: "Variants", value: "85 million" },
      { label: "Samples", value: "2,504" },
      { label: "Query time", value: "5-15 sec" },
    ],
    tools: ["Google BigQuery", "BigQuery Genomics", "Variant Transforms", "Hail", "GATK", "PLINK", "Google Genomics Pipelines"],
    codeTabs: [
      {
        lang: "scala",
        filename: "BigQueryGenomics.scala",
        code: `import com.google.cloud.bigquery.BigQuery
import com.google.cloud.bigquery.QueryJobConfiguration
import scala.collection.JavaConverters._

// Query 1000 Genomes allele frequency for a region on chr17 (BRCA1 locus)
// BigQuery public dataset: bigquery-public-data.genomics_benchmark.variant
object GenomicsQueries {
  val sql =
    """
      |SELECT
      |  reference_name AS chrom,
      |  start_position AS pos,
      |  reference_bases AS ref,
      |  alternate_bases  AS alt,
      |  SUM(0) AS count_ref,
      |  COUNT(1) AS total_calls
      |FROM bigquery-public-data.genomics_benchmark.variant
      |WHERE reference_name = '17'
      |  AND start_position BETWEEN 41196311 AND 41277500  -- BRCA1 locus
      |GROUP BY 1, 2, 3, 4
      |ORDER BY 2
    """.stripMargin

  def alleleFreq(bq: BigQuery): Seq[(String, Long, Long, Double)] = {
    val result = bq.query(QueryJobConfiguration.of(sql))
    result.iterate().asScala.map { r =>
      val chrom = r.getString("chrom")
      val pos   = r.getLong("pos")
      val alt   = r.getLong("alt")
      val total = r.getLong("total_calls")
      (chrom, pos, alt, alt.toDouble / total)
    }.toSeq
  }
}
// Clustered table: CREATE TABLE ... CLUSTER BY chrom, pos
// Cost: ~USD 0.05 per query (scans only BRCA1 region partitions)
// Free tier: 1 TB/month scanned — covers ~10,000 such region queries.`,
      },
      {
        lang: "rust",
        filename: "bigquery_genomics_reader.rs",
        code: `use google_cloud_bigquery::client::Client;
use google_cloud_bigquery::query::QueryRequest;

// Rust genomics reader — uses google-cloud-rust-sdk BigQuery client.
// Use case: real-time BRCA1/BRCA2 pathogenicity lookup for a
// clinical genomics report generator.

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new().await?;

    // Allele frequency for chr17 BRCA1 region in 1000 Genomes
    let sql = r#"
        SELECT
          start_position AS pos,
          alternate_bases AS alt,
          COUNT(1) AS total_calls
        FROM bigquery-public-data.genomics_benchmark.variant
        WHERE reference_name = '17'
          AND start_position BETWEEN 41196311 AND 41277500
        GROUP BY 1, 2
        ORDER BY 1
    "#;

    let mut result = client.query(QueryRequest::new(sql)).await?;

    while let Some(row) = result.next_row().await? {
        let pos: i64 = row.get_int64("pos")?;
        let alt: String = row.get_string("alt")?;
        let total: i64 = row.get_int64("total_calls")?;
        println!("chr17:{} alt={} calls={}", pos, alt, total);
    }
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "bigquery_genomics_reader.go",
        code: `package main

import (
    "context"
    "fmt"

    "cloud.google.com/go/bigquery"
    "google.golang.org/api/iterator"
)

// Go genomics reader — BigQuery allele frequency query.
// Use case: Cloud Run function that computes population
// allele frequency for variants called in a patient sample.

func main() {
    ctx := context.Background()
    client, _ := bigquery.NewClient(ctx, "genomics-platform")

    q := client.Query(\`
        SELECT
          start_position AS pos,
          reference_bases AS ref,
          alternate_bases AS alt,
          COUNT(1) AS total_calls
        FROM \` + "\`bigquery-public-data.genomics_benchmark.variant\`" + \`
        WHERE reference_name = '17'
          AND start_position BETWEEN 41196311 AND 41277500
        GROUP BY 1, 2, 3
        ORDER BY 1
    \`)

    it, _ := q.Read(ctx)
    for {
        var row struct {
            Pos   int64
            Ref   string
            Alt   string
            Total int64
        }
        if err := it.Next(&row); err == iterator.Done { break }
        freq := float64(row.Alt == "true") / float64(row.Total)
        fmt.Printf("chr17:%d %s>%s calls=%d freq=%.4f\\n",
            row.Pos, row.Ref, row.Alt, row.Total, freq)
    }
}`,
      },
      {
        lang: "elixir",
        filename: "bigquery_genomics_reader.ex",
        code: `defmodule Genomics.BigQueryAlleleFreq do
  @moduledoc """
  Phoenix LiveView dashboard that queries BigQuery public 1000 Genomes
  dataset for allele frequencies in user-selected genomic regions.
  """
  use Phoenix.LiveView
  alias GoogleApi.BigQuery.V2.Api.Jobs

  def render(assigns) do
    ~H"""
    <div>
      <h3>Allele frequency — chr17:{{@start}}-{{@end}}</h3>
      <table>
        <tr><th>Pos</th><th>Ref</th><th>Alt</th><th>Calls</th><th>Freq</th></tr>
        <%= for v <- @variants do %>
          <tr>
            <td><%= v.pos %></td>
            <td><%= v.ref %></td>
            <td><%= v.alt %></td>
            <td><%= v.calls %></td>
            <td><%= :fwi.format(v.freq, 4) %></td>
          </tr>
        <% end %>
      </table>
    </div>
    """
  end

  def handle_event("query", %{"chrom" => chrom, "start" => start_, "end" => end_}, socket) do
    sql = \"""
      SELECT start_position AS pos,
             reference_bases AS ref,
             alternate_bases AS alt,
             COUNT(1) AS calls
      FROM bigquery-public-data.genomics_benchmark.variant
      WHERE reference_name = '#{chrom}'
        AND start_position BETWEEN #{start_} AND #{end_}
      GROUP BY 1, 2, 3
      ORDER BY 1
    \"""
    {:ok, result} = Jobs.bigquery_jobs_query(
      Connection.get(), "genomics-platform",
      body: %{query: sql, useLegacySql: false})

    variants = Enum.map(result.rows, fn r ->
      total = Enum.at(r.f, 3).v
      %{pos: Enum.at(r.f, 0).v, ref: Enum.at(r.f, 1).v,
        alt: Enum.at(r.f, 2).v, calls: total,
        freq: 1.0 / total}
    end)
    {:noreply, assign(socket, variants: variants)}
  end
end`,
      },
      {
        lang: "zig",
        filename: "bigquery_genomics_reader.zig",
        code: `const std = @import("std");
const bq = @import("bigquery-zig");

// Zig genomics reader — sub-ms allele frequency lookup for a
// patient-sample variant annotation pipeline running on GKE.
// BigQuery REST API client written from scratch in Zig.

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = try bq.Client.init(allocator, .{
        .project = "genomics-platform",
        .credentials_path = "/etc/secrets/bq-sa.json",
    });
    defer client.deinit();

    const sql =
        \\\\SELECT start_position AS pos, reference_bases AS ref,
        \\\\       alternate_bases AS alt, COUNT(1) AS calls
        \\\\FROM bigquery-public-data.genomics_benchmark.variant
        \\\\WHERE reference_name = '17'
        \\\\  AND start_position BETWEEN 41196311 AND 41277500
        \\\\GROUP BY 1, 2, 3
        \\\\ORDER BY 1
    ;

    var result = try client.query(allocator, sql);
    defer result.deinit();

    while (try result.next()) |row| {
        const pos: i64 = row.get_i64("pos");
        const ref: []const u8 = row.get_string("ref");
        const alt: []const u8 = row.get_string("alt");
        const calls: i64 = row.get_i64("calls");
        std.debug.print("chr17:{d} {s}>{s} calls={d}\\n",
            .{ pos, ref, alt, calls });
    }
}`,
      },
    ],
    runnablePython: `# Genomics on BigQuery — 1000 Genomes allele frequency simulation (Pyodide)
import random
from collections import defaultdict

print("=== Genomics on BigQuery — 1000 Genomes allele frequency ===")
print("Public dataset: bigquery-public-data.genomics_benchmark.variant")
print("Table size: ~100 TB · 85M variants × 2,504 samples × 26 populations")
print()

# Simulate variant records for chr17 BRCA1 region (41196311-41277500, ~81kb)
random.seed(42)
chrom = "chr17"
brca1_start = 41_196_311
brca1_end   = 41_277_500

# 1000 Genomes Phase 3: ~85M variants across the genome.
# BRCA1 region: ~1,200 known variants across 2,504 samples.
n_variants_in_region = 1200
samples = [f"sample-{i:04d}" for i in range(2504)]
populations = ["AFR", "AMR", "EUR", "EAS", "SAS", "SAS"]

# Generate synthetic variant records (Bronze-equivalent)
bronze_variants = []
for v in range(n_variants_in_region):
    pos = random.randint(brca1_start, brca1_end)
    ref = random.choice("ACGT")
    alt = random.choice("ACGT")
    sample_id = random.choice(samples)
    population = random.choice(populations)
    genotype = random.choices(["0/0", "0/1", "1/1"], weights=[70, 25, 5])[0]
    bronze_variants.append({
        "chrom": chrom, "pos": pos, "ref": ref, "alt": alt,
        "sample_id": sample_id, "population": population,
        "genotype": genotype,
    })

# BigQuery columnar scan: only fetches chrom/pos/ref/alt/sample_id/population
# Clustering on (chrom, pos) prunes to BRCA1 partition — only 1,200 of 85M variants scanned
print("BigQuery columnar scan:")
print("  Columns selected:   chrom, pos, ref, alt, sample_id, population")
print("  Clustered by:        chrom, pos")
print(f"  BRCA1 region:        {n_variants_in_region:,} variants scanned (of 85M)")
print(f"  Bytes scanned:      ~{n_variants_in_region * 64 / 1e9:.2f} GB (of 100TB)")
print(f"  Cost:                ~USD 0.0001 (free-tier covers this)")
print()

# Aggregate: per-variant allele frequency across populations
variant_freq = defaultdict(lambda: defaultdict(int))
variant_total = defaultdict(int)
for v in bronze_variants:
    key = (v["pos"], v["ref"], v["alt"])
    has_alt = v["genotype"] in ("0/1", "1/1")
    variant_freq[key][v["population"]] += int(has_alt)
    variant_total[key] += 1

print("Allele frequency results (top 10 variants by alt count):")
print(f"{'Pos':<12} | {'Ref':<3} | {'Alt':<3} | {'AFR':<6} | {'AMR':<6} | {'EUR':<6} | {'EAS':<6} | {'SAS':<6} | {'Total':<6}")
print("-" * 75)
sorted_keys = sorted(variant_freq.keys(), key=lambda k: sum(variant_freq[k].values()), reverse=True)[:10]
for key in sorted_keys:
    pos, ref, alt = key
    pop_counts = variant_freq[key]
    total = variant_total[key]
    freq_str = " | ".join(f"{pop_counts.get(p, 0):<6}" for p in populations)
    print(f"{pos:<12} | {ref:<3} | {alt:<3} | {freq_str} | {total:<6}")

print()
print(f"BigQuery query time (simulated): ~{random.uniform(5, 15):.1f} seconds")
print(f"Free tier remaining: 1 TB/month - {n_variants_in_region * 64 / 1e9:.4f} GB = 0.9999 TB")
print()
print("Key insight: BigQuery's columnar storage + clustering on (chrom, pos)")
print("means allele-frequency queries scan only the relevant chromosome region,")
print("not the entire 100TB genome. Free tier 1TB/month covers ~10,000 such queries.")`,
    insight: "Google hosts 1000 Genomes, gnomAD, ClinVar, GTEx, TCGA as public BigQuery datasets — the de-facto public genomics warehouse. A single BRCA1 allele-frequency query scans only ~80KB of variant data out of 100TB thanks to BigQuery's columnar storage + clustering on (chrom, pos). At USD 5/TB scanned, that's about USD 0.0001 per query — and the free tier 1TB/month covers ~10,000 such queries. Population geneticists at Broad Institute, Wellcome Sanger, and NIH use BigQuery daily for GWAS-style allele frequency lookups.",
  },

  // ============================================================
  // 2. NASA EARTH DATA ON BIGQUERY (Physics / Earth Science)
  // ============================================================
  {
    id: "bigquery-nasa-modis-earth",
    step: "2",
    title: "NASA Earth Data on BigQuery (~500TB MODIS)",
    subtitle: "Earth science — MODIS satellite imagery analytics on Google Cloud Storage",
    accent: "oklch(0.65 0.16 200)",
    icon: <Satellite className="h-4 w-4" />,
    badge: "Earth Science · Remote Sensing",
    brief: {
      dataset: "NASA MODIS (Moderate Resolution Imaging Spectroradiometer) aboard Terra + Aqua satellites: 36 spectral bands at 250m/500m/1km resolution, captured twice daily since 2000. Google hosts MODIS as a public BigQuery dataset (~500TB) — same imagery at sub-1TB/day. BigQuery GIS + ML enables global-scale vegetation, wildfire, and SST (sea surface temperature) analytics in seconds.",
      scale: "~500TB total imagery · 36 spectral bands · 250m-1km resolution · 2x daily since 2000 (24+ years) · 233km swath per orbit",
      why: "Earth science on BigQuery is the original cloud-native massive-data analytics use case — Google moved MODIS from NASA DAACs into BigQuery specifically so researchers could do global-scale NDVI (vegetation index) and wildfire analyses without downloading petabytes. The BigLake/Iceberg integration lets researchers register MODIS imagery on GCS as Iceberg tables and query them from BigQuery, Spark, and Trino interchangeably.",
    },
    stats: [
      { label: "Total size", value: "~500 TB" },
      { label: "Spectral bands", value: "36" },
      { label: "Resolution", value: "250 m - 1 km" },
      { label: "Cadence", value: "2x daily" },
    ],
    tools: ["Google BigQuery", "BigQuery GIS", "BigQuery ML", "Earth Engine", "BigLake", "Apache Iceberg", "GCS", "Apache Beam"],
    codeTabs: [
      {
        lang: "scala",
        filename: "BigQueryMODIS.scala",
        code: `import com.google.cloud.bigquery.{BigQuery, QueryJobConfiguration}
import scala.collection.JavaConverters._

// Compute monthly NDVI (vegetation index) from MODIS on BigQuery
// Public dataset: bigquery-public-data.modis.regions_1km (MOD13A2)
object MODISAnalytics {
  val ndvi_sql =
    """
      |SELECT
      |  ST_YIELD(region_polygon) AS region_name,
      |  SAFE_DIVIDE(SUM(ndvi_pixel_value), COUNT(ndvi_pixel_value)) AS avg_ndvi,
      |  SAFE_DIVIDE(SUM(evi_pixel_value), COUNT(evi_pixel_value)) AS avg_evi,
      |  COUNT(*) AS pixel_count
      |FROM bigquery-public-data.modis.regions_1km,
      |     UNNEST(ndvi_pixel_value) AS ndvi WITH OFFSET pos
      |JOIN bigquery-public-data.geo.global_regions AS r
      |  ON ST_CONTAINS(r.region_polygon, modis_geom)
      |WHERE modis_date >= '2024-08-01' AND modis_date < '2024-09-01'
      |  AND ST_DWITHIN(modis_geom, ST_GEOGPOINT(0, 51.5), 1_000_000)  -- London 1000km
      |GROUP BY 1
      |ORDER BY 2 DESC
    """.stripMargin

  def topGreenRegions(bq: BigQuery): Seq[(String, Double, Long)] = {
    val result = bq.query(QueryJobConfiguration.of(ndvi_sql))
    result.iterate().asScala.map { r =>
      (r.getString("region_name"),
       r.getDouble("avg_ndvi"),
       r.getLong("pixel_count"))
    }.toSeq
  }
}
// BigQuery ML for wildfire risk prediction
// CREATE MODEL ... OPTIONS(model_type='boosted_tree_classifier')`,
      },
      {
        lang: "rust",
        filename: "bigquery_modis_reader.rs",
        code: `use google_cloud_bigquery::client::Client;
use google_cloud_bigquery::query::QueryRequest;

// Rust MODIS wildfire detection — uses BigQuery ML predictions
// generated by a boosted_tree_classifier model on MODIS thermal bands.

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new().await?;

    // Wildfire pixel detection using MODIS thermal bands 21/31
    let sql = r#"
        SELECT
          ST_X(modis_geom) AS lon,
          ST_Y(modis_geom) AS lat,
          brightness_temp_21 AS bt21,
          brightness_temp_31 AS bt31,
          fire_mask
        FROM ML.PREDICT(MODEL earth.wildfire_model,
          (SELECT * FROM bigquery-public-data.modis.regions_1km
           WHERE modis_date = '2024-09-15'))
        WHERE fire_mask = 'nominal'
        ORDER BY bt21 DESC
        LIMIT 100
    "#;

    let mut result = client.query(QueryRequest::new(sql)).await?;

    while let Some(row) = result.next_row().await? {
        let lon: f64 = row.get_float64("lon")?;
        let lat: f64 = row.get_float64("lat")?;
        let bt21: f64 = row.get_float64("bt21")?;
        println!("Wildfire: ({}, {}) BT21={:.1}K", lon, lat, bt21);
    }
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "bigquery_modis_reader.go",
        code: `package main

import (
    "context"
    "fmt"

    "cloud.google.com/go/bigquery"
    "google.golang.org/api/iterator"
)

// Go MODIS wildfire analytics — Cloud Run function that produces
// daily wildfire alerts from BigQuery ML predictions.

func main() {
    ctx := context.Background()
    client, _ := bigquery.NewClient(ctx, "earth-analytics")

    q := client.Query(\`
        WITH region_pixels AS (
          SELECT ST_X(modis_geom) AS lon,
                 ST_Y(modis_geom) AS lat,
                 brightness_temp_21 AS bt,
                 brightness_temp_31 AS bt31,
                 acquisition_date
          FROM bigquery-public-data.modis.regions_1km
          WHERE acquisition_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
            AND brightness_temp_21 > 320  -- K, wildfire threshold
        )
        SELECT
          lon, lat, bt,
          bt - bt31 AS delta,
          CASE WHEN bt > 360 THEN 'high' ELSE 'medium' END AS severity
        FROM region_pixels
        ORDER BY bt DESC
        LIMIT 200
    \`)

    it, _ := q.Read(ctx)
    for {
        var row struct {
            Lon, Lat, Bt, Delta float64
            Severity            string
        }
        if err := it.Next(&row); err == iterator.Done { break }
        fmt.Printf("Wildfire (%.4f, %.4f) BT=%.1fK severity=%s\\n",
            row.Lon, row.Lat, row.Bt, row.Severity)
    }
}`,
      },
      {
        lang: "elixir",
        filename: "bigquery_modis_reader.ex",
        code: `defmodule Earth.MODISWildfireAlerts do
  @moduledoc """
  Phoenix LiveView dashboard showing daily wildfire alerts from
  BigQuery MODIS imagery analytics. Sends PubSub alerts to firefighters.
  """
  use Phoenix.LiveView
  alias GoogleApi.BigQuery.V2.Api.Jobs

  def render(assigns) do
    ~H"""
    <div>
      <h3>Wildfire alerts — {{date}} — {{length(@alerts)}} active</h3>
      <ul>
        <%= for a <- @alerts do %>
          <li>
            <strong>{{a.severity}}</strong>
            ({{a.lon}}, {{a.lat}}) BT={{a.bt}}K
            <span>Region: {{a.region}}</span>
          </li>
        <% end %>
      </ul>
    </div>
    """
  end

  def handle_event("refresh", _, socket) do
    sql = \"""
      WITH region_pixels AS (
        SELECT ST_X(modis_geom) AS lon,
               ST_Y(modis_geom) AS lat,
               brightness_temp_21 AS bt,
               brightness_temp_31 AS bt31,
               acquisition_date
        FROM bigquery-public-data.modis.regions_1km
        WHERE acquisition_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
          AND brightness_temp_21 > 320
      )
      SELECT lon, lat, bt, bt - bt31 AS delta,
             CASE WHEN bt > 360 THEN 'high' ELSE 'medium' END AS severity
      FROM region_pixels
      ORDER BY bt DESC LIMIT 200
    \"""
    {:ok, result} = Jobs.bigquery_jobs_query(
      Connection.get(), "earth-analytics",
      body: %{query: sql, useLegacySql: false})

    alerts = Enum.map(result.rows, fn r ->
      %{lon: Enum.at(r.f, 0).v, lat: Enum.at(r.f, 1).v,
        bt: Enum.at(r.f, 2).v, delta: Enum.at(r.f, 3).v,
        severity: Enum.at(r.f, 4).v}
    end)
    {:noreply, assign(socket, alerts: alerts)}
  end
end`,
      },
      {
        lang: "zig",
        filename: "bigquery_modis_reader.zig",
        code: `const std = @import("std");
const bq = @import("bigquery-zig");

// Zig MODIS SST (sea-surface temperature) analytics — runs on a
// Google Compute Engine spot VM. Sub-ms per-row iteration over
// BigQuery query results for high-throughput raster extraction.

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = try bq.Client.init(allocator, .{
        .project = "earth-analytics",
        .credentials_path = "/etc/secrets/bq-sa.json",
    });
    defer client.deinit();

    const sql =
        \\\\SELECT ST_X(modis_geom) AS lon,
        \\\\       ST_Y(modis_geom) AS lat,
        \\\\       brightness_temp_31 AS sst,
        \\\\       acquisition_date
        \\\\FROM bigquery-public-data.modis.regions_1km
        \\\\WHERE acquisition_date >= '2024-09-01'
        \\\\  AND ST_DWITHIN(modis_geom,
        \\\\       ST_GEOGFROMTEXT('POLYGON((-180 -90, 180 -90, 180 90, -180 90, -180 -90))'),
        \\\\       1)
        \\\\ORDER BY 4
    ;

    var result = try client.query(allocator, sql);
    defer result.deinit();

    var total: usize = 0;
    while (try result.next()) |row| {
        const lon: f64 = row.get_float64("lon");
        const lat: f64 = row.get_float64("lat");
        const sst: f64 = row.get_float64("sst");
        total += 1;
        if (total % 1000 == 0) {
            std.debug.print("...{d} pixels processed ({d:.2}K, {d:.2}K) SST={d:.1}K\\n",
                .{ total, lon, lat, sst });
        }
    }
}`,
      },
    ],
    runnablePython: `# NASA Earth MODIS on BigQuery — wildfire + NDVI simulation (Pyodide)
import random
from collections import defaultdict

print("=== NASA Earth Data on BigQuery — MODIS satellite imagery ===")
print("Public dataset: bigquery-public-data.modis.regions_1km")
print("Total size: ~500 TB · 36 spectral bands · 250m-1km resolution · 2x daily since 2000")
print()

# Simulate one day's worth of MODIS pixels (synthetic, scaled)
random.seed(42)
n_pixels_per_day = 50_000  # real value is ~5 billion
lat_min, lat_max = -90, 90
lon_min, lon_max = -180, 180

# Generate synthetic MODIS pixels (BRONZE-equivalent: thermal bands)
pixels = []
for p in range(n_pixels_per_day):
    lat = random.uniform(lat_min, lat_max)
    lon = random.uniform(lon_min, lon_max)
    # Brightness temperature bands 21 (1km) and 31 (1km)
    bt21 = random.gauss(290, 25)  # ~290K average Earth surface
    bt31 = random.gauss(290, 20)
    ndvi = random.uniform(-0.2, 0.9)  # NDVI range
    is_wildfire = bt21 > 320 and (bt21 - bt31) > 8
    pixels.append({
        "lat": lat, "lon": lon, "bt21": bt21, "bt31": bt31,
        "ndvi": ndvi, "wildfire": is_wildfire,
    })

# BigQuery columnar scan — only fetches lon, lat, bt21, bt31
# Clustering on (lat, lon) prunes to relevant region
print("BigQuery columnar scan:")
print("  Columns selected:    lat, lon, bt21, bt31, ndvi")
print("  Clustered by:        lat, lon, acquisition_date")
print(f"  Pixels scanned:     {n_pixels_per_day:,} (of ~5B daily)")
print(f"  Bytes scanned:      ~{n_pixels_per_day * 40 / 1e9:.2f} GB")
print(f"  Cost:               ~USD 0.000001 (free-tier covers)")
print()

# Aggregate: wildfire detection
wildfires = [p for p in pixels if p["wildfire"]]
severity_buckets = defaultdict(int)
for wf in wildfires:
    if wf["bt21"] > 360:
        severity_buckets["high"] += 1
    elif wf["bt21"] > 340:
        severity_buckets["medium"] += 1
    else:
        severity_buckets["low"] += 1

print(f"Wildfire detection (BT21 > 320K and (BT21-BT31) > 8K):")
print(f"  Total wildfire pixels: {len(wildfires):,} of {n_pixels_per_day:,} ({100*len(wildfires)/n_pixels_per_day:.2f}%)")
for sev, n in severity_buckets.items():
    print(f"    {sev}: {n:,} pixels")
print()

# Aggregate: average NDVI by region
ndvi_by_lat_band = defaultdict(list)
for p in pixels:
    band = int(p["lat"] // 30) * 30
    ndvi_by_lat_band[band].append(p["ndvi"])

print("Average NDVI (vegetation index) by latitude band:")
print(f"{'Lat band':<12} | {'Avg NDVI':<10} | {'Pixel count':<12}")
print("-" * 38)
for band in sorted(ndvi_by_lat_band.keys(), key=lambda b: -abs(b))[:10]:
    ndvis = ndvi_by_lat_band[band]
    avg = sum(ndvis) / len(ndvis)
    print(f"{band:+d} to {band+30:+d} | {avg:>9.4f} | {len(ndvis):>12,}")
print()

print("BigQuery ML integration:")
print("  CREATE MODEL earth.wildfire_model")
print("  OPTIONS(model_type='boosted_tree_classifier')")
print("  AS SELECT * FROM modis WHERE has_label")
print()
print("BigLake/Iceberg integration:")
print("  Register MODIS on GCS as Iceberg table → query from BigQuery,")
print("  Spark, Trino interchangeably — vendor-neutral storage.")
print()
print("Key insight: BigQuery + MODIS = sub-second wildfire detection")
print("across the entire globe. NASA publishes MODIS as public BigQuery")
print("dataset (500TB) specifically to enable this kind of analytics")`,
    insight: "Google's move of NASA MODIS (500TB) into BigQuery public datasets is the canonical Earth-science-on-cloud story — researchers can run global-scale wildfire detection, NDVI vegetation analytics, and SST anomaly detection in seconds without downloading petabytes. BigQuery ML (boosted_tree_classifier) lets data scientists train wildfire prediction models directly on the imagery. BigLake (Iceberg on GCS) makes the same imagery available cross-engine from Spark, Trino, BigQuery — vendor-neutral storage layer with warehouse-grade query performance.",
  },
];

// ============================================================
// REDSHIFT_SCIENCE_EXAMPLES (2 examples)
// ============================================================

export const REDSHIFT_SCIENCE_EXAMPLES: DatasetExample[] = [
  // ============================================================
  // 1. CLIMATE ANALYTICS ON REDSHIFT (Physics / Earth Science)
  // ============================================================
  {
    id: "redshift-noaa-gsod-climate",
    step: "1",
    title: "NOAA GSOD Climate Analytics on Redshift (sort key on date)",
    subtitle: "Earth science — 120 years of daily weather data with sort key on date",
    accent: "oklch(0.65 0.16 200)",
    icon: <Cloud className="h-4 w-4" />,
    badge: "Earth Science · Climate",
    brief: {
      dataset: "NOAA Global Surface Summary of the Day (GSOD): ~120 years of daily weather observations from 9,000+ surface weather stations worldwide. Loaded into Redshift with SORTKEY on weather_date and DISTKEY on station_id. Climate analytics (decadal temperature trends, extreme event frequency, regional warming patterns) run in seconds due to sort-key range pruning.",
      scale: "~120 years of data · 9,000+ stations · 4 billion weather records · ~500 GB compressed in Redshift columnar format",
      why: "Redshift's SORTKEY on weather_date is the textbook case for time-series climate analytics — queries like ' hottest 1% of summer days since 1900' prune directly to the relevant date range, scanning only the required row range. Distribution by station_id co-locates records from the same station on the same compute node — critical for per-station trend analysis across 9,000+ stations.",
    },
    stats: [
      { label: "Years of data", value: "120+" },
      { label: "Stations", value: "9,000+" },
      { label: "Records", value: "4 billion" },
      { label: "Compressed", value: "~500 GB" },
    ],
    tools: ["AWS Redshift", "Redshift Spectrum", "NOAA GSOD", "Apache Parquet", "QuickSight", "AWS Glue", "S3"],
    codeTabs: [
      {
        lang: "scala",
        filename: "RedshiftClimate.scala",
        code: `import slick.jdbc.PostgresProfile.api._
import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

// NOAA GSOD climate analytics on Redshift
// SORTKEY on weather_date, DISTKEY on station_id
case class WeatherRecord(
  station_id: String,
  weather_date: java.time.LocalDate,
  temp_max_f: Double,
  temp_min_f: Double,
  temp_avg_f: Double,
  prcp_in: Option[Double],
  wind_knots: Double,
)

class WeatherRecords(tag: Tag) extends Table[WeatherRecord](tag, "weather_gsod") {
  def station_id    = column[String]("station_id", O.Length(12))
  def weather_date  = column[java.time.LocalDate]("weather_date")
  def temp_max_f    = column[Double]("temp_max_f")
  def temp_min_f    = column[Double]("temp_min_f")
  def temp_avg_f    = column[Double]("temp_avg_f")
  def prcp_in       = column[Option[Double]]("prcp_in")
  def wind_knots    = column[Double]("wind_knots")
  def * = (station_id, weather_date, temp_max_f, temp_min_f, temp_avg_f, prcp_in, wind_knots) <> (WeatherRecord.tupled, WeatherRecord.unapply)
}

// Decadal temperature trend per region
val db = Database.forURL(
  "jdbc:redshift://redshift-cluster.cxabc.us-east-1.redshift.amazonaws.com:5439/climate",
  driver = "com.amazon.redshift.jdbc.Driver")

val decadalTrend = sql"""
  SELECT
    EXTRACT(YEAR FROM weather_date) AS yr,
    station_id,
    AVG(temp_avg_f) AS avg_temp,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY temp_max_f) AS p95_max
  FROM weather_gsod
  WHERE weather_date BETWEEN '1990-01-01' AND '2024-12-31'
  GROUP BY 1, 2
  ORDER BY 1
""".as[(Int, String, Double, Double)]
val result: Future[Vector[(Int, String, Double, Double)]] = db.run(decadalTrend)

// SORTKEY date prune: scans only 1990-2024 range (not 120 years)`,
      },
      {
        lang: "rust",
        filename: "redshift_climate_reader.rs",
        code: `use postgres::{Client, NoTls};

// Rust climate reader — Redshift via PostgreSQL wire protocol.
// Use case: real-time extreme-event dashboard for climate researchers.

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut client = Client::connect(
        "postgresql://user:pass@redshift-cluster.cxabc.us-east-1.redshift.amazonaws.com:5439/climate",
        NoTls,
    )?;

    // Top 0.1% hottest summer days in the past 30 years
    // SORTKEY on weather_date prunes to 1994-2024 range only
    let rows = client.query(
        r#"
        WITH extreme_heat AS (
          SELECT station_id, weather_date, temp_max_f,
            PERCENT_RANK() OVER (ORDER BY temp_max_f) AS pct_rank
          FROM weather_gsod
          WHERE weather_date BETWEEN '1994-01-01' AND '2024-12-31'
            AND EXTRACT(MONTH FROM weather_date) BETWEEN 6 AND 8
        )
        SELECT station_id, weather_date, temp_max_f
        FROM extreme_heat
        WHERE pct_rank > 0.999
        ORDER BY temp_max_f DESC
        LIMIT 100
        "#,
        &[],
    )?;

    for row in rows {
        let station: String = row.get(0);
        let date: chrono::NaiveDate = row.get(1);
        let temp_f: f64 = row.get(2);
        println!("{} on {}: {:.1}F", station, date, temp_f);
    }
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "redshift_climate_reader.go",
        code: `package main

import (
    "database/sql"
    "fmt"
    "log"

    _ "github.com/lib/pq"
)

// Go climate reader — Redshift via pq driver.
// Use case: AWS Lambda function that produces weekly regional
// warming-pattern report for the climate science newsletter.

func main() {
    db, err := sql.Open("postgres",
        "postgresql://user:pass@redshift-cluster:5439/climate")
    if err != nil { log.Fatal(err) }

    // Regional decadal temperature trend — DISTKEY on station_id
    // co-locates per-station records on the same compute slice.
    rows, _ := db.Query(\`
        WITH region_stations AS (
          SELECT s.station_id, s.country,
                 ST_Y(s.coordinates) AS lat
          FROM stations s
          WHERE ST_Y(s.coordinates) BETWEEN 30 AND 60  -- mid-latitude
        )
        SELECT
          EXTRACT(DECADE FROM g.weather_date) AS decade,
          s.country,
          AVG(g.temp_avg_f) AS avg_temp
        FROM weather_gsod g
        JOIN region_stations s ON g.station_id = s.station_id
        WHERE g.weather_date >= '1900-01-01'
        GROUP BY 1, 2
        ORDER BY 1, 2
    \`)

    for rows.Next() {
        var decade int
        var country string
        var avgTemp float64
        rows.Scan(&decade, &country, &avgTemp)
        fmt.Printf("%d-%d %s: %.1fF\\n",
            decade, decade+9, country, avgTemp)
    }
}`,
      },
      {
        lang: "elixir",
        filename: "redshift_climate_reader.ex",
        code: `defmodule Climate.RedshiftExtremeHeat do
  @moduledoc """
  Phoenix LiveView dashboard showing real-time extreme heat events
  from Redshift NOAA GSOD analytics. Triggers PubSub alerts to
  regional climate offices.
  """
  use Phoenix.LiveView
  alias Ecto.Adapters.Postgres

  def render(assigns) do
    ~H"""
    <div>
      <h3>Extreme heat events — past 30 days</h3>
      <table>
        <tr><th>Station</th><th>Date</th><th>Temp °F</th><th>Pct</th></tr>
        <%= for e <- @events do %>
          <tr>
            <td><%= e.station %></td>
            <td><%= e.date %></td>
            <td><%= :fwi.format(e.temp, 1) %></td>
            <td><%= :fwi.format(e.pct, 3) %></td>
          </tr>
        <% end %>
      </table>
    </div>
    """
  end

  def handle_event("refresh", _, socket) do
    sql = \"""
      WITH extreme_heat AS (
        SELECT station_id, weather_date, temp_max_f,
          PERCENT_RANK() OVER (ORDER BY temp_max_f) AS pct_rank
        FROM weather_gsod
        WHERE weather_date BETWEEN '1994-01-01' AND '2024-12-31'
          AND EXTRACT(MONTH FROM weather_date) BETWEEN 6 AND 8
      )
      SELECT station_id, weather_date, temp_max_f, pct_rank
      FROM extreme_heat
      WHERE pct_rank > 0.999
      ORDER BY temp_max_f DESC
      LIMIT 100
    \"""
    {:ok, result} = Ecto.Adapters.Postgres.query(Climate.Repo, sql, [])

    events = Enum.map(result.rows, fn [st, dt, t, p] ->
      %{station: st, date: dt, temp: t, pct: p}
    end)
    {:noreply, assign(socket, events: events)}
  end
end`,
      },
      {
        lang: "zig",
        filename: "redshift_climate_reader.zig",
        code: `const std = @import("std");
const pq = @import("pq-zig");

// Zig climate reader — Redshift via PostgreSQL wire protocol.
// Sub-ms row iteration for high-throughput decadal trend report
// generation across all 9,000+ stations.

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var conn = try pq.Connection.connect(allocator, .{
        .host = "redshift-cluster.cxabc.us-east-1.redshift.amazonaws.com",
        .port = 5439,
        .database = "climate",
        .user = "climate_user",
        .password = "secret",
    });
    defer conn.deinit();

    const sql =
        \\\\SELECT EXTRACT(YEAR FROM weather_date) AS yr,
        \\\\       station_id, AVG(temp_avg_f) AS avg_temp
        \\\\FROM weather_gsod
        \\\\WHERE weather_date BETWEEN '1990-01-01' AND '2024-12-31'
        \\\\GROUP BY 1, 2
        \\\\ORDER BY 1
    ;

    var result = try conn.query(allocator, sql);
    defer result.deinit();

    var rows: usize = 0;
    while (try result.next()) |row| {
        const year: i32 = row.get_int32("yr");
        const station: []const u8 = row.get_string("station_id");
        const avg_temp: f64 = row.get_float64("avg_temp");
        rows += 1;
        if (rows <= 5 or rows % 1000 == 0) {
            std.debug.print("{d} {s} avg={d:.1}F\\n", .{ year, station, avg_temp });
        }
    }
    std.debug.print("Total rows: {d}\\n", .{rows});
}`,
      },
    ],
    runnablePython: `# NOAA GSOD Climate Analytics on Redshift — Pyodide simulation
import random
from collections import defaultdict

print("=== NOAA GSOD Climate Analytics on Redshift ===")
print("Dataset: NOAA Global Surface Summary of the Day (GSOD)")
print("Scale: 120 years of data · 9,000+ stations · 4 billion records · ~500 GB compressed")
print()

# Simulate weather stations + 120 years of daily observations (scaled)
random.seed(42)
n_stations = 100  # scaled from 9,000+
stations = [
    (f"USW{i:06d}",
     random.uniform(25, 50),  # lat
     random.uniform(-125, -70))  # lon
    for i in range(n_stations)
]

# Generate ~30 years of daily observations per station (scaled)
years = list(range(1995, 2025))
total_records = 0
station_decades = defaultdict(lambda: defaultdict(list))

for station_id, lat, lon in stations:
    base_temp = 60 + (lat - 40) * (-2.5)  # colder at higher latitudes
    # Climate warming trend: +0.03F per year
    for year in years:
        warming = (year - 1995) * 0.03
        for month in range(1, 13):
            for day in range(1, 29):
                # Seasonal variation
                seasonal = 15 * math.sin(2 * 3.14159 * (month - 4) / 12)
                # Daily noise
                noise = random.gauss(0, 5)
                temp_max = base_temp + warming + seasonal + noise + 8
                temp_avg = temp_max - 8 + noise / 2
                date_str = f"{year}-{month:02d}-{day:02d}"

                # Bucket by decade for aggregation
                decade = (year // 10) * 10
                station_decades[station_id][decade].append({
                    "date": date_str, "temp_max": temp_max,
                    "temp_avg": temp_avg,
                })
                total_records += 1

print(f"Generated: {total_records:,} synthetic weather records for {n_stations} stations")
print()

# Redshift storage model: SORTKEY on weather_date, DISTKEY on station_id
print("Redshift storage model:")
print("  SORTKEY:     weather_date  (range prune for date filters)")
print("  DISTKEY:     station_id    (co-locate per-station records)")
print("  Compression: AZCOMPRESS (columnar + RLE + delta)")
print(f"  Total size:  ~{total_records * 40 / 1e9:.2f} GB (compressed)")
print()

# Query: top 0.1% hottest summer days since 1990
print("Query: top 0.1% hottest summer days since 1990")
print("  (SORTKEY date prune → scans only 1990-2024 records)")
print()

# Aggregate per-station, per-decade avg temperature
print(f"{'Decade':<8} | {'Avg max temp °F':<18} | {'Avg avg temp °F':<18} | {'Warming since 1990s':<22}")
print("-" * 70)
decade_temps = defaultdict(list)
decade_maxes = defaultdict(list)
for station_id, decades in station_decades.items():
    for decade, records in decades.items():
        for r in records:
            decade_temps[decade].append(r["temp_avg"])
            decade_maxes[decade].append(r["temp_max"])

baseline_avg = sum(decade_temps[1990]) / len(decade_temps[1990]) if 1990 in decade_temps else 60
for decade in sorted(decade_temps.keys()):
    avg_t = sum(decade_temps[decade]) / len(decade_temps[decade])
    avg_max = sum(decade_maxes[decade]) / len(decade_maxes[decade])
    warming = avg_t - baseline_avg
    print(f"{decade}s    | {avg_max:>16.2f}  | {avg_t:>16.2f}  | {warming:>+18.3f} °F")

# Need math import (defined at top of demo)

import math  # noqa: E402

print()
print("Redshift Spectrum: query NOAA S3 directly without loading")
print("  External schema: CREATE EXTERNAL SCHEMA noaa_s3")
print("  FROM DATA CATALOG DATABASE 'noaa_gso'"
      "  IAM_ROLE 'arn:aws:iam::xxx:role/redshift-spectrum'")
print()
print("Key insight: Redshift SORTKEY on weather_date enables range-pruning")
print("for time-series climate analytics — queries on a date range scan only")
print("the relevant rows, not the full 4-billion-record table. DISTKEY on")
print("station_id co-locates per-station records on the same compute slice.")`,
    insight: "NOAA GSOD on Redshift is the textbook case for time-series analytics with SORTKEY — queries on a date range prune directly to the relevant row range, avoiding full-table scans across 4 billion records. DISTKEY on station_id co-locates records from the same station on the same compute slice, making per-station trend analysis across 9,000+ stations O(N) rather than O(N log N) over the network. AWS Glue + Redshift Spectrum lets analysts query the same NOAA data on S3 directly without loading it into the warehouse first.",
  },

  // ============================================================
  // 2. GENOMICS ON REDSHIFT (Life Sciences)
  // ============================================================
  {
    id: "redshift-genomics-variant-annotation",
    step: "2",
    title: "Genomics Variant Annotation on Redshift (DISTKEY on chrom)",
    subtitle: "Life sciences — 3B SNP annotations with distribution by chromosome",
    accent: "oklch(0.65 0.16 30)",
    icon: <Microscope className="h-4 w-4" />,
    badge: "Life Sciences · Genomics",
    brief: {
      dataset: "Variant Annotation: ~3 billion reference SNPs × 80 annotation fields (gene, consequence, ClinVar pathogenicity, dbSNP ID, gnomAD allele frequency, conservation scores PhastCons/phyloP). Loaded into Redshift with DISTKEY on chrom (chromosome) and SORTKEY on pos (position). Per-chromosome variant annotation queries hit only one compute slice — sub-second response for any genomic region.",
      scale: "~3 billion annotated SNPs × 80 fields · 22 chromosomes + X/Y/MT · 200 GB compressed · 1.5 TB uncompressed",
      why: "Redshift's DISTKEY on chrom is the textbook pattern for partitioned genomics — variants are naturally partitioned by chromosome (chr1, chr2, ..., chr22, chrX, chrY, chrM). A query like 'all pathogenic variants in chr17 BRCA1 region' runs entirely on the slice holding chr17 — no inter-slice network traffic, no shuffle. Combined with SORTKEY on pos, range queries on chr17:41M-42M prune to a tiny row range. This is the same partition strategy as Kafka partitions by chromosome and Iceberg partitioned by (chrom, pos).",
    },
    stats: [
      { label: "Reference SNPs", value: "~3 billion" },
      { label: "Chromosomes", value: "25 (1-22, X, Y, MT)" },
      { label: "Annotation fields", value: "80" },
      { label: "Compressed size", value: "~200 GB" },
    ],
    tools: ["AWS Redshift", "Redshift Spectrum", "dbSNP", "ClinVar", "gnomAD", "VEP", "Apache Parquet", "AWS Glue"],
    codeTabs: [
      {
        lang: "scala",
        filename: "RedshiftGenomics.scala",
        code: `import slick.jdbc.PostgresProfile.api._
import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

// Genomics variant annotation on Redshift
// DISTKEY on chrom (partition per chromosome), SORTKEY on pos
case class VariantAnnotation(
  chrom: String, pos: Long, ref: String, alt: String,
  rs_id: String, gene: String, consequence: String,
  clinvar_pathogenicity: Option[String],
  gnomad_af: Option[Double],
  phastcons: Option[Double],
)

class Annotations(tag: Tag) extends Table[VariantAnnotation](tag, "variant_annotation") {
  def chrom     = column[String]("chrom", O.Length(2))
  def pos       = column[Long]("pos")
  def ref       = column[String]("ref_allele", O.Length(1))
  def alt       = column[String]("alt_allele", O.Length(1))
  def rs_id     = column[String]("rs_id", O.Length(15))
  def gene      = column[String]("gene", O.Length(30))
  def consequence = column[String]("consequence", O.Length(40))
  def clinvar_pathogenicity = column[Option[String]]("clinvar_pathogenicity")
  def gnomad_af = column[Option[Double]]("gnomad_af")
  def phastcons = column[Option[Double]]("phastcons")
  def * = (chrom, pos, ref, alt, rs_id, gene, consequence,
           clinvar_pathogenicity, gnomad_af, phastcons) <> (VariantAnnotation.tupled, VariantAnnotation.unapply)
}

// All pathogenic variants in BRCA1 locus (chr17:41.2M-41.3M)
// DISTKEY on chrom: chr17 records co-located on one compute slice
// SORTKEY on pos: range query prunes to the slice-local sorted range
val db = Database.forURL(
  "jdbc:redshift://redshift-cluster.cxabc.us-east-1.redshift.amazonaws.com:5439/genomics",
  driver = "com.amazon.redshift.jdbc.Driver")

val pathogenicBRCA1 = sql"""
  SELECT chrom, pos, ref, alt, rs_id, gene, consequence, clinvar_pathogenicity, gnomad_af
  FROM variant_annotation
  WHERE chrom = '17' AND pos BETWEEN 41196311 AND 41277500
    AND clinvar_pathogenicity IN ('pathogenic', 'likely_pathogenic')
  ORDER BY pos
""".as[(String, Long, String, String, String, String, String, Option[String], Option[Double])]

val result: Future[Vector[(String, Long, String, String, String, String, String, Option[String], Option[Double])]] =
  db.run(pathogenicBRCA1)`,
      },
      {
        lang: "rust",
        filename: "redshift_genomics_reader.rs",
        code: `use postgres::{Client, NoTls};

// Rust genomics reader — Redshift via PostgreSQL wire protocol.
// Use case: clinical genomics variant prioritisation service
// for a hospital electronic medical record system.

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut client = Client::connect(
        "postgresql://user:pass@redshift-cluster.cxabc.us-east-1.redshift.amazonaws.com:5439/genomics",
        NoTls,
    )?;

    // All missense variants in BRCA1 with gnomAD allele frequency < 1%
    // SORTKEY on pos prunes to BRCA1 region; DISTKEY on chrom keeps
    // chr17 variants on one compute slice — no network shuffle.
    let rows = client.query(
        r#"
        SELECT chrom, pos, ref_allele, alt_allele, rs_id, gene,
               consequence, clinvar_pathogenicity, gnomad_af, phastcons
        FROM variant_annotation
        WHERE chrom = '17'
          AND pos BETWEEN 41196311 AND 41277500
          AND consequence = 'missense_variant'
          AND (gnomad_af IS NULL OR gnomad_af < 0.01)
        ORDER BY phastcons DESC NULLS LAST
        LIMIT 50
        "#,
        &[],
    )?;

    for row in rows {
        let chrom: String = row.get(0);
        let pos: i64 = row.get(1);
        let rs_id: String = row.get(4);
        let gnomad_af: Option<f64> = row.get(8);
        let phastcons: Option<f64> = row.get(9);
        println!("{}:{} {} gnomAD={:?} phast={:?}",
            chrom, pos, rs_id, gnomad_af, phastcons);
    }
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "redshift_genomics_reader.go",
        code: `package main

import (
    "database/sql"
    "fmt"
    "log"

    _ "github.com/lib/pq"
)

// Go genomics reader — Redshift variant annotation query.
// Use case: AWS Lambda function that annotates patient sample
// variants with ClinVar pathogenicity and conservation scores.

func main() {
    db, err := sql.Open("postgres",
        "postgresql://user:pass@redshift-cluster:5439/genomics")
    if err != nil { log.Fatal(err) }

    // Patient variants passed as array; annotate with clinical info
    patientVariants := []struct{ Chrom, Ref, Alt string; Pos int64 }{
        {"17", 41196312, "A", "T"},
        {"17", 41198000, "C", "G"},
        {"13", 32889611, "G", "A"},   // BRCA2
        {"11", 98890936, "C", "G"},   // ATM
    }

    for _, v := range patientVariants {
        row := db.QueryRow(\`
            SELECT rs_id, gene, consequence,
                   clinvar_pathogenicity, gnomad_af, phastcons
            FROM variant_annotation
            WHERE chrom = $1 AND pos = $2
              AND ref_allele = $3 AND alt_allele = $4
        \`, v.Chrom, v.Pos, v.Ref, v.Alt)

        var rsID, gene, consequence string
        var clinvar sql.NullString
        var gnomadAF, phastcons sql.NullFloat64
        row.Scan(&rsID, &gene, &consequence, &clinvar, &gnomadAF, &phastcons)
        fmt.Printf("%s:%d %s>%s rs=%s gene=%s cons=%s clinvar=%v\\n",
            v.Chrom, v.Pos, v.Ref, v.Alt,
            rsID, gene, consequence, clinvar.String)
    }
}`,
      },
      {
        lang: "elixir",
        filename: "redshift_genomics_reader.ex",
        code: `defmodule Genomics.RedshiftVariantAnnotator do
  @moduledoc """
  Phoenix LiveView variant annotator service. Takes patient sample
  variants, queries Redshift annotation table, returns prioritised
  list with ClinVar pathogenicity + gnomAD allele frequency.
  """
  use Phoenix.LiveView
  alias Ecto.Adapters.Postgres

  def render(assigns) do
    ~H"""
    <div>
      <h3>Patient variant annotation</h3>
      <table>
        <tr><th>Variant</th><th>rsID</th><th>Gene</th><th>Clinvar</th><th>gnomAD AF</th></tr>
        <%= for v <- @annotated do %>
          <tr>
            <td>{{v.chrom}}:{{v.pos}} {{v.ref}}>{{v.alt}}</td>
            <td>{{v.rs_id}}</td>
            <td>{{v.gene}}</td>
            <td>{{v.clinvar}}</td>
            <td>{{if v.gnomad_af, do: :fwi.format(v.gnomad_af, 4), else: "—"}}</td>
          </tr>
        <% end %>
      </table>
    </div>
    """
  end

  def handle_event("annotate", %{"variants" => variants}, socket) do
    annotated = Enum.map(variants, fn v ->
      sql = \"""
        SELECT rs_id, gene, consequence, clinvar_pathogenicity,
               gnomad_af, phastcons
        FROM variant_annotation
        WHERE chrom = '#{v["chrom"]}' AND pos = #{v["pos"]}
          AND ref_allele = '#{v["ref"]}' AND alt_allele = '#{v["alt"]}'
      \"""
      {:ok, result} = Ecto.Adapters.Postgres.query(Genomics.Repo, sql, [])
      case result.rows do
        [[rs, gene, cons, clinvar, af, phast]|_] ->
          %{chrom: v["chrom"], pos: v["pos"], ref: v["ref"], alt: v["alt"],
            rs_id: rs, gene: gene, consequence: cons, clinvar: clinvar,
            gnomad_af: af, phastcons: phast}
        [] ->
          %{chrom: v["chrom"], pos: v["pos"], ref: v["ref"], alt: v["alt"],
            rs_id: "—", gene: "—", consequence: "—",
            clinvar: "—", gnomad_af: nil, phastcons: nil}
      end
    end)
    {:noreply, assign(socket, annotated: annotated)}
  end
end`,
      },
      {
        lang: "zig",
        filename: "redshift_genomics_reader.zig",
        code: `const std = @import("std");
const pq = @import("pq-zig");

// Zig genomics reader — Redshift variant annotation lookup.
// Sub-ms per-query throughput for high-volume clinical genomics
// annotation services (100s of patient samples per day).

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var conn = try pq.Connection.connect(allocator, .{
        .host = "redshift-cluster.cxabc.us-east-1.redshift.amazonaws.com",
        .port = 5439,
        .database = "genomics",
        .user = "genomics_user",
        .password = "secret",
    });
    defer conn.deinit();

    // Top 10 most-conserved missense variants in BRCA1
    // SORTKEY on pos + DISTKEY on chrom → chr17 single slice, range prune
    const sql =
        \\\\SELECT chrom, pos, ref_allele, alt_allele, rs_id,
        \\\\       gene, consequence, phastcons, gnomad_af
        \\\\FROM variant_annotation
        \\\\WHERE chrom = '17'
        \\\\  AND pos BETWEEN 41196311 AND 41277500
        \\\\  AND consequence = 'missense_variant'
        \\\\ORDER BY phastcons DESC NULLS LAST
        \\\\LIMIT 10
    ;

    var result = try conn.query(allocator, sql);
    defer result.deinit();

    while (try result.next()) |row| {
        const chrom: []const u8 = row.get_string("chrom");
        const pos: i64 = row.get_int64("pos");
        const rs_id: []const u8 = row.get_string("rs_id");
        const phastcons: ?f64 = row.get_nullable_float64("phastcons");
        std.debug.print("{s}:{d} {s} phast={?d:.2}\\n",
            .{ chrom, pos, rs_id, phastcons });
    }
}`,
      },
    ],
    runnablePython: `# Genomics Variant Annotation on Redshift — Pyodide simulation
import random
from collections import defaultdict

print("=== Genomics Variant Annotation on Redshift ===")
print("Dataset: dbSNP + ClinVar + gnomAD annotations on ~3 billion reference SNPs")
print("Scale: 3B SNPs × 80 fields × 25 chromosomes · ~200 GB compressed in Redshift")
print()

# Simulate variant annotation records for chr17 BRCA1 region
random.seed(42)
chromosomes = [f"chr{i}" for i in range(1, 23)] + ["chrX", "chrY", "chrMT"]
brca1_start = 41_196_311
brca1_end   = 41_277_500

# Generate synthetic annotated variants for chr17 BRCA1
n_variants = 5000  # BRCA1 region has ~5k known variants
genes = ["BRCA1", "NBR2", "RPL21P4", "NBR2"]
consequences = [
    "missense_variant", "synonymous_variant", "frameshift_variant",
    "splice_donor_variant", "stop_gained", "missense_variant",
    "missense_variant", "intron_variant",
]
clinvar_classes = ["pathogenic", "likely_pathogenic", "uncertain",
                   "likely_benign", "benign", "uncertain", "benign"]

# DISTKEY on chrom: chr17 variants land on one compute slice
# SORTKEY on pos: range query prunes to BRCA1 region only
print("Redshift storage model:")
print("  DISTKEY:     chrom (partition per chromosome)")
print("  SORTKEY:     pos  (range prune for genomic region queries)")
print("  Compression: AZCOMPRESS (columnar + RLE)")
print()

# Generate chr17 BRCA1 region annotations
annotations = []
for v in range(n_variants):
    pos = random.randint(brca1_start, brca1_end)
    ref = random.choice("ACGT")
    alt = random.choice("ACGT")
    rs_id = f"rs{random.randint(100_000_000, 1_200_000_000)}"
    gene = random.choice(genes)
    consequence = random.choice(consequences)
    clinvar = random.choice(clinvar_classes)
    gnomad_af = random.uniform(0, 0.5) if random.random() > 0.1 else None
    phastcons = random.uniform(0, 1) if random.random() > 0.2 else None
    annotations.append({
        "chrom": "chr17", "pos": pos, "ref": ref, "alt": alt,
        "rs_id": rs_id, "gene": gene, "consequence": consequence,
        "clinvar": clinvar, "gnomad_af": gnomad_af, "phastcons": phastcons,
    })

# Query: all pathogenic variants in BRCA1
print("Query: all pathogenic variants in chr17 BRCA1 region")
print("  (DISTKEY prune → chr17 single slice, SORTKEY prune → BRCA1 range)")
print()
pathogenic = [a for a in annotations if a["clinvar"] in ("pathogenic", "likely_pathogenic")]
print(f"  Pathogenic variants found: {len(pathogenic)} of {n_variants}")
print()

# Top 10 most-conserved missense variants
missense = [a for a in annotations if a["consequence"] == "missense_variant" and a["phastcons"] is not None]
missense.sort(key=lambda a: a["phastcons"], reverse=True)
print("Top 10 most-conserved missense variants (sub-second Redshift query):")
print(f"{'Pos':<10} | {'Ref':<3} | {'Alt':<3} | {'rsID':<14} | {'PhastCons':<10} | {'ClinVar':<18} | {'gnomAD AF':<10}")
print("-" * 90)
for a in missense[:10]:
    af_str = f"{a['gnomad_af']:.4f}" if a["gnomad_af"] is not None else "—"
    print(f"{a['pos']:<10} | {a['ref']:<3} | {a['alt']:<3} | {a['rs_id']:<14} | {a['phastcons']:<10.3f} | {a['clinvar']:<18} | {af_str:<10}")

# Compute slice distribution (DISTKEY simulation)
print()
print("Redshift compute slice distribution (DISTKEY on chrom):")
n_slices = 4  # typical small Redshift cluster
slice_load = defaultdict(int)
for chrom in chromosomes:
    slice_id = hash(chrom) % n_slices
    slice_load[slice_id] += 1
for slice_id in range(n_slices):
    print(f"  Slice {slice_id}: {slice_load[slice_id]} chromosomes")

print()
print("Key insight: Redshift DISTKEY on chrom co-locates all chr17 variants")
print("on one compute slice — BRCA1 region queries hit one slice only,")
print("no network shuffle. SORTKEY on pos enables range pruning within the slice.")`,
    insight: "Genomics variant annotation on Redshift is the textbook case for DISTKEY + SORTKEY combination — DISTKEY on chrom co-locates per-chromosome variants on one compute slice (no network shuffle for chr17-only queries), and SORTKEY on pos enables range pruning within that slice for any genomic region. A BRCA1 query (chr17:41.2M-41.3M) hits only one slice, scans only the relevant row range — sub-second response across 3 billion SNPs. AWS Glue + Redshift Spectrum lets analysts query the same annotation data on S3 directly via Parquet without loading it.",
  },
];

// ============================================================
// CLICKHOUSE_SCIENCE_EXAMPLES (2 examples)
// ============================================================

export const CLICKHOUSE_SCIENCE_EXAMPLES: DatasetExample[] = [
  // ============================================================
  // 1. IOT TELEMETRY ON CLICKHOUSE (Sensors)
  // ============================================================
  {
    id: "clickhouse-iot-telemetry-1b-day",
    step: "1",
    title: "IoT Telemetry on ClickHouse (1B events/day, MergeTree partitioned by hour)",
    subtitle: "Sensors — 50 million devices streaming at 1 billion events per day",
    accent: "oklch(0.65 0.16 30)",
    icon: <Radio className="h-4 w-4" />,
    badge: "Sensors · IoT",
    brief: {
      dataset: "IoT sensor telemetry from 50 million devices (industrial sensors, smart meters, vehicle fleets, environmental monitors). ~1 billion events per day, ~7TB raw, ~500GB compressed in ClickHouse MergeTree partitioned by hour. Real-time analytics: per-device rolling means, anomaly detection, alerting — all sub-second queries on the live 1B-event table.",
      scale: "1B events/day · 50M devices · ~7TB raw → 500GB compressed (14:1 ratio) · 365B events/year",
      why: "ClickHouse IS the canonical IoT telemetry OLAP engine — its MergeTree engine family (MergeTree, ReplacingMergeTree, AggregatingMergeTree) is purpose-built for time-series telemetry. Partitioning by hour means a 'last 24 hours' query scans only 24 partitions out of 8,760/year. Materialised views pre-aggregate per-device-per-minute means, so per-device trend queries are O(1) not O(N). Yandex production scale: 4 trillion rows per table, 2 PB+ per node — proven at IoT telemetry scale.",
    },
    stats: [
      { label: "Events/day", value: "1 billion" },
      { label: "Devices", value: "50 million" },
      { label: "Raw size", value: "~7 TB/day" },
      { label: "Compressed", value: "~500 GB" },
    ],
    tools: ["ClickHouse", "MergeTree", "AggregatingMergeTree", "Kafka", "Vector", "Grafana", "Materialised Views"],
    codeTabs: [
      {
        lang: "scala",
        filename: "ClickHouseIoT.scala",
        code: `import com.clickhouse.jdbc.{ClickHouseConnection, ClickHouseDataSource}
import scala.collection.JavaConverters._

// IoT telemetry on ClickHouse — 1B events/day, MergeTree partitioned by hour
// Java JDBC client; same code works for Scala applications.
object IoTTelemetry {
  val url = "jdbc:ch://clickhouse.cluster.local:8123/iot"

  // Create the IoT telemetry table
  // MergeTree partitioned by toStartOfHour(ts) — hour partitions
  // ORDER BY (device_id, ts) — primary key for fast device-range queries
  val createSql =
    """
      |CREATE TABLE iot.telemetry (
      |  device_id     String,
      |  ts            DateTime64(3),
      |  metric_name   LowCardinality(String),  -- enum-like, 2 bits
      |  metric_value  Float64,
      |  quality       LowCardinality(String)  -- good | bad | unknown
      |) ENGINE = MergeTree
      |PARTITION BY toStartOfHour(ts)
      |ORDER BY (device_id, ts)
      |SETTINGS index_granularity = 8192
    """.stripMargin

  // Materialised view: per-device per-minute means (pre-aggregated)
  val mvSql =
    """
      |CREATE MATERIALIZED VIEW iot.telemetry_per_minute
      |ENGINE = AggregatingMergeTree
      |PARTITION BY toStartOfHour(ts)
      |ORDER BY (device_id, ts)
      |AS SELECT
      |  device_id,
      |  toStartOfMinute(ts) AS ts,
      |  avgState(metric_value) AS avg_value_state,
      |  countState()         AS count_state
      |FROM iot.telemetry
      |GROUP BY device_id, ts
    """.stripMargin

  // Per-device 1-hour rolling mean (last 1 hour, single device)
  val querySql =
    """
      |SELECT
      |  toStartOfMinute(ts) AS minute,
      |  avg(metric_value)   AS avg_value,
      |  count(*)            AS sample_count
      |FROM iot.telemetry
      |WHERE device_id = 'device-A0001'
      |  AND ts >= now() - INTERVAL 1 HOUR
      |GROUP BY minute
      |ORDER BY minute
    """.stripMargin

  def queryRollingMean(ds: ClickHouseDataSource): Seq[(String, Double, Long)] = {
    val conn = ds.getConnection.asInstanceOf[ClickHouseConnection]
    val stmt = conn.createStatement
    val rs = stmt.executeQuery(querySql)
    Iterator.continually(rs).takeWhile(_.next()).map { r =>
      (r.getString("minute"), r.getDouble("avg_value"), r.getLong("sample_count"))
    }.toSeq
  }
}`,
      },
      {
        lang: "rust",
        filename: "clickhouse_iot_reader.rs",
        code: `use clickhouse::Client;
use serde::Deserialize;

// Rust IoT reader — uses clickhouse-rs async client.
// Use case: real-time anomaly detection dashboard showing per-device
// rolling stats from ClickHouse telemetry table.

#[derive(Debug, Deserialize)]
struct TelemetryRow {
    minute: String,
    avg_value: f64,
    sample_count: u64,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::default()
        .with_url("http://clickhouse.cluster.local:8123")
        .with_database("iot");

    // Anomaly: devices where last-hour mean is >3 sigma from 7-day mean
    // ClickHouse vectorised execution: full table scan still fast.
    let query = r#"
        WITH last_hour AS (
          SELECT device_id, avg(metric_value) AS h_avg
          FROM telemetry
          WHERE ts >= now() - INTERVAL 1 HOUR
          GROUP BY device_id
        ),
        last_week AS (
          SELECT device_id, avg(metric_value) AS w_avg,
                  stddevPop(metric_value) AS w_std
          FROM telemetry
          WHERE ts >= now() - INTERVAL 7 DAY
          GROUP BY device_id
        )
        SELECT l.device_id, l.h_avg, w.w_avg, w.w_std,
               abs(l.h_avg - w.w_avg) / w.w_std AS z_score
        FROM last_hour l JOIN last_week w USING device_id
        WHERE w.w_std > 0
          AND abs(l.h_avg - w.w_avg) / w.w_std > 3
        ORDER BY z_score DESC
        LIMIT 50
    "#;

    let anomalies: Vec<TelemetryRow> = client
        .query(query)
        .fetch_all().await?;

    println!("{} anomalies detected", anomalies.len());
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "clickhouse_iot_reader.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"

    "github.com/ClickHouse/clickhouse-go/v2"
)

// Go IoT reader — clickhouse-go driver for IoT telemetry analytics.
// Use case: AWS Lambda function that produces daily IoT rollup
// report per device class for the operations dashboard.

type Anomaly struct {
    DeviceID string
    HAvg     float64
    WAvg     float64
    WStd     float64
    ZScore   float64
}

func main() {
    conn, err := clickhouse.Open(&clickhouse.Options{
        Addr: []string{"clickhouse.cluster.local:9000"},
        Auth: clickhouse.Auth{Database: "iot"},
    })
    if err != nil { log.Fatal(err) }

    ctx := context.Background()
    rows, _ := conn.Query(ctx, \`
        WITH last_hour AS (
          SELECT device_id, avg(metric_value) AS h_avg
          FROM telemetry
          WHERE ts >= now() - INTERVAL 1 HOUR
          GROUP BY device_id
        ),
        last_week AS (
          SELECT device_id, avg(metric_value) AS w_avg,
                  stddevPop(metric_value) AS w_std
          FROM telemetry
          WHERE ts >= now() - INTERVAL 7 DAY
          GROUP BY device_id
        )
        SELECT l.device_id, l.h_avg, w.w_avg, w.w_std,
               abs(l.h_avg - w.w_avg) / w.w_std AS z_score
        FROM last_hour l JOIN last_week w USING device_id
        WHERE w.w_std > 0 AND abs(l.h_avg - w.w_avg) / w.w_std > 3
        ORDER BY z_score DESC
        LIMIT 50
    \`)

    for rows.Next() {
        var a Anomaly
        rows.Scan(&a.DeviceID, &a.HAvg, &a.WAvg, &a.WStd, &a.ZScore)
        fmt.Printf("Anomaly: %s z=%.2f (hourly=%.2f weekly=%.2f±%.2f)\\n",
            a.DeviceID, a.ZScore, a.HAvg, a.WAvg, a.WStd)
    }
}`,
      },
      {
        lang: "elixir",
        filename: "clickhouse_iot_reader.ex",
        code: `defmodule IoT.ClickHouseAnomalyDashboard do
  @moduledoc """
  Phoenix LiveView dashboard for IoT anomaly alerts. Queries ClickHouse
  for per-device z-score anomalies and broadcasts alerts via PubSub
  to on-call engineers' Slack channel.
  """
  use Phoenix.LiveView
  alias Clickhousex

  def render(assigns) do
    ~H"""
    <div>
      <h3>IoT anomaly alerts — live ({{length(@anomalies)}} active)</h3>
      <table>
        <tr><th>Device</th><th>Hour avg</th><th>Week avg ± std</th><th>Z-score</th></tr>
        <%= for a <- @anomalies do %>
          <tr>
            <td>{{a.device_id}}</td>
            <td>{{:fwi.format(a.h_avg, 2)}}</td>
            <td>{{:fwi.format(a.w_avg, 2)}} ± {{:fwi.format(a.w_std, 2)}}</td>
            <td style="color: red">{{:fwi.format(a.z_score, 2)}}</td>
          </tr>
        <% end %>
      </table>
    </div>
    """
  end

  def handle_event("refresh", _, socket) do
    sql = \"""
      WITH last_hour AS (
        SELECT device_id, avg(metric_value) AS h_avg
        FROM telemetry
        WHERE ts >= now() - INTERVAL 1 HOUR
        GROUP BY device_id
      ),
      last_week AS (
        SELECT device_id, avg(metric_value) AS w_avg,
                stddevPop(metric_value) AS w_std
        FROM telemetry
        WHERE ts >= now() - INTERVAL 7 DAY
        GROUP BY device_id
      )
      SELECT l.device_id, l.h_avg, w.w_avg, w.w_std,
             abs(l.h_avg - w.w_avg) / w.w_std AS z_score
      FROM last_hour l JOIN last_week w USING device_id
      WHERE w.w_std > 0 AND abs(l.h_avg - w.w_avg) / w.w_std > 3
      ORDER BY z_score DESC LIMIT 50
    \"""
    {:ok, _, rows} = Clickhousex.query(IoT.Repo, sql, [])
    anomalies = Enum.map(rows, fn [d, h, w, s, z] ->
      %{device_id: d, h_avg: h, w_avg: w, w_std: s, z_score: z}
    end)
    Phoenix.PubSub.broadcast(IoT.PubSub, "anomalies", {:new, anomalies})
    {:noreply, assign(socket, anomalies: anomalies)}
  end
end`,
      },
      {
        lang: "zig",
        filename: "clickhouse_iot_reader.zig",
        code: `const std = @import("std");
const ch = @import("clickhouse-zig");

// Zig IoT reader — ClickHouse native TCP protocol client (sub-ms
// per-row iteration). Use case: high-throughput anomaly detection
// service running on edge nodes co-located with the ClickHouse cluster.

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var conn = try ch.connect(allocator, .{
        .host = "clickhouse.cluster.local",
        .port = 9000,
        .database = "iot",
    });
    defer conn.disconnect();

    // Per-device 1-hour rolling mean — partition prune: 24 hourly
    // partitions, ORDER BY (device_id, ts) primary key prunes to one device
    const sql =
        \\\\SELECT toStartOfMinute(ts) AS minute,
        \\\\       avg(metric_value) AS avg_value,
        \\\\       count(*)          AS sample_count
        \\\\FROM telemetry
        \\\\WHERE device_id = 'device-A0001'
        \\\\  AND ts >= now() - INTERVAL 1 HOUR
        \\\\GROUP BY minute
        \\\\ORDER BY minute
    ;

    var result = try conn.query(allocator, sql);
    defer result.deinit();

    while (try result.next()) |row| {
        const minute: []const u8 = row.get_string("minute");
        const avg: f64 = row.get_float64("avg_value");
        const count: u64 = row.get_u64("sample_count");
        std.debug.print("{s}: avg={d:.4} n={d}\\n", .{ minute, avg, count });
    }
}`,
      },
    ],
    runnablePython: `# IoT Telemetry on ClickHouse — 1B events/day Pyodide simulation
import math
import random
from collections import defaultdict

print("=== IoT Telemetry on ClickHouse ===")
print("Scale: 1B events/day · 50M devices · 7TB raw → 500GB compressed (14:1)")
print("Engine: MergeTree partitioned by hour, ORDER BY (device_id, ts)")
print()

# Simulate 50,000 IoT devices sending telemetry every minute (scaled)
random.seed(42)
n_devices = 50_000  # scaled from 50M
metrics = ["temperature", "humidity", "pressure", "vibration", "voltage"]

# Generate 1 hour of telemetry (60 minutes × n_devices)
print("Generating 1 hour of telemetry (scaled to 60 × 50,000 events)...")
hourly_events = []
for minute in range(60):
    for device_id in range(n_devices):
        # Per-device baseline + noise + drift
        base = random.gauss(50, 10)
        metric = random.choice(metrics)
        value = base + math.sin(minute / 10) + random.gauss(0, 2)
        # Inject 0.5% anomalies (>3 sigma)
        if random.random() < 0.005:
            value = base + random.uniform(20, 50)  # anomaly
        hourly_events.append({
            "device_id": f"device-{device_id:05d}",
            "ts_minute": minute,
            "metric": metric,
            "value": value,
            "is_anomaly": abs(value - base) > 20,
        })

total_events = len(hourly_events)
print(f"  Generated: {total_events:,} events in 1 hour (simulated)")
print(f"  Compression ratio: ~14:1 → ~{total_events * 40 / 1024 / 14:.1f} KB compressed")
print()

# ClickHouse storage model
print("ClickHouse storage model:")
print("  Engine:       MergeTree")
print("  PARTITION BY: toStartOfHour(ts) — 1 partition per hour")
print("  ORDER BY:     (device_id, ts) — primary key")
print("  Compression:  LZ4 + delta encoding + columnar (14:1)")
print()

# Partition prune: query last 1 hour scans only 1 partition
print("Partition pruning for 'last 1 hour' query:")
print(f"  Total partitions:        8760 (1 year)")
print(f"  Scanned:                 1 partition (last hour)")
print(f"  Bytes scanned:           ~{total_events * 40 / 1024 / 14:.1f} KB")
print(f"  Query latency:           sub-second (MergeTree ORDER BY prune)")
print()

# Materialised view: per-device per-minute means (pre-aggregated)
print("Materialised view: iot.telemetry_per_minute (AggregatingMergeTree)")
print("  Pre-aggregates per (device_id, minute) avgState + countState")
print()

# Anomaly detection: z-score per device vs hour-mean
device_baselines = defaultdict(list)
for e in hourly_events:
    device_baselines[e["device_id"]].append(e["value"])

anomalies = []
for device_id, values in device_baselines.items():
    if len(values) < 2: continue
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    std = math.sqrt(variance)
    last = values[-1]
    if std > 0:
        z = abs(last - mean) / std
        if z > 3:
            anomalies.append({
                "device_id": device_id, "last": last,
                "mean": mean, "std": std, "z": z,
            })

print("Anomaly detection (z-score > 3):")
print(f"  Devices with anomalies: {len(anomalies):,} of {n_devices:,}")
print(f"  Anomaly rate:            {100 * len(anomalies) / n_devices:.2f}%")
print()
print("Top 10 anomalies:")
print(f"{'Device':<14} | {'Last':>8} | {'Mean':>8} | {'Std':>8} | {'Z':>8}")
print("-" * 55)
for a in sorted(anomalies, key=lambda a: -a["z"])[:10]:
    print(f"{a['device_id']:<14} | {a['last']:>8.2f} | {a['mean']:>8.2f} | {a['std']:>8.2f} | {a['z']:>8.2f}")

print()
print("Key insight: ClickHouse MergeTree + partition by hour +")
print("materialised views = sub-second queries on 1B-event tables.")
print("Yandex scales this pattern to 4 trillion rows per table in production.")`,
    insight: "ClickHouse IS the canonical IoT telemetry engine — its MergeTree family (MergeTree, ReplacingMergeTree, AggregatingMergeTree) is purpose-built for time-series sensor data. Partitioning by hour means a 'last 1 hour' query scans 1 partition of 8,760/year. Materialised views pre-aggregate per-device-per-minute means, so trend queries are O(1) not O(N). Yandex production scale (4T rows/table, 2PB+/node) proves the pattern works at the 1B-events/day IoT telemetry scale that defeats traditional warehouses.",
  },

  // ============================================================
  // 2. GENOMICS VARIANT QUERIES ON CLICKHOUSE (Life Sciences)
  // ============================================================
  {
    id: "clickhouse-genomics-3b-snps",
    step: "2",
    title: "Genomics Variant Queries on ClickHouse (3B SNPs, sub-second allele freq)",
    subtitle: "Life sciences — 3 billion reference SNPs with sub-second allele frequency lookup",
    accent: "oklch(0.65 0.16 30)",
    icon: <Microscope className="h-4 w-4" />,
    badge: "Life Sciences · Genomics",
    brief: {
      dataset: "Reference SNP (dbSNP) + 1000 Genomes allele frequencies: ~3 billion SNPs across 22 chromosomes, each annotated with allele frequency across 26 populations. Loaded into ClickHouse MergeTree partitioned by chrom, ORDER BY (chrom, pos) — sub-second allele frequency lookup for any genomic region or individual variant. Vectorised SIMD execution makes full-table scans across 3B rows complete in seconds.",
      scale: "3 billion SNPs × 26 populations × 22 chromosomes · ~50 GB compressed · sub-second regional allele freq query",
      why: "ClickHouse is the perfect genomics OLAP engine — variant queries are inherently analytical (allele frequency, genotype counts, regional summaries) and ClickHouse's vectorised SIMD execution scans billions of rows in seconds. Partitioning by chrom co-locates per-chromosome variants on disk, ORDER BY (chrom, pos) enables range pruning for any genomic region. The 50GB compressed footprint (vs 500GB in traditional warehouses) fits in memory on a single node — no cluster needed.",
    },
    stats: [
      { label: "Total SNPs", value: "~3 billion" },
      { label: "Populations", value: "26" },
      { label: "Compressed", value: "~50 GB" },
      { label: "Query latency", value: "sub-second" },
    ],
    tools: ["ClickHouse", "MergeTree", "AggregatingMergeTree", "dbSNP", "1000 Genomes", "Vectorised SIMD", "Grafana"],
    codeTabs: [
      {
        lang: "scala",
        filename: "ClickHouseGenomics.scala",
        code: `import com.clickhouse.jdbc.{ClickHouseConnection, ClickHouseDataSource}
import scala.collection.JavaConverters._

// Genomics variant queries on ClickHouse — 3B SNPs, sub-second allele freq
object ClickHouseGenomics {
  val url = "jdbc:ch://clickhouse.cluster.local:8123/genomics"

  // Create the SNP allele frequency table
  // MergeTree partitioned by chrom, ORDER BY (chrom, pos) for range prune
  val createSql =
    """
      |CREATE TABLE genomics.snp_af (
      |  chrom           LowCardinality(String),
      |  pos             UInt64,
      |  ref_allele      LowCardinality(String),
      |  alt_allele      LowCardinality(String),
      |  rs_id           String,
      |  population      LowCardinality(String),
      |  allele_count    UInt32,
      |  total_genotypes UInt32,
      |  af              Float32
      |) ENGINE = MergeTree
      |PARTITION BY chrom
      |ORDER BY (chrom, pos)
      |SETTINGS index_granularity = 8192
    """.stripMargin

  // Materialised view: per-position aggregated allele frequency
  // AggregatingMergeTree keeps avgState + countState for streaming merge
  val mvSql =
    """
      |CREATE MATERIALIZED VIEW genomics.snp_af_aggregate
      |ENGINE = AggregatingMergeTree
      |PARTITION BY chrom
      |ORDER BY (chrom, pos, ref_allele, alt_allele)
      |AS SELECT
      |  chrom, pos, ref_allele, alt_allele,
      |  sumState(allele_count)    AS ac_state,
      |  sumState(total_genotypes) AS tg_state
      |FROM genomics.snp_af
      |GROUP BY chrom, pos, ref_allele, alt_allele
    """.stripMargin

  // Sub-second allele frequency for BRCA1 region (chr17:41.2M-41.3M)
  val brca1Sql =
    """
      |SELECT
      |  pos, ref_allele, alt_allele, rs_id, population,
      |  allele_count, total_genotypes, af
      |FROM genomics.snp_af
      |WHERE chrom = '17' AND pos BETWEEN 41196311 AND 41277500
      |  AND population = 'AFR'  -- African population allele freqs
      |ORDER BY pos, alt_allele
    """.stripMargin

  def queryBRCA1(ds: ClickHouseDataSource): Seq[(Long, String, String, String, String, Int, Int, Float)] = {
    val conn = ds.getConnection.asInstanceOf[ClickHouseConnection]
    val rs = conn.createStatement.executeQuery(brca1Sql)
    Iterator.continually(rs).takeWhile(_.next()).map { r =>
      (r.getLong("pos"), r.getString("ref_allele"), r.getString("alt_allele"),
       r.getString("rs_id"), r.getString("population"),
       r.getInt("allele_count"), r.getInt("total_genotypes"), r.getFloat("af"))
    }.toSeq
  }
}`,
      },
      {
        lang: "rust",
        filename: "clickhouse_genomics_reader.rs",
        code: `use clickhouse::Client;
use serde::Deserialize;

// Rust genomics reader — uses clickhouse-rs async client.
// Use case: clinical genomics service that returns allele frequency
// for a patient variant list in <50ms total round-trip.

#[derive(Debug, Deserialize)]
struct AlleleFreq {
    pos: u64,
    ref_allele: String,
    alt_allele: String,
    rs_id: String,
    af: f32,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::default()
        .with_url("http://clickhouse.cluster.local:8123")
        .with_database("genomics");

    // Allele frequency spectrum for chr17 in 1000 Genomes
    // ClickHouse vectorised SIMD: scans 3B rows in seconds.
    let query = r#"
        SELECT
          pos, ref_allele, alt_allele, rs_id, af
        FROM snp_af
        WHERE chrom = '17'
          AND pos BETWEEN 41196311 AND 41277500
          AND population = 'AFR'
        ORDER BY pos, alt_allele
    "#;

    let variants: Vec<AlleleFreq> = client
        .query(query)
        .fetch_all().await?;

    for v in &variants {
        println!("chr17:{} {}>{} rs={} af={:.4}",
            v.pos, v.ref_allele, v.alt_allele, v.rs_id, v.af);
    }
    println!("Total variants in BRCA1 region: {}", variants.len());
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "clickhouse_genomics_reader.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"

    "github.com/ClickHouse/clickhouse-go/v2"
)

// Go genomics reader — clickhouse-go driver.
// Use case: AWS Lambda that annotates patient sample VCF with
// allele frequencies from 1000 Genomes on ClickHouse.

type AlleleFreq struct {
    Pos       uint64
    Ref       string
    Alt       string
    RsID      string
    AF        float32
}

func main() {
    conn, _ := clickhouse.Open(&clickhouse.Options{
        Addr: []string{"clickhouse.cluster.local:9000"},
        Auth: clickhouse.Auth{Database: "genomics"},
    })

    ctx := context.Background()
    rows, _ := conn.Query(ctx, \`
        SELECT
          pos, ref_allele, alt_allele, rs_id, af
        FROM snp_af
        WHERE chrom = '17'
          AND pos BETWEEN 41196311 AND 41277500
          AND population = 'AFR'
        ORDER BY pos, alt_allele
    \`)

    for rows.Next() {
        var a AlleleFreq
        rows.Scan(&a.Pos, &a.Ref, &a.Alt, &a.RsID, &a.AF)
        fmt.Printf("chr17:%d %s>%s rs=%s af=%.4f\\n",
            a.Pos, a.Ref, a.Alt, a.RsID, a.AF)
    }
}`,
      },
      {
        lang: "elixir",
        filename: "clickhouse_genomics_reader.ex",
        code: `defmodule Genomics.ClickHouseAlleleFreq do
  @moduledoc """
  Phoenix LiveView dashboard that queries ClickHouse for allele
  frequencies in user-selected genomic regions. Returns interactive
  frequency spectrum chart for population geneticists.
  """
  use Phoenix.LiveView
  alias Clickhousex

  def render(assigns) do
    ~H"""
    <div>
      <h3>Allele frequency spectrum — {{@chrom}}:{{@start}}-{{@end}}</h3>
      <table>
        <tr><th>Pos</th><th>Ref</th><th>Alt</th><th>rsID</th><th>AF</th></tr>
        <%= for v <- @variants do %>
          <tr>
            <td><%= v.pos %></td>
            <td><%= v.ref %></td>
            <td><%= v.alt %></td>
            <td><%= v.rs_id %></td>
            <td><%= :fwi.format(v.af, 4) %></td>
          </tr>
        <% end %>
      </table>
    </div>
    """
  end

  def handle_event("query", %{"chrom" => chrom, "start" => s, "end" => e,
                              "population" => pop}, socket) do
    sql = \"""
      SELECT pos, ref_allele, alt_allele, rs_id, af
      FROM snp_af
      WHERE chrom = '#{chrom}'
        AND pos BETWEEN #{s} AND #{e}
        AND population = '#{pop}'
      ORDER BY pos, alt_allele
    \"""
    {:ok, _, rows} = Clickhousex.query(Genomics.Repo, sql, [])
    variants = Enum.map(rows, fn [p, r, a, rs, af] ->
      %{pos: p, ref: r, alt: a, rs_id: rs, af: af}
    end)
    {:noreply, assign(socket,
      variants: variants, chrom: chrom, start: s, end: e)}
  end
end`,
      },
      {
        lang: "zig",
        filename: "clickhouse_genomics_reader.zig",
        code: `const std = @import("std");
const ch = @import("clickhouse-zig");

// Zig genomics reader — ClickHouse native TCP protocol.
// Sub-ms per-row iteration for high-throughput clinical genomics
// annotation (100s of patient samples per day × 1,000s of variants each).

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var conn = try ch.connect(allocator, .{
        .host = "clickhouse.cluster.local",
        .port = 9000,
        .database = "genomics",
    });
    defer conn.disconnect();

    // Sub-second allele frequency for BRCA1 region via
    // PARTITION BY chrom prune (1 of 25 partitions)
    // + ORDER BY (chrom, pos) primary key range prune
    const sql =
        \\\\SELECT pos, ref_allele, alt_allele, rs_id, af
        \\\\FROM snp_af
        \\\\WHERE chrom = '17'
        \\\\  AND pos BETWEEN 41196311 AND 41277500
        \\\\  AND population = 'AFR'
        \\\\ORDER BY pos, alt_allele
    ;

    var result = try conn.query(allocator, sql);
    defer result.deinit();

    var total: usize = 0;
    while (try result.next()) |row| {
        const pos: u64 = row.get_u64("pos");
        const rs_id: []const u8 = row.get_string("rs_id");
        const af: f32 = row.get_float32("af");
        total += 1;
        if (total <= 5 or total % 100 == 0) {
            std.debug.print("chr17:{d} {s} af={d:.4}\\n", .{ pos, rs_id, af });
        }
    }
    std.debug.print("Total variants: {d}\\n", .{total});
}`,
      },
    ],
    runnablePython: `# Genomics on ClickHouse — 3B SNPs allele frequency simulation (Pyodide)
import math
import random
from collections import defaultdict

print("=== Genomics Variant Queries on ClickHouse ===")
print("Dataset: dbSNP + 1000 Genomes allele frequencies on ~3 billion reference SNPs")
print("Scale: 3B SNPs × 26 populations × 22 chromosomes · ~50 GB compressed")
print()

# Simulate SNPs for chr17 BRCA1 region
random.seed(42)
brca1_start = 41_196_311
brca1_end   = 41_277_500
n_snps_region = 5000  # BRCA1 has ~5k known SNPs
populations = ["AFR", "AMR", "EUR", "EAS", "SAS", "EAS"]

# Generate synthetic allele frequency records for chr17
snps = []
for s in range(n_snps_region):
    pos = random.randint(brca1_start, brca1_end)
    ref = random.choice("ACGT")
    alt = random.choice([b for b in "ACGT" if b != ref])
    rs_id = f"rs{random.randint(100_000_000, 1_500_000_000)}"
    for pop in populations:
        # Allele frequency varies per population
        base_af = random.uniform(0, 0.5)
        pop_variance = random.gauss(0, 0.05)
        af = max(0, min(1, base_af + pop_variance))
        allele_count = int(af * 2 * random.randint(100, 200))
        total_genotypes = 2 * 200  # diploid
        snps.append({
            "chrom": "chr17", "pos": pos, "ref": ref, "alt": alt,
            "rs_id": rs_id, "population": pop,
            "allele_count": allele_count, "total_genotypes": total_genotypes,
            "af": af,
        })

# ClickHouse storage model
print("ClickHouse storage model:")
print("  Engine:       MergeTree")
print("  PARTITION BY: chrom (25 partitions: chr1-22, X, Y, MT)")
print("  ORDER BY:     (chrom, pos) — primary key")
print("  Compression:  LZ4 + delta + LowCardinality(String) for ref/alt")
print(f"  Total SNPs (simulated): {len(snps):,} ({len(snps)/n_snps_region:.0f}x for 6 populations)")
print(f"  Compressed size:       ~{len(snps) * 30 / 1024 / 1024:.2f} MB (sim); ~50 GB at 3B SNP scale")
print()

# Query: BRCA1 region allele frequency for AFR population (sub-second)
print("Query: BRCA1 region allele frequencies (AFR population)")
print("  PARTITION prune: chr17 single partition (1 of 25)")
print("  ORDER BY prune:  pos BETWEEN 41196311 AND 41277500")
print()
afr_snps = [s for s in snps if s["population"] == "AFR"]
print(f"  Variants found:  {len(afr_snps)}")
print(f"  Bytes scanned:    ~{len(afr_snps) * 30 / 1024:.1f} KB (vs 50GB full table)")
print(f"  Latency:          sub-second (partition + primary key prune)")
print()

# Show top 10 highest-frequency variants in AFR
print("Top 10 highest-frequency variants (AFR population):")
print(f"{'Pos':<10} | {'Ref':<3} | {'Alt':<3} | {'rsID':<14} | {'AF':<6} | {'Calls':<6}")
print("-" * 60)
afr_snps.sort(key=lambda s: -s["af"])
for s in afr_snps[:10]:
    print(f"{s['pos']:<10} | {s['ref']:<3} | {s['alt']:<3} | {s['rs_id']:<14} | {s['af']:.4f} | {s['allele_count']}/{s['total_genotypes']}")

# Population frequency divergence
print()
print("Population divergence for top 5 variants:")
print(f"{'Pos':<10} | {'rsID':<14} | " + " | ".join(f"{p:<6}" for p in populations))
print("-" * 75)
# Pick top 5 variants
top5_pos = list({s["pos"] for s in afr_snps[:5]})
for pos in top5_pos:
    pos_snps = [s for s in snps if s["pos"] == pos]
    rs_id = pos_snps[0]["rs_id"]
    ref = pos_snps[0]["ref"]
    alt = pos_snps[0]["alt"]
    pop_freqs = []
    for pop in populations:
        s = next((x for x in pos_snps if x["population"] == pop), None)
        pop_freqs.append(f"{s['af']:.3f}" if s else "—")
    print(f"{pos:<10} | {rs_id:<14} | " + " | ".join(f"{f:<6}" for f in pop_freqs))

print()
print("ClickHouse vectorised SIMD execution:")
print("  - Processes 8-16 columns in parallel via AVX2/AVX-512")
print("  - 3B-row allele frequency spectrum query: ~2 seconds (single node)")
print("  - Same query on traditional warehouses: ~30 seconds (cluster)")
print()
print("Key insight: ClickHouse's MergeTree partition by chrom + ORDER BY")
print("(chrom, pos) = sub-second allele frequency lookup for any genomic")
print("region. The 50GB compressed footprint fits on a single node — no")
print("cluster needed for 3B SNPs. Yandex scales the same pattern to 4T rows.")`,
    insight: "ClickHouse is the perfect genomics OLAP engine — variant queries are inherently analytical and ClickHouse's vectorised SIMD execution scans billions of rows in seconds. PARTITION BY chrom co-locates per-chromosome variants on disk; ORDER BY (chrom, pos) enables range pruning for any genomic region. The 50GB compressed footprint for 3B SNPs fits in memory on a single node — no cluster needed. Sub-second allele frequency queries on 3 billion SNPs is the canonical ClickHouse genomics use case, used in production at Cerner, Roche, and 23andMe.",
  },
];

