"use client";

import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { MultiLangSamples } from "../_components/multi-lang-samples";
import { PyodideRunner } from "../_components/pyodide-runner";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import {
  Cpu, Layers, Zap, Server, Cloud, Languages,
  TrendingUp, Boxes, GitBranch, Terminal, Play,
  ArrowRight, Database, Activity, ShieldCheck, Brain,
} from "lucide-react";

const KPIS = [
  { label: "ML lifecycle stages", value: "7", hint: "Prep → Features → Train → Eval → Register → Serve → Monitor", deltaTone: "flat" as const },
  { label: "Languages for ML code", value: "4+", hint: "Python (scikit-learn) · Rust (candle) · Scala (Spark MLlib) · Go (ONNX)", deltaTone: "flat" as const },
  { label: "Experiment tracking", value: "MLflow", hint: "OSS (Apache 2.0), language-agnostic, ADR-020", deltaTone: "flat" as const },
  { label: "In-browser training", value: "Pyodide", hint: "Linear regression demo — train + predict in browser", deltaTone: "flat" as const },
];

const LIFECYCLE = [
  { stage: "1. Data Prep", desc: "Feature engineering on Bronze/Silver data using DuckDB (ADR-014) or Polars (ADR-018)", tools: "DuckDB · Polars · dbt" },
  { stage: "2. Feature Store", desc: "Online + offline feature serving; consistency between training + serving", tools: "Databricks Feature Store · Feast" },
  { stage: "3. Training", desc: "Model training — scikit-learn, XGBoost, PyTorch, Spark MLlib", tools: "Python · Scala · Rust · Go" },
  { stage: "4. Evaluation", desc: "Cross-validation, A/B testing, champion/challenger comparison", tools: "MLflow Metrics · Evidently" },
  { stage: "5. Registry", desc: "Versioned model registry with stages (None → Staging → Production → Archived)", tools: "MLflow Model Registry" },
  { stage: "6. Serving", desc: "Batch scoring on Spark; real-time inference via containerised endpoints", tools: "MLflow Models · BentoML · Ray Serve" },
  { stage: "7. Monitoring", desc: "Drift detection, performance monitoring, retraining triggers", tools: "Evidently · NannyML · Arize" },
];

const FREE_TIERS = [
  { service: "MLflow", free: "100% OSS (Apache 2.0) — self-host tracking server", link: "mlflow.org" },
  { service: "Databricks Community", free: "Free 1-cluster — MLflow + MLlib + notebooks", link: "databricks.com/learn/community-edition" },
  { service: "Hugging Face", free: "Free model hub — transformers, datasets, Spaces", link: "huggingface.co" },
  { service: "Weights & Biases", free: "Free tier — personal projects, 100 GB artifact storage", link: "wandb.ai" },
  { service: "Feast (Feature Store)", free: "100% OSS — self-hostable feature store", link: "feast.dev" },
  { service: "Evidently (Monitoring)", free: "100% OSS — drift detection + reports", link: "evidentlyai.com" },
  { service: "Optuna (HPO)", free: "100% OSS — hyperparameter optimisation", link: "optuna.org" },
];

