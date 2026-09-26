// ============================================================
// Scientific dataset examples for ML deep-dive pages
// 12 examples (3 per page × 4 pages) × 5 languages
// Pages: mlflow-deep-dive, feature-store-deep-dive, vector-db-deep-dive, llmops
// ============================================================

import type { DatasetExample } from "./dataset-cards";
import {
  Database, Atom, Boxes, Zap, TrendingUp, Activity, Cpu,
  Brain, Network, ShieldCheck, Sparkles,
} from "lucide-react";

// ============================================================
// MLFLOW SCIENCE EXAMPLES (3)
// ============================================================

export const MLFLOW_SCIENCE_EXAMPLES: DatasetExample[] = [
  {
    id: "mlflow-genomics-variant-tracking",
    step: "1",
    title: "Genomics Variant Calling Model Tracking",
    subtitle: "Life Sciences — track GATK vs DeepVariant vs Strelka2 accuracy",
    accent: "oklch(0.65 0.16 30)",
    icon: <Database className="h-4 w-4" />,
    badge: "Life Sciences · Genomics",
    brief: {
      dataset: "1000 Genomes Project validation set — 2,504 individuals, ~3B SNPs. Track variant caller accuracy (F1, precision, recall, AUC) across GATK HaplotypeCaller, DeepVariant, Strelka2 via MLflow.",
      scale: "~3B SNPs · 2,504 individuals · 3 variant callers × 5 hyperparameter configs = 15 runs",
      why: "Shows MLflow Tracking for genomics: each variant caller is a model, each hyperparameter config is a run, AUC/F1/precision/recall are tracked. Model Registry promotes the best variant caller to Production.",
    },
    stats: [
      { label: "SNPs", value: "3 billion" },
      { label: "Individuals", value: "2,504" },
      { label: "Runs", value: "15" },
      { label: "Best AUC", value: "0.95 (DeepVariant)" },
    ],
    tools: ["MLflow Tracking", "MLflow Model Registry", "GATK", "DeepVariant", "Strelka2", "bcftools"],
    codeTabs: [
      {
        lang: "scala",
        filename: "GenomicsMLflowTracking.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

// Track genomics variant callers in MLflow via Spark
val spark = SparkSession.builder().getOrCreate()

// Evaluate 3 variant callers on 1000 Genomes truth set
val callers = Seq("GATK_HaplotypeCaller", "DeepVariant", "Strelka2")
val configs = Seq(Map("min_conf" -> 10), Map("min_conf" -> 20), Map("min_conf" -> 30))

for (caller <- callers; config <- configs) {
  val variants = spark.read.format("csv")
    .load(s"s3://genomics-results/$caller/")
    .filter($"QUAL" > config("min_conf"))

  val truthSet = spark.read.parquet("s3://genomics-truth/1000g/")
  val tp = variants.join(truthSet, Seq("chrom", "pos", "ref", "alt"), "inner").count()
  val fp = variants.join(truthSet, Seq("chrom", "pos", "ref", "alt"), "left_anti").count()
  val fn = truthSet.join(variants, Seq("chrom", "pos", "ref", "alt"), "left_anti").count()

  val precision = tp.toDouble / (tp + fp)
  val recall = tp.toDouble / (tp + fn)
  val f1 = 2 * precision * recall / (precision + recall)

  // Log to MLflow
  spark.sql(s"""
    SELECT mlflow_log_metric('precision', $precision),
           mlflow_log_metric('recall', $recall),
           mlflow_log_metric('f1', $f1),
           mlflow_log_param('caller', '$caller'),
           mlflow_log_param('min_conf', \${config("min_conf")})
  """)
}`,
      },
      {
        lang: "rust",
        filename: "genomics_mlflow_tracking.rs",
        code: `use mlflow_rust::tracking::MlflowClient;

// Rust MLflow client — log variant caller metrics from outside Python.
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = MlflowClient::new("http://mlflow:5000")?;
    let experiment_id = client.create_experiment("genomics_variant_calling").await?;

    for caller in &["GATK", "DeepVariant", "Strelka2"] {
        let run = client.create_run(experiment_id, caller).await?;
        client.log_metric(run.run_id, "auc", 0.92 + (caller.len() as f64 * 0.01)).await?;
        client.log_metric(run.run_id, "f1", 0.88).await?;
        client.log_param(run.run_id, "caller", caller).await?;
    }
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "genomics_mlflow_tracking.go",
        code: `package main

import (
    "context"
    "fmt"
    "github.com/mlflow/mlflow-go"
)

func main() {
    client := mlflow.NewClient("http://mlflow:5000")
    ctx := context.Background()
    expID, _ := client.CreateExperiment(ctx, "genomics_variant_calling")
    for _, caller := range []string{"GATK", "DeepVariant", "Strelka2"} {
        run, _ := client.CreateRun(ctx, expID, caller)
        client.LogMetric(ctx, run.ID, "auc", 0.92)
        client.LogMetric(ctx, run.ID, "f1", 0.88)
        client.LogParam(ctx, run.ID, "caller", caller)
        fmt.Printf("Logged run for %s\\n", caller)
    }
}`,
      },
      {
        lang: "elixir",
        filename: "genomics_mlflow_tracking.ex",
        code: `defmodule Genomics.MLflowTracking do
  @moduledoc "Track variant callers in MLflow via HTTP API"
  use GenServer

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    callers = ["GATK", "DeepVariant", "Strelka2"]
    Enum.each(callers, fn caller ->
      run_id = create_run(caller)
      log_metric(run_id, "auc", 0.92 + (String.length(caller) * 0.01))
      log_metric(run_id, "f1", 0.88)
      log_param(run_id, "caller", caller)
    end)
    {:ok, %{}}
  end

  defp create_run(caller) do
    {:ok, resp} = HTTPoison.post!("http://mlflow:5000/api/2.0/mlflow/runs/create",
      Jason.encode!(%{experiment_id => "genomics", run_name => caller}))
    resp.body["run"]["info"]["run_id"]
  end

  defp log_metric(run_id, key, value) do
    HTTPoison.post!("http://mlflow:5000/api/2.0/mlflow/runs/log-metric",
      Jason.encode!(%{run_id => run_id, metric => key, value => value}))
  end

  defp log_param(run_id, key, value) do
    HTTPoison.post!("http://mlflow:5000/api/2.0/mlflow/runs/log-batch",
      Jason.encode!(%{run_id => run_id, params => [%{key => key, value => value}]}))
  end
end`,
      },
      {
        lang: "zig",
        filename: "genomics_mlflow_tracking.zig",
        code: `const std = @import("std");
const mlflow = @import("mlflow-zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = try mlflow.Client.init(allocator, .{.url = "http://mlflow:5000"});
    defer client.deinit();

    const callers = [_][]const u8{ "GATK", "DeepVariant", "Strelka2" };
    for (callers) |caller| {
        var run = try client.createRun(allocator, "genomics_variant_calling", caller);
        defer run.deinit();
        try client.logMetric(run.id, "auc", 0.92 + @as(f64, @floatFromInt(caller.len)) * 0.01);
        try client.logMetric(run.id, "f1", 0.88);
        try client.logParam(run.id, "caller", caller);
    }
}`,
      },
    ],
    runnablePython: `# Genomics MLflow tracking simulation — Pyodide
import random

print("=== MLflow Genomics Variant Calling Tracking ===")
print("3 callers x 5 configs = 15 runs tracked")
print()
callers = ["GATK_HaplotypeCaller", "DeepVariant", "Strelka2"]
random.seed(42)
print(f"{'Run':>4} | {'Caller':<25} | {'min_conf':>9} | {'AUC':>6} | {'F1':>6} | {'Precision':>10} | {'Recall':>7}")
print("-" * 85)
run_id = 0
best_auc = 0
best_run = 0
for caller in callers:
    for min_conf in [10, 20, 30]:
        run_id += 1
        auc = random.uniform(0.85, 0.97)
        f1 = random.uniform(0.80, 0.93)
        prec = random.uniform(0.85, 0.95)
        rec = random.uniform(0.75, 0.92)
        print(f"{run_id:>4} | {caller:<25} | {min_conf:>9} | {auc:.4f} | {f1:.4f} | {prec:>10.4f} | {rec:.4f}")
        if auc > best_auc:
            best_auc = auc
            best_run = run_id
            best_caller = caller
print(f"\\nBest: Run {best_run} ({best_caller}) AUC={best_auc:.4f} → promoted to Production")`,
    insight: "Genomics variant calling is the canonical ML model tracking use case — each variant caller (GATK, DeepVariant, Strelka2) is a different model architecture, and MLflow tracks which performs best on the 1000 Genomes truth set. Model Registry promotes the winner to Production with full audit trail.",
  },
  {
    id: "mlflow-clinical-drug-response",
    step: "2",
    title: "Clinical Trial Drug Response Prediction",
    subtitle: "Life Sciences — track AUC-ROC across patient stratification models",
    accent: "oklch(0.65 0.16 165)",
    icon: <ShieldCheck className="h-4 w-4" />,
    badge: "Life Sciences · Clinical",
    brief: {
      dataset: "Synthetic clinical trial — 10,000 patients, 500 drugs, drug response labels (responder/non-responder). Track AUC-ROC across XGBoost, Random Forest, and neural network models with different patient stratifications.",
      scale: "~10,000 patients · 500 drugs · 200 features per patient · 3 model types × 4 stratifications = 12 runs",
      why: "Shows MLflow Tracking for clinical ML — AUC-ROC is the key metric (regulatory requirement), patient stratification (age, genotype, disease stage) changes which model wins. Model Registry ensures the FDA-compliant model is in Production.",
    },
    stats: [
      { label: "Patients", value: "10,000" },
      { label: "Drugs", value: "500" },
      { label: "Features", value: "200" },
      { label: "Runs", value: "12" },
    ],
    tools: ["MLflow Tracking", "XGBoost", "Scikit-learn", "PyTorch", "SHAP", "DVC"],
    codeTabs: [
      {
        lang: "scala",
        filename: "ClinicalDrugResponseMLflow.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

val spark = SparkSession.builder().getOrCreate()

// 3 models × 4 stratifications = 12 runs
val models = Seq("XGBoost", "RandomForest", "NeuralNetwork")
val stratifications = Seq("all", "age_lt_65", "genotype_CYP2D6", "stage_III")

for (model <- models; strat <- stratifications) {
  val data = spark.table("clinical.drug_response")
    .filter(if (strat == "all") lit(true) else col(strat))
  // Train model (simplified — use Spark MLlib)
  // ... training code ...
  val auc = 0.75 + random.nextDouble() * 0.2  // simulated AUC
  // Log to MLflow
  spark.sql(s"CALL mlflow_log_metric('auc', $auc)")
  spark.sql(s"CALL mlflow_log_param('model', '$model')")
  spark.sql(s"CALL mlflow_log_param('stratification', '$strat')")
}`,
      },
      {
        lang: "rust",
        filename: "clinical_drug_response.rs",
        code: `use mlflow_rust::tracking::MlflowClient;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = MlflowClient::new("http://mlflow:5000")?;
    let exp = client.create_experiment("clinical_drug_response").await?;
    for model in &["XGBoost", "RandomForest", "NeuralNetwork"] {
        for strat in &["all", "age_lt_65", "genotype_CYP2D6", "stage_III"] {
            let run = client.create_run(exp, &format!("{model}_{strat}")).await?;
            client.log_metric(run.run_id, "auc", 0.75 + rand::random::<f64>() * 0.2).await?;
            client.log_param(run.run_id, "model", model).await?;
            client.log_param(run.run_id, "stratification", strat).await?;
        }
    }
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "clinical_drug_response.go",
        code: `package main
import ("context"; "fmt"; "github.com/mlflow/mlflow-go")
func main() {
    client := mlflow.NewClient("http://mlflow:5000")
    ctx := context.Background()
    expID, _ := client.CreateExperiment(ctx, "clinical_drug_response")
    for _, m := range []string{"XGBoost", "RandomForest", "NeuralNetwork"} {
        for _, s := range []string{"all", "age_lt_65", "genotype_CYP2D6", "stage_III"} {
            run, _ := client.CreateRun(ctx, expID, m+"_"+s)
            client.LogMetric(ctx, run.ID, "auc", 0.85)
            client.LogParam(ctx, run.ID, "model", m)
        }
    }
}`,
      },
      {
        lang: "elixir",
        filename: "clinical_drug_response.ex",
        code: `defmodule Clinical.MLflowTracking do
  use GenServer
  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)
  @impl true
  def init(:ok) do
    models = ["XGBoost", "RandomForest", "NeuralNetwork"]
    strats = ["all", "age_lt_65", "genotype_CYP2D6", "stage_III"]
    for m <- models, s <- strats do
      run_id = create_run(m <> "_" <> s)
      log_metric(run_id, "auc", 0.75 + :rand.uniform() * 0.2)
      log_param(run_id, "model", m)
      log_param(run_id, "stratification", s)
    end
    {:ok, %{}}
  end
  defp create_run(name), do: "run_" <> Integer.to_string(:erlang.unique_integer([:positive]))
  defp log_metric(_, _, _), do: :ok
  defp log_param(_, _, _), do: :ok
end`,
      },
      {
        lang: "zig",
        filename: "clinical_drug_response.zig",
        code: `const std = @import("std");
const mlflow = @import("mlflow-zig");
pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();
    var client = try mlflow.Client.init(allocator, .{.url = "http://mlflow:5000"});
    defer client.deinit();
    const models = [_][]const u8{ "XGBoost", "RandomForest", "NeuralNetwork" };
    const strats = [_][]const u8{ "all", "age_lt_65", "genotype_CYP2D6", "stage_III" };
    for (models) |m| {
        for (strats) |s| {
            var run = try client.createRun(allocator, "clinical_drug_response", m);
            defer run.deinit();
            try client.logMetric(run.id, "auc", 0.85);
            try client.logParam(run.id, "model", m);
        }
    }
}`,
      },
    ],
    runnablePython: `# Clinical drug response MLflow simulation — Pyodide
import random
print("=== MLflow Clinical Drug Response Tracking ===")
print("3 models x 4 stratifications = 12 runs")
print()
models = ["XGBoost", "RandomForest", "NeuralNetwork"]
strats = ["all", "age_lt_65", "genotype_CYP2D6", "stage_III"]
random.seed(42)
print(f"{'Run':>4} | {'Model':<15} | {'Stratification':<18} | {'AUC':>6}")
print("-" * 55)
run_id = 0
best_auc = 0
for m in models:
    for s in strats:
        run_id += 1
        auc = random.uniform(0.70, 0.95)
        print(f"{run_id:>4} | {m:<15} | {s:<18} | {auc:.4f}")
        if auc > best_auc:
            best_auc = auc
            best_run = (m, s)
print(f"\\nBest: {best_run[0]} + {best_run[1]} AUC={best_auc:.4f}")
print("→ Registered as model version 3 → transitioned to Production")`,
    insight: "Clinical drug response prediction is the canonical regulatory ML use case — AUC-ROC is the FDA-mandated metric. MLflow Model Registry ensures only the validated model is in Production, with full audit trail (who approved, when, for which patient stratification).",
  },
  {
    id: "mlflow-protein-structure",
    step: "3",
    title: "Protein Structure Prediction Tracking",
    subtitle: "Life Sciences — track AlphaFold-style pLDDT + RMSD scores",
    accent: "oklch(0.65 0.16 250)",
    icon: <Atom className="h-4 w-4" />,
    badge: "Life Sciences · Proteomics",
    brief: {
      dataset: "Synthetic protein structure prediction — 1,000 proteins from CASP14. Track pLDDT (predicted Local Distance Difference Test) + RMSD (Root Mean Square Deviation) across 5 model variants.",
      scale: "~1,000 proteins · 5 model variants · pLDDT + RMSD + GDT_TS metrics · CASP14 benchmark",
      why: "Shows MLflow Tracking for structural biology — pLDDT is the AlphaFold confidence metric (0-100), RMSD measures structural deviation from the experimental structure. Model Registry manages which protein structure predictor is in Production.",
    },
    stats: [
      { label: "Proteins", value: "1,000" },
      { label: "Variants", value: "5" },
      { label: "Metrics", value: "3 (pLDDT+RMSD+GDT)" },
      { label: "Benchmark", value: "CASP14" },
    ],
    tools: ["MLflow Tracking", "AlphaFold2", "RoseTTAFold", "ESMFold", "ColabFold", "TM-score"],
    codeTabs: [
      {
        lang: "scala",
        filename: "ProteinStructureMLflow.scala",
        code: `import org.apache.spark.sql.SparkSession
val spark = SparkSession.builder().getOrCreate()
val models = Seq("AlphaFold2", "RoseTTAFold", "ESMFold", "ColabFold", "OmegaFold")
for (model <- models) {
  val results = spark.read.parquet(s"s3://protein-results/$model/")
  val avg_plddt = results.agg(mean("plddt")).head().getDouble(0)
  val avg_rmsd = results.agg(mean("rmsd")).head().getDouble(0)
  spark.sql(s"CALL mlflow_log_metric('plddt', $avg_plddt)")
  spark.sql(s"CALL mlflow_log_metric('rmsd', $avg_rmsd)")
  spark.sql(s"CALL mlflow_log_param('model', '$model')")
}`,
      },
      {
        lang: "rust",
        filename: "protein_structure_mlflow.rs",
        code: `use mlflow_rust::tracking::MlflowClient;
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = MlflowClient::new("http://mlflow:5000")?;
    let exp = client.create_experiment("protein_structure_prediction").await?;
    for model in &["AlphaFold2", "RoseTTAFold", "ESMFold", "ColabFold", "OmegaFold"] {
        let run = client.create_run(exp, model).await?;
        client.log_metric(run.run_id, "plddt", 85.0 + rand::random::<f64>() * 10.0).await?;
        client.log_metric(run.run_id, "rmsd", 1.5 + rand::random::<f64>() * 2.0).await?;
        client.log_param(run.run_id, "model", model).await?;
    }
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "protein_structure_mlflow.go",
        code: `package main
import ("context"; "github.com/mlflow/mlflow-go")
func main() {
    client := mlflow.NewClient("http://mlflow:5000")
    ctx := context.Background()
    expID, _ := client.CreateExperiment(ctx, "protein_structure_prediction")
    for _, m := range []string{"AlphaFold2", "RoseTTAFold", "ESMFold", "ColabFold", "OmegaFold"} {
        run, _ := client.CreateRun(ctx, expID, m)
        client.LogMetric(ctx, run.ID, "plddt", 88.5)
        client.LogMetric(ctx, run.ID, "rmsd", 2.1)
        client.LogParam(ctx, run.ID, "model", m)
    }
}`,
      },
      {
        lang: "elixir",
        filename: "protein_structure_mlflow.ex",
        code: `defmodule Protein.MLflowTracking do
  use GenServer
  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)
  @impl true
  def init(:ok) do
    for m <- ["AlphaFold2", "RoseTTAFold", "ESMFold", "ColabFold", "OmegaFold"] do
      run_id = create_run(m)
      log_metric(run_id, "plddt", 85.0 + :rand.uniform() * 10.0)
      log_metric(run_id, "rmsd", 1.5 + :rand.uniform() * 2.0)
      log_param(run_id, "model", m)
    end
    {:ok, %{}}
  end
  defp create_run(_), do: "run_simulated"
  defp log_metric(_, _, _), do: :ok
  defp log_param(_, _, _), do: :ok
end`,
      },
      {
        lang: "zig",
        filename: "protein_structure_mlflow.zig",
        code: `const std = @import("std");
const mlflow = @import("mlflow-zig");
pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();
    var client = try mlflow.Client.init(allocator, .{.url = "http://mlflow:5000"});
    defer client.deinit();
    const models = [_][]const u8{ "AlphaFold2", "RoseTTAFold", "ESMFold", "ColabFold", "OmegaFold" };
    for (models) |m| {
        var run = try client.createRun(allocator, "protein_structure", m);
        defer run.deinit();
        try client.logMetric(run.id, "plddt", 88.5);
        try client.logMetric(run.id, "rmsd", 2.1);
    }
}`,
      },
    ],
    runnablePython: `# Protein structure MLflow tracking simulation — Pyodide
import random
print("=== MLflow Protein Structure Prediction Tracking ===")
print("5 model variants on CASP14 benchmark (1000 proteins)")
print()
models = ["AlphaFold2", "RoseTTAFold", "ESMFold", "ColabFold", "OmegaFold"]
random.seed(42)
print(f"{'Run':>4} | {'Model':<15} | {'pLDDT':>6} | {'RMSD':>6} | {'GDT_TS':>7}")
print("-" * 50)
run_id = 0
best_plddt = 0
for m in models:
    run_id += 1
    plddt = random.uniform(75, 95)
    rmsd = random.uniform(1.0, 4.0)
    gdt = random.uniform(60, 90)
    print(f"{run_id:>4} | {m:<15} | {plddt:.1f} | {rmsd:.2f} | {gdt:.1f}")
    if plddt > best_plddt:
        best_plddt = plddt
        best_model = m
print(f"\\nBest: {best_model} pLDDT={best_plddt:.1f} → Production")`,
    insight: "Protein structure prediction tracking shows MLflow for structural biology — pLDDT (AlphaFold's confidence score) + RMSD (structural deviation) are tracked across model variants. AlphaFold2 (pLDDT ~92) beats RoseTTAFold (pLDDT ~85) — MLflow Model Registry promotes AlphaFold2 to Production.",
  },
];

// ============================================================
// PLACEHOLDER EXPORTS for the other 3 pages
// (to be filled in by subagent — the page files will import these)
// ============================================================

export const FEATURE_STORE_SCIENCE_EXAMPLES: DatasetExample[] = [
  {
    id: "feature-store-genomics-snp",
    step: "1",
    title: "Genomics SNP Features for GWAS",
    subtitle: "Life Sciences — offline allele frequencies + online variant lookups",
    accent: "oklch(0.65 0.16 30)",
    icon: <Database className="h-4 w-4" />,
    badge: "Life Sciences · Genomics",
    brief: {
      dataset: "1000 Genomes SNP features — allele frequencies, LD scores, population labels. Offline: Iceberg on S3. Online: Redis for sub-ms variant lookups.",
      scale: "~3B SNPs × 26 populations = 78B feature rows · ~500GB offline · ~10GB online",
      why: "Shows the feature store pattern for genomics: offline features (allele frequencies computed via Spark batch) → online features (Redis for real-time variant lookups during GWAS). Point-in-time correctness prevents look-ahead bias.",
    },
    stats: [
      { label: "SNPs", value: "3 billion" },
      { label: "Offline size", value: "500 GB" },
      { label: "Online size", value: "10 GB" },
      { label: "Lookup latency", value: "<1ms" },
    ],
    tools: ["Feast", "Apache Spark", "Redis", "Iceberg", "S3"],
    codeTabs: [
      { lang: "scala", filename: "GenomicsFeatureStore.scala", code: `import org.apache.spark.sql.SparkSession\nval spark = SparkSession.builder().getOrCreate()\n// Write allele frequencies to offline store (Feast)\nval features = spark.table("iceberg.gold.allele_frequencies")\nfeatures.write.format("parquet").save("s3://feast-offline/genomics/")` },
      { lang: "rust", filename: "genomics_feature_store.rs", code: `use feast_rust::FeatureStore;\n#[tokio::main]\nasync fn main() -> Result<(), Box<dyn std::error::Error>> {\n    let fs = FeatureStore::new("feast-offline")?;\n    let features = fs.get_online_features(&["allele_freq", "ld_score"], &["rs12345"]).await?;\n    Ok(())\n}` },
      { lang: "go", filename: "genomics_feature_store.go", code: `package main\nimport ("github.com/feast/feast-go")\nfunc main() {\n    fs := feast.NewFeatureStore("feast-offline")\n    features, _ := fs.GetOnlineFeatures([]string{"allele_freq"}, []string{"rs12345"})\n    _ = features\n}` },
      { lang: "elixir", filename: "genomics_feature_store.ex", code: `defmodule Genomics.FeatureStore do\n  def get_snp_features(snp_id) do\n    {:ok, features} = Feast.Client.get_online("genomics_features", [snp_id])\n    features\n  end\nend` },
      { lang: "zig", filename: "genomics_feature_store.zig", code: `const std = @import("std");\nconst feast = @import("feast-zig");\npub fn main() !void {\n    var fs = try feast.FeatureStore.init("feast-offline");\n    defer fs.deinit();\n    var features = try fs.getOnlineFeatures(&.{"allele_freq"}, &.{"rs12345"});\n    defer features.deinit();\n}` },
    ],
    runnablePython: `# Genomics feature store simulation — Pyodide\nimport random\nprint("=== Genomics Feature Store (Feast) ===")\nprint("Offline: 3B SNPs x 26 populations on Iceberg (500GB)")\nprint("Online: Redis sub-ms lookup for GWAS")\nprint()\nrandom.seed(42)\nsnps = [f"rs{random.randint(1, 999999)}" for _ in range(5)]\nfor snp in snps:\n    freq = random.uniform(0.01, 0.99)\n    print(f"  {snp}: allele_freq={freq:.4f} (online lookup <1ms)")\nprint("\\nPoint-in-time correctness: features valued at time T prevent look-ahead bias")`,
    insight: "Genomics SNP features are the canonical feature store use case for life sciences — offline computation (allele frequencies via Spark on Iceberg) feeds online lookups (Redis for sub-ms GWAS queries). Point-in-time correctness prevents data leakage in ML training.",
  },
  {
    id: "feature-store-clinical-features",
    step: "2",
    title: "Clinical Trial Patient Features",
    subtitle: "Life Sciences — demographics + labs with point-in-time correctness",
    accent: "oklch(0.65 0.16 165)",
    icon: <ShieldCheck className="h-4 w-4" />,
    badge: "Life Sciences · Clinical",
    brief: {
      dataset: "Synthetic clinical trial — 10,000 patients, 200 features (demographics, lab values, treatment history). Feature store ensures point-in-time correctness — feature values as-of the prediction time, preventing look-ahead bias.",
      scale: "~10,000 patients · 200 features · 50 features per prediction · point-in-time joined",
      why: "Shows the CRITICAL feature store pattern: point-in-time correctness. Without it, training data would include lab values measured AFTER the prediction time → data leakage → over-optimistic model performance. Feature stores solve this via point-in-time joins.",
    },
    stats: [
      { label: "Patients", value: "10,000" },
      { label: "Features", value: "200" },
      { label: "Point-in-time", value: "Correct" },
      { label: "Leakage", value: "Prevented" },
    ],
    tools: ["Feast", "Tecton", "SageMaker Feature Store", "Redis", "PostgreSQL"],
    codeTabs: [
      { lang: "scala", filename: "ClinicalFeatureStore.scala", code: `import org.apache.spark.sql.SparkSession\nval spark = SparkSession.builder().getOrCreate()\n// Point-in-time join: get lab values as-of prediction time\nval features = spark.sql("SELECT * FROM feast.clinical_features POINT_IN_TIME_AS_OF '2024-09-01'")` },
      { lang: "rust", filename: "clinical_feature_store.rs", code: `use feast_rust::FeatureStore;\n#[tokio::main]\nasync fn main() -> Result<(), Box<dyn std::error::Error>> {\n    let fs = FeatureStore::new("clinical_features")?;\n    // Point-in-time: features as-of prediction time\n    let features = fs.get_features_point_in_time(&["lab_values"], "2024-09-01T00:00:00Z").await?;\n    Ok(())\n}` },
      { lang: "go", filename: "clinical_feature_store.go", code: `package main\nimport ("github.com/feast/feast-go"; "time")\nfunc main() {\n    fs := feast.NewFeatureStore("clinical_features")\n    t, _ := time.Parse(time.RFC3339, "2024-09-01T00:00:00Z")\n    features, _ := fs.GetFeaturesPointInTime([]string{"lab_values"}, t)\n    _ = features\n}` },
      { lang: "elixir", filename: "clinical_feature_store.ex", code: `defmodule Clinical.FeatureStore do\n  def get_features_point_in_time(patient_id, prediction_time) do\n    {:ok, features} = Feast.Client.get_point_in_time(\n      "clinical_features", [patient_id], prediction_time)\n    features\n  end\nend` },
      { lang: "zig", filename: "clinical_feature_store.zig", code: `const std = @import("std");\nconst feast = @import("feast-zig");\npub fn main() !void {\n    var fs = try feast.FeatureStore.init("clinical_features");\n    defer fs.deinit();\n    // Point-in-time: features as-of prediction time\n    var features = try fs.getFeaturesPointInTime(&.{"lab_values"}, "2024-09-01T00:00:00Z");\n    defer features.deinit();\n}` },
    ],
    runnablePython: `# Clinical feature store simulation — Pyodide\nimport random\nfrom datetime import datetime, timedelta\nprint("=== Clinical Feature Store — Point-in-Time Correctness ===")\nprint("10,000 patients × 200 features × point-in-time joined")\nprint()\nrandom.seed(42)\npatients = [f"PT{random.randint(1, 10000):05d}" for _ in range(5)]\nprediction_time = datetime(2024, 9, 1, 12, 0, 0)\nfor pid in patients:\n    # Simulate lab values at different times\n    lab_time = prediction_time - timedelta(days=random.randint(1, 30))\n    glucose = random.uniform(70, 200)\n    print(f"  {pid}: prediction @ {prediction_time}, lab @ {lab_time.date()} → glucose={glucose:.1f}")\nprint("\\nPoint-in-time: features valued BEFORE prediction time only (no leakage)")`,
    insight: "Point-in-time correctness is the #1 reason feature stores exist — without it, ML models train on future information (data leakage), producing over-optimistic metrics that fail in production. The feature store guarantees that every feature value was known at the prediction time.",
  },
  {
    id: "feature-store-sensor-features",
    step: "3",
    title: "Environmental Sensor Features",
    subtitle: "Sensors — rolling averages, anomalies, calibration offsets",
    accent: "oklch(0.65 0.16 60)",
    icon: <Activity className="h-4 w-4" />,
    badge: "Sensors · Environmental",
    brief: {
      dataset: "EPA AirNow sensor data — 50k sensors, 7 metrics. Feature store computes rolling averages (1h, 24h), anomaly scores, and calibration offsets for ML air quality models.",
      scale: "~50k sensors · 7 metrics · 3 feature windows (1h/24h/7d) · ~100GB offline",
      why: "Shows feature stores for time-series sensor data — rolling averages are computed offline (Spark on Iceberg) and materialised to online (Redis) for real-time ML inference. Feature drift (PSI) monitors when sensor calibration drifts.",
    },
    stats: [
      { label: "Sensors", value: "50k" },
      { label: "Metrics", value: "7" },
      { label: "Windows", value: "3 (1h/24h/7d)" },
      { label: "Offline size", value: "100 GB" },
    ],
    tools: ["Feast", "Apache Spark", "Redis", "Iceberg", "PSI drift monitoring"],
    codeTabs: [
      { lang: "scala", filename: "SensorFeatureStore.scala", code: `import org.apache.spark.sql.SparkSession\nimport org.apache.spark.sql.functions._\nval spark = SparkSession.builder().getOrCreate()\nval readings = spark.table("iceberg.silver.sensor_calibrated")\nval features = readings.groupBy($"sensor_id", window($"sensor_ts", "1 hour"))\n  .agg(mean("value_standard").as("avg_1h"), stddev("value_standard").as("std_1h"))\nfeatures.write.format("parquet").save("s3://feast-offline/sensor/")` },
      { lang: "rust", filename: "sensor_feature_store.rs", code: `use feast_rust::FeatureStore;\n#[tokio::main]\nasync fn main() -> Result<(), Box<dyn std::error::Error>> {\n    let fs = FeatureStore::new("sensor_features")?;\n    let features = fs.get_online_features(&["avg_1h", "std_1h"], &["sensor_12345"]).await?;\n    Ok(())\n}` },
      { lang: "go", filename: "sensor_feature_store.go", code: `package main\nimport "github.com/feast/feast-go"\nfunc main() {\n    fs := feast.NewFeatureStore("sensor_features")\n    features, _ := fs.GetOnlineFeatures([]string{"avg_1h"}, []string{"sensor_12345"})\n    _ = features\n}` },
      { lang: "elixir", filename: "sensor_feature_store.ex", code: `defmodule Sensor.FeatureStore do\n  def get_sensor_features(sensor_id) do\n    {:ok, features} = Feast.Client.get_online("sensor_features", [sensor_id])\n    features\n  end\nend` },
      { lang: "zig", filename: "sensor_feature_store.zig", code: `const std = @import("std");\nconst feast = @import("feast-zig");\npub fn main() !void {\n    var fs = try feast.FeatureStore.init("sensor_features");\n    defer fs.deinit();\n    var features = try fs.getOnlineFeatures(&.{"avg_1h"}, &.{"sensor_12345"});\n    defer features.deinit();\n}` },
    ],
    runnablePython: `# Sensor feature store simulation — Pyodide\nimport random\nprint("=== Sensor Feature Store (Feast) ===")\nprint("50k sensors × 7 metrics × 3 windows (1h/24h/7d)")\nprint()\nrandom.seed(42)\nsensors = [f"sensor_{random.randint(1, 50000):05d}" for _ in range(5)]\nfor s in sensors:\n    avg_1h = random.uniform(0, 50)\n    avg_24h = random.uniform(0, 50)\n    avg_7d = random.uniform(0, 50)\n    print(f"  {s}: avg_1h={avg_1h:.2f}, avg_24h={avg_24h:.2f}, avg_7d={avg_7d:.2f}")\nprint("\\nPSI drift monitoring: alerts when sensor calibration drifts")`,
    insight: "Sensor feature stores show time-series windowing — rolling averages (1h, 24h, 7d) are computed offline (Spark on Iceberg) and materialised to Redis for real-time ML. PSI (Population Stability Index) monitors feature drift, alerting when sensor calibration degrades.",
  },
];

export const VECTOR_DB_SCIENCE_EXAMPLES: DatasetExample[] = [
  {
    id: "vector-db-protein-embeddings",
    step: "1",
    title: "Protein Embedding Search (ESM-2)",
    subtitle: "Life Sciences — find homologous proteins via HNSW vector search",
    accent: "oklch(0.65 0.16 30)",
    icon: <Atom className="h-4 w-4" />,
    badge: "Life Sciences · Proteomics",
    brief: {
      dataset: "ESM-2 protein embeddings — 250M proteins from UniProt, each embedded as a 1280-dim vector. Stored in Milvus (HNSW index) for sub-ms homology search.",
      scale: "~250M proteins · 1280-dim embeddings · ~600GB in Milvus · HNSW index",
      why: "Shows vector DB for structural biology — ESM-2 (Meta AI 2023) embeds protein sequences into 1280-dim vectors where homologous proteins are nearby. HNSW enables sub-ms nearest-neighbor search across 250M proteins. This is how AlphaFold finds template structures.",
    },
    stats: [
      { label: "Proteins", value: "250M" },
      { label: "Dimensions", value: "1,280" },
      { label: "Index", value: "HNSW" },
      { label: "Search latency", value: "<1ms" },
    ],
    tools: ["Milvus", "ESM-2 (Meta AI)", "HNSW", "UniProt", "FAISS"],
    codeTabs: [
      { lang: "scala", filename: "ProteinEmbeddingSearch.scala", code: `import org.apache.spark.sql.SparkSession\nval spark = SparkSession.builder().getOrCreate()\nval embeddings = spark.read.parquet("s3://protein-embeddings/esm2/")\nembeddings.write.format("milvus").option("collection", "proteins").save()` },
      { lang: "rust", filename: "protein_embedding_search.rs", code: `use milvus_rust::MilvusClient;\n#[tokio::main]\nasync fn main() -> Result<(), Box<dyn std::error::Error>> {\n    let client = MilvusClient::new("http://milvus:19530").await?;\n    let query = vec![0.1f32; 1280]; // ESM-2 embedding\n    let results = client.search("proteins", &query, 10).await?;\n    println!("Found {} homologous proteins", results.len());\n    Ok(())\n}` },
      { lang: "go", filename: "protein_embedding_search.go", code: `package main\nimport "github.com/milvus-io/milvus-sdk-go"\nfunc main() {\n    client, _ := milvus.NewClient(milvus.Config{Address: "milvus:19530"})\n    query := make([]float32, 1280)\n    results, _ := client.Search("proteins", query, 10)\n    _ = results\n}` },
      { lang: "elixir", filename: "protein_embedding_search.ex", code: `defmodule Protein.VectorSearch do\n  def find_homologs(embedding) do\n    {:ok, results} = Milvus.Client.search("proteins", embedding, 10)\n    results\n  end\nend` },
      { lang: "zig", filename: "protein_embedding_search.zig", code: `const std = @import("std");\nconst milvus = @import("milvus-zig");\npub fn main() !void {\n    var client = try milvus.Client.init("milvus:19530");\n    defer client.deinit();\n    var query: [1280]f32 = .{0.1} ** 1280;\n    var results = try client.search("proteins", &query, 10);\n    defer results.deinit();\n}` },
    ],
    runnablePython: `# Protein embedding search simulation — Pyodide\nimport math, random\nprint("=== Protein Embedding Search (ESM-2 + Milvus HNSW) ===")\nprint("250M proteins × 1280-dim embeddings → HNSW → sub-ms search")\nprint()\nrandom.seed(42)\n# Simulate 5 protein embeddings (1280-dim)\nproteins = [("P12345", "hemoglobin"), ("P69905", "hemoglobin alpha"),\n            ("P68871", "hemoglobin beta"), ("P00398", "cytochrome c"),\n            ("P0A3T5", "GFP")]\nquery = [random.gauss(0, 1) for _ in range(64)]  # simplified 64-dim\nfor pid, name in proteins:\n    emb = [random.gauss(0, 1) for _ in range(64)]\n    # Cosine similarity\n    dot = sum(q*e for q, e in zip(query, emb))\n    norm_q = math.sqrt(sum(q*q for q in query))\n    norm_e = math.sqrt(sum(e*e for e in emb))\n    cos_sim = dot / (norm_q * norm_e)\n    print(f"  {pid} ({name}): cosine={cos_sim:.4f} {'<-- homolog' if cos_sim > 0.8 else ''}")\nprint("\\nHNSW: O(log n) search — sub-ms for 250M proteins")`,
    insight: "ESM-2 protein embeddings enable structural biology at scale — 250M proteins embedded as 1280-dim vectors, HNSW index in Milvus enables sub-ms homology search. This is how AlphaFold finds template structures for novel proteins. The cosine similarity in embedding space predicts structural similarity.",
  },
  {
    id: "vector-db-molecular-similarity",
    step: "2",
    title: "Molecular Similarity (ECFP Fingerprints)",
    subtitle: "Chemistry — virtual screening via cosine similarity",
    accent: "oklch(0.65 0.16 165)",
    icon: <Database className="h-4 w-4" />,
    badge: "Chemistry · Drug Discovery",
    brief: {
      dataset: "ZINC database — 1B molecules, each as 2048-bit ECFP4 fingerprint. Stored in Milvus (IVF index) for sub-second virtual screening.",
      scale: "~1B molecules · 2048-dim ECFP4 fingerprints · ~200GB in Milvus · IVF index",
      why: "Shows vector DB for drug discovery — ECFP4 (Extended-Connectivity Fingerprints) encode molecular structure. Cosine similarity finds structurally similar molecules → potential drug candidates. IVF index enables sub-second search across 1B molecules.",
    },
    stats: [
      { label: "Molecules", value: "1 billion" },
      { label: "Dimensions", value: "2,048" },
      { label: "Index", value: "IVF" },
      { label: "Search time", value: "<1s" },
    ],
    tools: ["Milvus", "RDKit", "ECFP4", "IVF", "ZINC database"],
    codeTabs: [
      { lang: "scala", filename: "MolecularSimilarity.scala", code: `import org.apache.spark.sql.SparkSession\nval spark = SparkSession.builder().getOrCreate()\nval fingerprints = spark.read.parquet("s3://zinc-ecfp4/")\nfingerprints.write.format("milvus").option("collection", "molecules").save()` },
      { lang: "rust", filename: "molecular_similarity.rs", code: `use milvus_rust::MilvusClient;\n#[tokio::main]\nasync fn main() -> Result<(), Box<dyn std::error::Error>> {\n    let client = MilvusClient::new("http://milvus:19530").await?;\n    let query = vec![0.0f32; 2048]; // ECFP4 fingerprint\n    let results = client.search("molecules", &query, 100).await?;\n    println!("Found {} similar molecules", results.len());\n    Ok(())\n}` },
      { lang: "go", filename: "molecular_similarity.go", code: `package main\nimport "github.com/milvus-io/milvus-sdk-go"\nfunc main() {\n    client, _ := milvus.NewClient(milvus.Config{Address: "milvus:19530"})\n    query := make([]float32, 2048)\n    results, _ := client.Search("molecules", query, 100)\n    _ = results\n}` },
      { lang: "elixir", filename: "molecular_similarity.ex", code: `defmodule Molecule.VectorSearch do\n  def find_similar(fingerprint) do\n    {:ok, results} = Milvus.Client.search("molecules", fingerprint, 100)\n    results\n  end\nend` },
      { lang: "zig", filename: "molecular_similarity.zig", code: `const std = @import("std");\nconst milvus = @import("milvus-zig");\npub fn main() !void {\n    var client = try milvus.Client.init("milvus:19530");\n    defer client.deinit();\n    var query: [2048]f32 = .{0.0} ** 2048;\n    var results = try client.search("molecules", &query, 100);\n    defer results.deinit();\n}` },
    ],
    runnablePython: `# Molecular similarity simulation — Pyodide\nimport math, random\nprint("=== Molecular Similarity (ECFP4 + Milvus IVF) ===")\nprint("1B molecules × 2048-dim ECFP4 → IVF → sub-second search")\nprint()\nrandom.seed(42)\nquery_fp = [random.randint(0, 1) for _ in range(256)]  # simplified 256-dim\nmolecules = [("ZINC000123", "aspirin"), ("ZINC000456", "ibuprofen"),\n             ("ZINC000789", "paracetamol"), ("ZINC000abc", "omeprazole")]\nfor zinc_id, name in molecules:\n    mol_fp = [random.randint(0, 1) for _ in range(256)]\n    # Tanimoto similarity (for binary fingerprints)\n    intersection = sum(1 for a, b in zip(query_fp, mol_fp) if a == 1 and b == 1)\n    union = sum(1 for a, b in zip(query_fp, mol_fp) if a == 1 or b == 1)\n    tani = intersection / max(union, 1)\n    print(f"  {zinc_id} ({name}): Tanimoto={tani:.4f} {'<-- hit' if tani > 0.7 else ''}")\nprint("\\nIVF: Voronoi partitioning → sub-second search across 1B molecules")`,
    insight: "ECFP4 fingerprints encode molecular structure as 2048-bit vectors. Cosine/Tanimoto similarity finds structurally similar molecules for virtual screening — 1B molecules searched in <1s via IVF index. This is how pharma companies find drug candidates from compound libraries.",
  },
  {
    id: "vector-db-genomics-variants",
    step: "3",
    title: "Genomics Variant Clustering",
    subtitle: "Life Sciences — sequence embeddings → IVF → variant grouping",
    accent: "oklch(0.65 0.16 250)",
    icon: <Network className="h-4 w-4" />,
    badge: "Life Sciences · Genomics",
    brief: {
      dataset: "Genomics variant embeddings — 3B SNPs from 1000 Genomes, each embedded as a 768-dim vector via DNA-BERT. Stored in Pinecone for clustering analysis.",
      scale: "~3B variants · 768-dim DNA-BERT embeddings · ~500GB in Pinecone · HNSW + IVF hybrid",
      why: "Shows vector DB for genomics — DNA-BERT (2023) embeds genomic sequences so functional variants cluster together. Vector search finds variants with similar regulatory effects, enabling genotype-phenotype association discovery.",
    },
    stats: [
      { label: "Variants", value: "3 billion" },
      { label: "Dimensions", value: "768" },
      { label: "Index", value: "HNSW+IVF" },
      { label: "Backend", value: "Pinecone" },
    ],
    tools: ["Pinecone", "DNA-BERT", "HNSW+IVF", "1000 Genomes"],
    codeTabs: [
      { lang: "scala", filename: "GenomicsVariantClustering.scala", code: `import org.apache.spark.sql.SparkSession\nval spark = SparkSession.builder().getOrCreate()\nval embeddings = spark.read.parquet("s3://genomics-embeddings/dna-bert/")\nembeddings.write.format("pinecone").option("index", "genomic-variants").save()` },
      { lang: "rust", filename: "genomics_variant_clustering.rs", code: `use pinecone_rust::PineconeClient;\n#[tokio::main]\nasync fn main() -> Result<(), Box<dyn std::error::Error>> {\n    let client = PineconeClient::new("api_key").await?;\n    let query = vec![0.1f32; 768];\n    let results = client.query("genomic-variants", &query, 100).await?;\n    Ok(())\n}` },
      { lang: "go", filename: "genomics_variant_clustering.go", code: `package main\nimport "github.com/pinecone-io/pinecone-go"\nfunc main() {\n    client := pinecone.NewClient("api_key")\n    query := make([]float32, 768)\n    results, _ := client.Query("genomic-variants", query, 100)\n    _ = results\n}` },
      { lang: "elixir", filename: "genomics_variant_clustering.ex", code: `defmodule Genomics.VectorSearch do\n  def find_similar_variants(embedding) do\n    {:ok, results} = Pinecone.Client.query("genomic-variants", embedding, 100)\n    results\n  end\nend` },
      { lang: "zig", filename: "genomics_variant_clustering.zig", code: `const std = @import("std");\nconst pinecone = @import("pinecone-zig");\npub fn main() !void {\n    var client = try pinecone.Client.init("api_key");\n    defer client.deinit();\n    var query: [768]f32 = .{0.1} ** 768;\n    var results = try client.query("genomic-variants", &query, 100);\n    defer results.deinit();\n}` },
    ],
    runnablePython: `# Genomics variant clustering simulation — Pyodide\nimport math, random\nprint("=== Genomics Variant Clustering (DNA-BERT + Pinecone) ===")\nprint("3B variants × 768-dim DNA-BERT → HNSW+IVF → similar-effect search")\nprint()\nrandom.seed(42)\nquery_emb = [random.gauss(0, 1) for _ in range(64)]  # simplified 64-dim\nvariants = [("rs12345", "regulatory"), ("rs67890", "missense"),\n            ("rs11111", "synonymous"), ("rs22222", "regulatory")]\nfor rsid, vtype in variants:\n    emb = [random.gauss(0, 1) for _ in range(64)]\n    dot = sum(q*e for q, e in zip(query_emb, emb))\n    norm = math.sqrt(sum(q*q for q in query_emb)) * math.sqrt(sum(e*e for e in emb))\n    cos_sim = dot / max(norm, 0.001)\n    print(f"  {rsid} ({vtype}): cosine={cos_sim:.4f} {'<-- similar effect' if cos_sim > 0.8 else ''}")\nprint("\\nDNA-BERT: variants with similar regulatory effects cluster together in embedding space")`,
    insight: "DNA-BERT (2023) embeds genomic sequences so functionally similar variants are nearby in embedding space. Vector search finds variants with similar regulatory effects — enabling genotype-phenotype discovery without expensive functional assays. 3B variants searched in <1s via HNSW+IVF hybrid index.",
  },
];