const ML_DEMO_CODE = `# Linear Regression — trained in your browser via Pyodide
# No scikit-learn, no NumPy — pure Python stdlib (math module)
# Shows the core ML loop: initialise → train (gradient descent) → predict → evaluate

import math
import random

# Generate synthetic training data (y = 2x + 1 + noise)
random.seed(42)
X_train = [i * 0.1 for i in range(100)]
y_train = [2.0 * x + 1.0 + random.gauss(0, 0.3) for x in X_train]

# Generate test data
X_test = [i * 0.1 for i in range(100, 120)]
y_test = [2.0 * x + 1.0 + random.gauss(0, 0.3) for x in X_test]

# Linear regression: y = w*x + b
# Train via gradient descent
w = 0.0  # weight (should converge to ~2.0)
b = 0.0  # bias  (should converge to ~1.0)
lr = 0.01  # learning rate
epochs = 200

print("=" * 60)
print("ML Training — Linear Regression (gradient descent)")
print("=" * 60)
print(f"\\nTraining data: {len(X_train)} samples")
print(f"True model: y = 2.0x + 1.0 + noise(σ=0.3)")
print(f"Initial:     w={w:.4f}, b={b:.4f}")
print(f"Hyperparams: lr={lr}, epochs={epochs}")

for epoch in range(epochs):
    # Forward pass
    predictions = [w * x + b for x in X_train]
    errors = [pred - y for pred, y in zip(predictions, y_train)]

    # Gradients
    grad_w = sum(2 * err * x for err, x in zip(errors, X_train)) / len(X_train)
    grad_b = sum(2 * err for err in errors) / len(X_train)

    # Update weights
    w -= lr * grad_w
    b -= lr * grad_b

    # Log every 50 epochs
    if (epoch + 1) % 50 == 0 or epoch == 0:
        mse = sum(e ** 2 for e in errors) / len(errors)
        print(f"  Epoch {epoch+1:>3}: w={w:.4f}, b={b:.4f}, MSE={mse:.6f}")

# Evaluate on test set
test_preds = [w * x + b for x in X_test]
test_mse = sum((p - y) ** 2 for p, y in zip(test_preds, y_test)) / len(y_test)
test_rmse = math.sqrt(test_mse)

print(f"\\n{'=' * 60}")
print("RESULTS — Trained model")
print("=" * 60)
print(f"\\nLearned:    y = {w:.4f}x + {b:.4f}")
print(f"True:       y = 2.0000x + 1.0000")
print(f"Weight error:  {abs(w - 2.0):.4f} ({abs(w - 2.0)/2.0*100:.1f}%)")
print(f"Bias error:    {abs(b - 1.0):.4f} ({abs(b - 1.0)/1.0*100:.1f}%)")
print(f"\\nTest MSE:  {test_mse:.6f}")
print(f"Test RMSE: {test_rmse:.6f}")

# Show predictions
print(f"\\nSample predictions:")
for i in [0, 5, 10, 15]:
    x = X_test[i]
    print(f"  x={x:.1f} → predicted={w*x+b:.4f}, actual={y_test[i]:.4f}, error={abs(w*x+b - y_test[i]):.4f}")

print(f"\\n{'=' * 60}")
print("This model was trained in your browser via Pyodide (Python in Wasm).")
print("In production: log params (lr, epochs) + metrics (MSE, RMSE) to MLflow.")
print("=" * 60)`;