export const LLMOPS_SCIENCE_EXAMPLES: DatasetExample[] = [
  {
    id: "llmops-biomedical-rag",
    step: "1",
    title: "Biomedical RAG (PubMed + BioBERT)",
    subtitle: "Life Sciences — hybrid retrieval → LLM generation → citations",
    accent: "oklch(0.65 0.16 30)",
    icon: <Brain className="h-4 w-4" />,
    badge: "Life Sciences · Biomedical NLP",
    brief: {
      dataset: "PubMed abstracts — 35M biomedical papers. BioBERT embeddings + BM25 hybrid retrieval → LLM (GPT-4) generates answers with citations from PubMed.",
      scale: "~35M PubMed abstracts · 768-dim BioBERT embeddings · BM25 + vector hybrid · GPT-4 generation",
      why: "Shows LLMOps for biomedical research — the RAG pipeline retrieves relevant PubMed papers (hybrid: BM25 for keyword + vector for semantic), generates answers with citations. Guardrails prevent hallucination (every claim must have a PubMed citation).",
    },
    stats: [
      { label: "Papers", value: "35M" },
      { label: "Dimensions", value: "768" },
      { label: "Retrieval", value: "Hybrid (BM25+vector)" },
      { label: "Generation", value: "GPT-4 + citations" },
    ],
    tools: ["LangChain", "BioBERT", "Pinecone", "BM25", "GPT-4", "PubMed API"],
    codeTabs: [
      { lang: "scala", filename: "BiomedicalRAG.scala", code: `import org.apache.spark.sql.SparkSession\nval spark = SparkSession.builder().getOrCreate()\nval pubmed = spark.read.parquet("s3://pubmed-embeddings/")\npubmed.write.format("pinecone").option("index", "pubmed").save()` },
      { lang: "rust", filename: "biomedical_rag.rs", code: `use pinecone_rust::PineconeClient;\n#[tokio::main]\nasync fn main() -> Result<(), Box<dyn std::error::Error>> {\n    let client = PineconeClient::new("api_key").await?;\n    let query = vec![0.1f32; 768]; // BioBERT embedding\n    let docs = client.query("pubmed", &query, 10).await?;\n    // Generate answer with GPT-4 + citations\n    let prompt = format!("Answer based on: {:?}\\nQuestion: What is the mechanism of action of aspirin?", docs);\n    Ok(())\n}` },
      { lang: "go", filename: "biomedical_rag.go", code: `package main\nimport ("github.com/pinecone-io/pinecone-go"; "fmt")\nfunc main() {\n    client := pinecone.NewClient("api_key")\n    query := make([]float32, 768)\n    docs, _ := client.Query("pubmed", query, 10)\n    fmt.Printf("Retrieved %d PubMed papers for RAG generation\\n", len(docs))\n}` },
      { lang: "elixir", filename: "biomedical_rag.ex", code: `defmodule Biomedical.RAG do\n  def answer(question) do\n    {:ok, docs} = Pinecone.Client.query("pubmed", embed_bert(question), 10)\n    prompt = "Answer based on: " <> Enum.join(docs, "\\n") <> "\\nQ: " <> question\n    {:ok, answer} = GPT.Client.chat(prompt)\n    answer\n  end\n  defp embed_bert(_text), do: [0.1]  # simplified\nend` },
      { lang: "zig", filename: "biomedical_rag.zig", code: `const std = @import("std");\nconst pinecone = @import("pinecone-zig");\npub fn main() !void {\n    var client = try pinecone.Client.init("api_key");\n    defer client.deinit();\n    var query: [768]f32 = .{0.1} ** 768;\n    var docs = try client.query("pubmed", &query, 10);\n    defer docs.deinit();\n}` },
    ],
    runnablePython: `# Biomedical RAG simulation — Pyodide\nimport random\nprint("=== Biomedical RAG (PubMed + BioBERT + GPT-4) ===")\nprint("35M PubMed abstracts → hybrid retrieval (BM25 + vector) → GPT-4 + citations")\nprint()\nrandom.seed(42)\nquestion = "What is the mechanism of action of aspirin?"\nprint(f"Question: {question}")\nprint()\n# Simulate retrieved papers\npapers = [("PMID:12345", "Aspirin inhibits COX-1...", 0.92),\n          ("PMID:67890", "Aspirin irreversibly acetylates COX-1...", 0.89),\n          ("PMID:11111", "COX-1 inhibition reduces prostaglandin synthesis...", 0.85)]\nprint("Retrieved papers (hybrid BM25 + vector):")\nfor pmid, title, score in papers:\n    print(f"  {pmid} (score={score:.2f}): {title[:60]}...")\nprint()\nprint("GPT-4 answer (with citations):")\nprint("  Aspirin irreversibly inhibits COX-1 (cyclooxygenase-1) by")\nprint("  acetylating a serine residue at position 529 [PMID:67890],")\nprint("  reducing prostaglandin synthesis [PMID:11111].")\nprint()\nprint("Guardrail: every claim has a PMID citation — no hallucination")`,
    insight: "Biomedical RAG is the canonical LLMOps use case for life sciences — 35M PubMed papers indexed via BioBERT + BM25 hybrid retrieval, GPT-4 generates answers with mandatory citations. The guardrail (every claim must cite a PMID) prevents hallucination — critical in medical applications where a fabricated citation could endanger patients.",
  },
  {
    id: "llmops-chemistry-llm",
    step: "2",
    title: "Chemistry LLM (Molecule Generation)",
    subtitle: "Chemistry — SMILES generation with validation guardrails",
    accent: "oklch(0.65 0.16 165)",
    icon: <Atom className="h-4 w-4" />,
    badge: "Chemistry · Drug Discovery",
    brief: {
      dataset: "ZINC molecule database — 1B SMILES strings. LLM generates novel SMILES for drug candidates. Guardrail: RDKit validates every generated SMILES is chemically valid (no impossible bonds, valid valence).",
      scale: "~1B molecules in training set · generated SMILES validated by RDKit · ~20% rejection rate (invalid SMILES)",
      why: "Shows LLMOps for chemistry — LLM generates SMILES strings for novel drug candidates. Without the RDKit guardrail, ~20% of generated molecules would be chemically impossible (invalid valence, impossible bonds). The guardrail catches these before they reach the screening pipeline.",
    },
    stats: [
      { label: "Training set", value: "1B SMILES" },
      { label: "Guardrail", value: "RDKit validation" },
      { label: "Rejection rate", value: "~20%" },
      { label: "Valid output", value: "~80%" },
    ],
    tools: ["LangChain", "GPT-4", "RDKit", "SMILES", "ZINC database"],
    codeTabs: [
      { lang: "scala", filename: "ChemistryLLM.scala", code: `import org.apache.spark.sql.SparkSession\nval spark = SparkSession.builder().getOrCreate()\nval smiles = spark.read.text("s3://zinc/smiles/")\n// Fine-tune LLM on SMILES strings\n// Guardrail: validate generated SMILES via RDKit` },
      { lang: "rust", filename: "chemistry_llm.rs", code: `use rdkit_rust::SmilesParser;\n#[tokio::main]\nasync fn main() -> Result<(), Box<dyn std::error::Error>> {\n    let parser = SmilesParser::new();\n    let generated = "CC(=O)Oc1ccccc1C(=O)O"; // aspirin SMILES\n    match parser.parse(generated) {\n        Ok(mol) => println!("Valid molecule: {} atoms", mol.n_atoms()),\n        Err(e) => println!("INVALID SMILES: {}", e),\n    }\n    Ok(())\n}` },
      { lang: "go", filename: "chemistry_llm.go", code: `package main\nimport "github.com/rdkit/rdkit-go"\nfunc main() {\n    parser := rdkit.NewSmilesParser()\n    smiles := "CC(=O)Oc1ccccc1C(=O)O"\n    if mol, err := parser.Parse(smiles); err == nil {\n        println("Valid:", mol.NumAtoms())\n    } else {\n        println("INVALID SMILES")\n    }\n}` },
      { lang: "elixir", filename: "chemistry_llm.ex", code: `defmodule Chemistry.LLM do\n  def generate_molecule(prompt) do\n    {:ok, smiles} = GPT.Client.chat("Generate a SMILES for: " <> prompt)\n    case validate_smiles(smiles) do\n      {:ok, mol} -> {:ok, mol}\n      {:error, reason} -> generate_molecule(prompt)  # retry\n    end\n  end\n  defp validate_smiles(smiles), do: {:ok, smiles}\nend` },
      { lang: "zig", filename: "chemistry_llm.zig", code: `const std = @import("std");\nconst rdkit = @import("rdkit-zig");\npub fn main() !void {\n    var parser = try rdkit.SmilesParser.init();\n    defer parser.deinit();\n    const smiles = "CC(=O)Oc1ccccc1C(=O)O";\n    var mol = parser.parse(smiles) catch {\n        std.debug.print("INVALID SMILES\\n", .{});\n        return;\n    };\n    defer mol.deinit();\n    std.debug.print("Valid: {d} atoms\\n", .{mol.numAtoms()});\n}` },
    ],
    runnablePython: `# Chemistry LLM with SMILES guardrail — Pyodide\nimport random\nprint("=== Chemistry LLM (SMILES generation + RDKit guardrail) ===")\nprint("LLM generates SMILES → RDKit validates → ~20% rejected")\nprint()\nrandom.seed(42)\nvalid_smiles = ["CC(=O)Oc1ccccc1C(=O)O", "CC(C)CC1=CC=C(C=C1)C(C)C(=O)O",\n                "CN1C=NC2=C1C(=O)N(C(=O)N2C)C", "INVALID_SMILES_123"]\nfor i, smiles in enumerate(valid_smiles):\n    valid = all(c in "CNOPSFIclBr()=#-1234567890[]" for c in smiles)\n    status = "VALID" if valid else "REJECTED"\n    print(f"  Molecule {i+1}: {smiles[:40]}... → {status}")\nprint(f"\\nGuardrail: {sum(1 for s in valid_smiles if all(c in 'CNOPSFIclBr()=#-1234567890[]' for c in s))}/{len(valid_smiles)} valid")`,
    insight: "Chemistry LLMs need RDKit guardrails because ~20% of generated SMILES are chemically invalid — impossible valence, forbidden bonds. Without the guardrail, the drug discovery pipeline would waste screening time on impossible molecules. The LLM generates; RDKit validates; only valid SMILES reach the screening pipeline.",
  },
  {
    id: "llmops-clinical-trial-nlp",
    step: "3",
    title: "Clinical Trial Matching via LLM",
    subtitle: "Life Sciences — patient-trial matching with hallucination prevention",
    accent: "oklch(0.65 0.16 250)",
    icon: <ShieldCheck className="h-4 w-4" />,
    badge: "Life Sciences · Clinical",
    brief: {
      dataset: "ClinicalTrials.gov — 500k+ clinical trials with eligibility criteria. LLM matches patient profiles to trials. Guardrail: every trial recommendation must cite specific eligibility criteria (hallucination prevention).",
      scale: "~500k clinical trials · 10k patient profiles · LLM matching with criteria citations",
      why: "Shows LLMOps for clinical trial matching — LLM reads patient profiles (diagnosis, biomarkers, treatment history) and matches to trial eligibility criteria. The guardrail ensures every recommendation cites the specific criterion — preventing hallucinated trial matches that could endanger patients.",
    },
    stats: [
      { label: "Trials", value: "500k+" },
      { label: "Patients", value: "10k" },
      { label: "Guardrail", value: "Citation required" },
      { label: "Matching", value: "LLM + criteria" },
    ],
    tools: ["LangChain", "GPT-4", "ClinicalTrials.gov API", "LlamaIndex"],
    codeTabs: [
      { lang: "scala", filename: "ClinicalTrialNLP.scala", code: `import org.apache.spark.sql.SparkSession\nval spark = SparkSession.builder().getOrCreate()\nval trials = spark.read.json("s3://clinical-trials-gov/")\n// LLM matches patient profile to trial eligibility criteria` },
      { lang: "rust", filename: "clinical_trial_nlp.rs", code: `use llm_rust::LlmClient;\n#[tokio::main]\nasync fn main() -> Result<(), Box<dyn std::error::Error>> {\n    let client = LlmClient::new("gpt-4")?;\n    let prompt = "Match patient: 55yo male, NSCLC, EGFR+\\nTo trial: NCT12345 (criteria: EGFR+, age 18+)\\nCite specific criteria.";\n    let answer = client.chat(prompt).await?;\n    println!("{}", answer);\n    Ok(())\n}` },
      { lang: "go", filename: "clinical_trial_nlp.go", code: `package main\nimport "github.com/llm/llm-go"\nfunc main() {\n    client := llm.NewClient("gpt-4")\n    answer, _ := client.Chat("Match patient to trial NCT12345. Cite criteria.")\n    println(answer)\n}` },
      { lang: "elixir", filename: "clinical_trial_nlp.ex", code: `defmodule Clinical.TrialMatching do\n  def match_trial(patient, trial_nct) do\n    prompt = "Match patient #{patient} to trial #{trial_nct}. Cite eligibility criteria."\n    {:ok, answer} = GPT.Client.chat(prompt)\n    # Guardrail: verify every claim cites a criterion\n    answer\n  end\nend` },
      { lang: "zig", filename: "clinical_trial_nlp.zig", code: `const std = @import("std");\nconst llm = @import("llm-zig");\npub fn main() !void {\n    var client = try llm.Client.init("gpt-4");\n    defer client.deinit();\n    var answer = try client.chat("Match patient to trial NCT12345. Cite criteria.");\n    defer answer.deinit();\n}` },
    ],
    runnablePython: `# Clinical trial matching LLM — Pyodide\nimport random\nprint("=== Clinical Trial Matching via LLM (with guardrails) ===")\nprint("Patient profile → LLM → trial match with eligibility criteria citations")\nprint()\nrandom.seed(42)\npatient = {"age": 55, "diagnosis": "NSCLC", "biomarker": "EGFR+", "prior_tx": "carboplatin"}\ntrials = [("NCT12345", "EGFR+, age 18+"), ("NCT67890", "ALK+, age 18+"),\n          ("NCT11111", "EGFR+, age 18-70, no prior TKI")]\nprint(f"Patient: {patient['age']}yo {patient['diagnosis']} {patient['biomarker']}")\nprint()\nfor nct, criteria in trials:\n    match = patient['biomarker'] in criteria and str(patient['age']) in criteria.replace('+','')\n    status = "MATCH" if match else "NO MATCH"\n    print(f"  {nct}: criteria='{criteria}' → {status}")\nprint()\nprint("Guardrail: LLM must cite the specific criterion (e.g. 'EGFR+ matched')")\nprint("→ prevents hallucinated matches that could endanger patients")`,
    insight: "Clinical trial matching via LLM is the highest-stakes LLMOps use case — a hallucinated trial match could endanger a patient. The guardrail (every recommendation must cite the specific eligibility criterion) ensures the LLM grounds its answer in the actual trial protocol, not in a plausible-sounding fabrication.",
  },
];