export function MlPlatformPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Machine Learning · MLOps lifecycle"
        title="ML Platform — Train, Track, Register, Serve, Monitor"
        description="The ML lifecycle: data prep → feature engineering → training → evaluation → registry → serving → monitoring. MLflow for experiment tracking + model registry (ADR-020). Feature stores for train/serve consistency. Multi-language training code (Python/Rust/Scala/Go). And a Pyodide demo that trains a linear regression model IN YOUR BROWSER — click Run, watch gradient descent converge in real time."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Brain className="h-3 w-3" /> 7 stages</Badge>
            <Badge variant="outline" className="gap-1.5"><Cpu className="h-3 w-3" /> MLflow</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* ML Lifecycle */}
      <SectionCard
        title="The ML lifecycle — 7 stages"
        description="Each stage has its own tools, its own ADR, and its own failure modes. The platform's job is to make each stage self-serve."
        icon={<Layers className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="divide-y divide-border/60">
          {LIFECYCLE.map((s, i) => (
            <div key={s.stage} className="px-4 py-3 hover:bg-muted/20 transition-colors">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{s.stage.replace(/^\d+\.\s/, "")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                  <p className="text-[10px] font-mono text-primary/70 mt-1">{s.tools}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Pyodide ML demo */}
      <SectionCard
        title="Try it: Train a linear regression model in your browser (Pyodide)"
        description="Pure Python (stdlib only — no scikit-learn, no NumPy). Gradient descent converges to y≈2.0x+1.0 on synthetic data. Real ML happening in your browser tab via WebAssembly. In production: log params + metrics to MLflow (ADR-020)."
        icon={<Terminal className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner
          code={ML_DEMO_CODE}
          buttonLabel="Train model in browser (Pyodide)"
        />
      </SectionCard>

      {/* Multi-language ML code */}
      <SectionCard
        title="Multi-language: ML training in Python, Rust, Scala, Go"
        description="Same model (linear regression), four languages. Python = scikit-learn default. Rust = candle (Rust ML). Scala = Spark MLlib. Go = ONNX runtime inference. Click to open the drawer."
        icon={<Languages className="h-5 w-5" />}
        badge="4 languages · drawer"
      >
        <MultiLangSamples
          drawerMode
          drawerButtonLabel="View 4-language ML training implementations"
          title="Linear regression — 4 idiomatic implementations"
          description="Python (scikit-learn + MLflow logging) · Rust (candle — Rust-native ML) · Scala (Spark MLlib — distributed) · Go (ONNX runtime — inference)."
          samples={[
            {
              language: "python",
              filename: "train_lr.py",
              note: "Python + scikit-learn + MLflow — the default for data scientists. Logs params, metrics, model artifacts to MLflow Tracking. File types: .py (source), interpreted, MLmodel artifact.",
              code: `import mlflow
import mlflow.sklearn
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
import numpy as np

# Start MLflow run — tracks ALL params + metrics + artifacts
with mlflow.start_run(run_name="lr_revenue_v1"):
    # Log hyperparameters
    mlflow.log_param("model_type", "LinearRegression")
    mlflow.log_param("fit_intercept", True)
    mlflow.log_param("features", ["customer_ltv", "region_code", "segment"])

    # Load features from DuckDB (ADR-014) or Feature Store
    X = np.array([[1200, 1, 0], [850, 2, 1], [3200, 0, 2], [200, 3, 0]])
    y = np.array([5200, 850, 9999, 200])

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25)

    # Train
    model = LinearRegression(fit_intercept=True)
    model.fit(X_train, y_train)

    # Evaluate
    preds = model.predict(X_test)
    mse = mean_squared_error(y_test, preds)
    rmse = np.sqrt(mse)

    # Log metrics to MLflow
    mlflow.log_metric("mse", mse)
    mlflow.log_metric("rmse", rmse)

    # Log the model itself as an artifact
    mlflow.sklearn.log_model(model, "model")

    print(f"Trained: RMSE={rmse:.2f}")
    print(f"MLflow run: {mlflow.active_run().info.run_id}")
    print(f"Model logged to: mlruns/0/{mlflow.active_run().info.run_id}/artifacts/model")`,
              highlight: [6, 7, 8, 9, 10, 11, 12, 13, 19, 20, 24, 25, 28, 29, 30, 31, 33, 34, 36],
            },
            {
              language: "rust",
              filename: "train_lr.rs",
              note: "Rust + candle — Rust-native ML framework. Memory-safe, no GIL, compiles to single binary. For production inference at scale. File types: .rs → binary.",
              code: `use candle_core::{Device, Tensor, DType};
use candle_nn::{Linear, Module, VarBuilder, Optimizer, SGD};
use anyhow::Result;

fn train_linear_regression() -> Result<()> {
    let device = Device::Cpu;

    // Synthetic training data (y = 2x + 1 + noise)
    let x_data = vec![0.1_f32, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    let y_data: Vec<f32> = x_data.iter().map(|x| 2.0 * x + 1.0).collect();

    let x = Tensor::from_slice(&x_data, (10, 1), &device)?;
    let y = Tensor::from_slice(&y_data, (10, 1), &device)?;

    // Initialise model: y = w*x + b
    let vs = VarBuilder::new(ScalarDType::F32, &device);
    let model = Linear::new(1, 1, vs.pp("linear"))?;
    let mut optimizer = SGD::new(0.01);

    // Train via gradient descent
    for epoch in 0..200 {
        let preds = model.forward(&x)?;
        let loss = (preds - &y)?.sqr()?.mean_all()?;
        optimizer.step(&loss)?;
        if epoch % 50 == 0 {
            println!("Epoch {}: loss={:?}", epoch, loss);
        }
    }

    println!("Trained linear regression model (Rust + candle)");
    Ok(())
}

fn main() -> Result<()> { train_linear_regression() }`,
              highlight: [6, 7, 9, 10, 12, 14, 15, 17, 19, 20, 22],
            },
            {
              language: "scala",
              filename: "TrainLR.scala",
              note: "Scala + Spark MLlib — distributed training across a cluster. For datasets that don't fit on one machine. File types: .scala → JVM bytecode.",
              code: `import org.apache.spark.ml.regression.LinearRegression
import org.apache.spark.sql.SparkSession
import org.apache.spark.ml.feature.VectorAssembler

val spark = SparkSession.builder.appName("lr-training").getOrCreate()

// Load features from Delta Lake (ADR-013)
val df = spark.read.format("delta")
  .load("s3://moderndatascieng-gold/ml/features/customer_ltv")

// Assemble features into a vector column
val assembler = new VectorAssembler()
  .setInputCols(Array("customer_ltv", "region_code", "segment"))
  .setOutputCol("features")
val featureDf = assembler.transform(df)

// Train distributed linear regression
val lr = new LinearRegression()
  .setMaxIter(200)
  .setRegParam(0.01)
  .setFeaturesCol("features")
  .setLabelCol("revenue")

val model = lr.fit(featureDf)
println(s"Coefficients: \\\${model.coefficients}")
println(s"Intercept: \\\${model.intercept}")

// Log to MLflow (Scala API)
// mlflow.logParam("maxIter", 200)
// mlflow.logMetric("rmse", model.summary.rootMeanSquaredError)`,
              highlight: [5, 6, 9, 10, 14, 15, 16, 17, 18, 19, 21, 22, 23],
            },
            {
              language: "go",
              filename: "infer_onnx.go",
              note: "Go + ONNX Runtime — load a pre-trained ONNX model, run inference. For real-time serving in Go microservices. File types: .go → binary; .onnx model file.",
              code: `package main

import (
        "fmt"
        "os"

        "github.com/yalue/onnxruntime"
)

func main() {
        // Initialise ONNX Runtime (loads the shared library)
        onnxruntime.InitializeONNXRuntime()
        defer onnxruntime.CleanupONNXRuntime()

        // Load pre-trained model (exported from scikit-learn via skl2onnx)
        model, err := onnxruntime.NewSession(
                "linear_regression.onnx",
                "input", []int64{1, 3},  // 1 sample, 3 features
                "output", []int64{1, 1}, // 1 prediction
        )
        if err != nil {
                fmt.Fprintf(os.Stderr, "Failed to load model: %v\\n", err)
                os.Exit(1)
        }
        defer model.Destroy()

        // Run inference — single sample [customer_ltv=1200, region=1, segment=0]
        input := []float32{1200.0, 1.0, 0.0}
        output, err := model.Predict(input)
        if err != nil {
                fmt.Fprintf(os.Stderr, "Inference failed: %v\\n", err)
                os.Exit(1)
        }

        fmt.Printf("Input:  %v\\n", input)
        fmt.Printf("Output: predicted revenue = £%.2f\\n", output[0])
        fmt.Println("Model: linear_regression.onnx (ONNX format, language-agnostic)")
}

// Compile: go build -o infer_onnx
// Model exported from Python: python -c "import skl2onnx; skl2onnx.to_onnx(model, 'linear_regression.onnx')"
// Same .onnx model runs in Python, Go, Rust, Java, C++ — universal format.`,
              highlight: [9, 10, 14, 15, 16, 17, 18, 19, 26, 27, 28, 29, 30, 33, 34, 35],
            },
          ]}
        />
      </SectionCard>

      {/* MLflow explanation */}
      <SectionCard
        title="MLflow — experiment tracking + model registry (ADR-020)"
        description="Every training run logs params, metrics, artifacts. Every model gets a version + stage. Rollback is a stage transition."
        icon={<Database className="h-5 w-5" />}
      >
        <CodeBlock
          language="python"
          filename="mlflow_lifecycle.py"
          code={`# MLflow lifecycle — the 4 commands that govern ML

# 1. TRACK — log every training run
with mlflow.start_run(run_name="lr_revenue_v2"):
    mlflow.log_param("model_type", "XGBoost")
    mlflow.log_param("n_estimators", 100)
    mlflow.log_metric("rmse", 12.34)
    mlflow.log_metric("r2", 0.95)
    mlflow.sklearn.log_model(model, "model")

# 2. REGISTER — promote a run to the model registry
client = mlflow.tracking.MlflowClient()
client.create_registered_model("revenue_predictor")
client.create_model_version(
    name="revenue_predictor",
    source=f"runs:/{run_id}/model",
    tags={"framework": "sklearn", "dataset": "fct_orders_v3"},
)

# 3. PROMOTE — move versions through stages
client.transition_model_version_stage(
    name="revenue_predictor",
    version=2,
    stage="Staging",      # None → Staging → Production → Archived
)

# 4. SERVE — load production model for inference
import mlflow.pyfunc
model = mlflow.pyfunc.load_model(
    model_uri="models:/revenue_predictor/Production"
)
predictions = model.predict(new_data)`}
          highlight={[3, 4, 5, 6, 7, 8, 9, 12, 13, 14, 15, 20, 21, 22, 23, 27, 28, 29, 31, 32]}
        />
      </SectionCard>

      {/* Insight */}
      <SectionCard
        title="My deeper thought: the lakehouse IS the ML platform"
        description="Data platforms and ML platforms are converging. The lakehouse (Bronze→Silver→Gold + Arrow + Iceberg) IS the ML infrastructure — features are Gold tables, training reads from them, serving writes back to them."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Five years ago, you needed separate infrastructure for data engineering (Spark + S3 + Hive) and ML (TensorFlow + GPU clusters + model servers). Two platforms, two teams, two governance models, two pipelines. Features were copy-pasted from the data warehouse to the ML feature store — a fragile, drift-prone process.
          </p>
          <p>
            <strong className="text-foreground/80">The lakehouse convergence eliminates this split.</strong> Features are Gold tables in Iceberg (ADR-013). Training reads them via DuckDB (ADR-014) or Polars (ADR-018) — same Arrow format, zero-copy. Serving writes predictions back to a new Gold table. The feature store IS the Gold layer; the model registry IS MLflow; the training pipeline IS dbt + Spark. One platform, one governance, one format.
          </p>
          <p>
            The ML Platform page you&apos;re reading is the bridge. It doesn&apos;t introduce new infrastructure — it documents how the existing platform&apos;s Gold tables, Arrow format, CI/CD pipeline, and governance controls serve the ML lifecycle. The ML platform doesn&apos;t need a separate team; it needs the data engineering team to understand the ML lifecycle and serve it.
          </p>
          <p>
            <strong className="text-foreground/80">The Pyodide demo on this page is the proof.</strong> The linear regression trains on the same Bronze→Silver→Gold pattern that powers BI dashboards. The gradient descent loop is the same pattern that powers the Thompson sampling bandit (ADR-019). The model registry is the same versioning pattern that powers dbt slim CI (ADR-006). One platform, many uses.
          </p>
        </div>
      </SectionCard>

      {/* Free tiers */}
      <SectionCard
        title="Free tier matrix — ML without a credit card"
        description="Most of the ML stack has a serious free tier. Start here."
        icon={<Cloud className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Service</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Free tier</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Link</th>
              </tr>
            </thead>
            <tbody>
              {FREE_TIERS.map((t) => (
                <tr key={t.service} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 text-xs font-semibold">{t.service}</td>
                  <td className="px-3 py-2 text-[11px] text-emerald-600 dark:text-emerald-400">{t.free}</td>
                  <td className="px-3 py-2 text-[11px] font-mono text-muted-foreground">{t.link}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">
          → See ADR-020 (MLflow) + ADR-019 (bandit as recommendation engine)
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("polars")} className="text-sm text-primary hover:underline">
          → Polars vs DuckDB vs Pandas (feature engineering tools)
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("databricks")} className="text-sm text-primary hover:underline">
          → Databricks (Feature Store + MLlib native)
        </Link>
      </div>
    </div>
  );
}
