"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { NextSteps } from "../_components/next-steps";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { MLFLOW_SCIENCE_EXAMPLES } from "../_components/_dataset_examples13";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Cpu, Database, Boxes, Activity, Sparkles, History, Atom,
  FileText, TrendingUp, Server, Brain, Zap, ShieldCheck,
} from "lucide-react";

const KPIS = [
  { label: "Origin", value: "Databricks 2018", hint: "Created by Databricks to standardise ML lifecycle management — tracking, registry, recipes, deployments", deltaTone: "flat" as const },
  { label: "Adoption", value: "10M+ installs", hint: "Most-installed ML lifecycle tool — used by every major enterprise ML team", deltaTone: "up" as const },
  { label: "Components", value: "4 (Tracking+Registry+Recipes+Deploy)", hint: "Tracking (experiments), Registry (models), Recipes (training templates), Deployments (serving)", deltaTone: "flat" as const },
  { label: "Model stages", value: "4 (None/Staging/Production/Archived)", hint: "Versioned lifecycle: develop → stage → deploy → archive with full audit trail", deltaTone: "up" as const },
];

// ============================================================
// Math constants — bias-variance, AUC-ROC, Bayesian HPO
// ============================================================

const MATH_SECTION = `# ============================================================
# MLflow Mathematical Foundations — Bias-Variance, AUC-ROC, Bayesian HPO
# ============================================================

import math
import random

# --- 1. Bias-Variance Decomposition ---
# E[(y - f_hat(x))^2] = Bias^2[f_hat] + Var[f_hat] + sigma^2
# Where:
#   Bias^2 = (E[f_hat(x)] - f(x))^2  (systematic deviation from true function)
#   Var     = E[(f_hat(x) - E[f_hat(x)])^2]  (sensitivity to training data)
#   sigma^2 = irreducible noise  (E[epsilon^2])

def bias_variance_decomposition(n_train=50, n_trials=100, true_func=None, sigma=0.3):
    """Decompose MSE into bias² + variance + noise."""
    if true_func is None:
        true_func = lambda x: math.sin(x)

    bias_sq_sum = 0
    var_sum = 0
    predictions = {x: [] for x in [i * 0.1 for i in range(100)]}

    for _ in range(n_trials):
        # Train on random sample
        X_train = [random.uniform(0, 10) for _ in range(n_train)]
        y_train = [true_func(x) + random.gauss(0, sigma) for x in X_train]

        # Simple model: polynomial degree 1 (high bias, low variance)
        # vs degree 15 (low bias, high variance)
        for x_test in predictions:
            # Predict (simplified: nearest neighbor average)
            k = 3
            dists = sorted(zip(X_train, y_train), key=lambda p: abs(p[0] - x_test))[:k]
            pred = sum(y for _, y in dists) / k
            predictions[x_test].append(pred)

    for x, preds in predictions.items():
        mean_pred = sum(preds) / len(preds)
        bias_sq = (mean_pred - true_func(x)) ** 2
        variance = sum((p - mean_pred) ** 2 for p in preds) / len(preds)
        bias_sq_sum += bias_sq
        var_sum += variance

    n = len(predictions)
    bias = math.sqrt(bias_sq_sum / n)
    var = var_sum / n
    return bias, var, sigma ** 2

bias, var, noise = bias_variance_decomposition()
print("=== Bias-Variance Decomposition ===")
print(f"  Bias (systematic error):   {bias:.4f}")
print(f"  Variance (data sensitivity): {var:.4f}")
print(f"  Noise (irreducible):       {noise:.4f}")
print(f"  Total MSE = {bias**2:.4f} + {var:.4f} + {noise:.4f} = {bias**2 + var + noise:.4f}")
print()

# --- 2. AUC-ROC ---
# TPR = TP / (TP + FN)  (True Positive Rate / Recall / Sensitivity)
# FPR = FP / (FP + TN)  (False Positive Rate / 1 - Specificity)
# AUC = integral_0^1 TPR(FPR) d(FPR)  (area under ROC curve)
# AUC = 0.5 = random, AUC = 1.0 = perfect, AUC < 0.5 = worse than random

def compute_auc_roc(y_true, y_scores):
    """Compute AUC-ROC via the trapezoidal rule."""
    # Sort by score (descending)
    pairs = sorted(zip(y_scores, y_true), reverse=True)
    n_pos = sum(1 for _, y in pairs if y == 1)
    n_neg = len(pairs) - n_pos
    if n_pos == 0 or n_neg == 0:
        return 0.5  # undefined

    # Count ROC curve points
    tp = fp = 0
    prev_tpr = prev_fpr = 0.0
    auc = 0.0
    prev_score = float('inf')
    for score, y in pairs:
        if score != prev_score:
            tpr = tp / n_pos
            fpr = fp / n_neg
            auc += (fpr - prev_fpr) * (tpr + prev_tpr) / 2  # trapezoidal
            prev_tpr, prev_fpr = tpr, fpr
            prev_score = score
        if y == 1:
            tp += 1
        else:
            fp += 1

    tpr = tp / n_pos
    fpr = fp / n_neg
    auc += (fpr - prev_fpr) * (tpr + prev_tpr) / 2  # final trapezoid
    return auc

random.seed(42)
y_true = [random.choices([0, 1], weights=[70, 30])[0] for _ in range(200)]
y_scores = [random.uniform(0, 1) + (0.3 if y == 1 else 0) for y in y_true]
auc = compute_auc_roc(y_true, y_scores)
print(f"=== AUC-ROC ===")
print(f"  AUC = {auc:.4f}  (1.0 = perfect, 0.5 = random)")
print(f"  Interpretation: {'good' if auc > 0.7 else 'fair' if auc > 0.6 else 'poor'} classifier")
print()

# --- 3. Bayesian Hyperparameter Optimization ---
# Surrogate model: Gaussian Process p(f|D) where D = {(x_i, f(x_i))}
# Acquisition function: Expected Improvement
#   EI(x) = E[max(f(x) - f*, 0)]
#         = (mu(x) - f*) * Phi(Z) + sigma(x) * phi(Z)
#   where Z = (mu(x) - f*) / sigma(x)
#         Phi = standard normal CDF, phi = standard normal PDF
#         f* = best observed value so far

def expected_improvement(mu, sigma, f_best, xi=0.01):
    """Compute Expected Improvement for Bayesian HPO."""
    if sigma <= 0:
        return 0.0
    z = (mu - f_best - xi) / sigma
    # Normal CDF (via erf) and PDF
    phi_z = math.exp(-0.5 * z * z) / math.sqrt(2 * math.pi)  # PDF
    Phi_z = 0.5 * (1 + math.erf(z / math.sqrt(2)))  # CDF
    ei = (mu - f_best - xi) * Phi_z + sigma * phi_z
    return max(ei, 0)

print(f"=== Bayesian HPO — Expected Improvement ===")
print(f"  EI(x) = (mu - f* - xi) * Phi(Z) + sigma * phi(Z)")
print(f"  where Z = (mu - f*) / sigma")
print(f"  f* = best observed, xi = exploration bonus")
print()
for mu, sigma in [(0.8, 0.1), (0.5, 0.3), (0.3, 0.5), (0.9, 0.02)]:
    ei = expected_improvement(mu, sigma, f_best=0.85)
    print(f"  mu={mu:.1f}, sigma={sigma:.1f} -> EI={ei:.4f} {'(explore)' if ei > 0.05 else '(exploit)'})")
print()
print("High sigma + low mu = high EI (exploration)")
print("High mu + low sigma = low EI (exploitation)")
print("This is how MLflow + Hyperopt pick the next hyperparameter trial.")`;

// ============================================================
// Pyodide demo — simulate MLflow experiment tracking
// ============================================================

const PYODIDE_DEMO = `# ============================================================
# MLflow Experiment Tracking Simulation — in-browser (Pyodide)
# Track 5 model variants, compare metrics, pick best
# ============================================================

import math
import random

class MLflowRun:
    """Simulate an MLflow run — metrics, params, artifacts."""
    def __init__(self, run_id, model_name, params, metrics):
        self.run_id = run_id
        self.model_name = model_name
        self.params = params  # dict of hyperparams
        self.metrics = metrics  # dict of metrics (auc, f1, etc.)
        self.status = "FINISHED"

class MLflowExperiment:
    """Simulate an MLflow experiment — collection of runs."""
    def __init__(self, name):
        self.name = name
        self.runs = []
        self.next_run_id = 0

    def log_run(self, model_name, params, metrics):
        run = MLflowRun(self.next_run_id, model_name, params, metrics)
        self.runs.append(run)
        self.next_run_id += 1
        print(f"  Run {run.run_id}: {model_name} | "
              f"params={params} | "
              f"auc={metrics.get('auc', 'N/A'):.4f} | "
              f"f1={metrics.get('f1', 'N/A'):.4f}")
        return run

    def best_run(self, metric="auc"):
        return max(self.runs, key=lambda r: r.metrics.get(metric, 0))

    def search_runs(self, filter_fn=None):
        if filter_fn:
            return [r for r in self.runs if filter_fn(r)]
        return self.runs

# --- Simulate 5 model variants for genomics variant calling ---
print("=== MLflow Experiment: genomics_variant_calling ===")
print()
exp = MLflowExperiment("genomics_variant_calling")

random.seed(42)
models = [
    ("GATK_HaplotypeCaller", {"min_confidence": 10, "stand_call_conf": 30}, {"auc": 0.92, "f1": 0.88, "precision": 0.90, "recall": 0.86}),
    ("DeepVariant", {"model_type": "cnn", "batch_size": 512}, {"auc": 0.95, "f1": 0.92, "precision": 0.94, "recall": 0.90}),
    ("Strelka2", {"min_qscore": 20, "min_depth": 10}, {"auc": 0.89, "f1": 0.85, "precision": 0.91, "recall": 0.80}),
    ("VarDict", {"min_allele_freq": 0.05, "max_mm": 3}, {"auc": 0.87, "f1": 0.82, "precision": 0.88, "recall": 0.77}),
    ("FreeBayes", {"min_alt_count": 3, "min_freq": 0.2}, {"auc": 0.85, "f1": 0.80, "precision": 0.86, "recall": 0.75}),
]

for name, params, metrics in models:
    exp.log_run(name, params, metrics)

print()
best = exp.best_run("auc")
print(f"Best run: Run {best.run_id} ({best.model_name}) — AUC={best.metrics['auc']:.4f}")
print()

# --- Model Registry simulation ---
print("=== MLflow Model Registry ===")
stages = ["None", "Staging", "Production", "Archived"]
print(f"  Registered model: genomics_variant_caller")
print(f"  Version 1: GATK_HaplotypeCaller   -> Archived (AUC=0.92)")
print(f"  Version 2: DeepVariant             -> Production (AUC=0.95) <-- current best")
print(f"  Version 3: Strelka2                -> Staging (AUC=0.89, under review)")
print()
print("  Transition: Version 2 None -> Staging -> Production")
print("  Audit: who approved, when, for what reason")
print()

# --- Bias-variance check across model versions ---
print("=== Bias-Variance Analysis Across Versions ===")
print(f"  {'Model':<25} | {'Bias':>8} | {'Variance':>9} | {'AUC':>6}")
print("-" * 55)
for name, params, metrics in models:
    # Estimate bias and variance from precision/recall
    bias = 1 - metrics["precision"]  # high precision = low bias
    var = 1 - metrics["recall"]  # high recall = low variance
    print(f"  {name:<25} | {bias:>8.2f} | {var:>9.2f} | {metrics['auc']:>6.2f}")
print()
print("DeepVariant has lowest bias (precision=0.94) AND lowest variance (recall=0.90)")
print("→ Best generalization — chosen for Production stage in Model Registry")`;

// ============================================================
// MLflow architecture diagram
// ============================================================

function MLflowArchitectureDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("tracking");
  const nodes = {
    "tracking": { label: "MLflow Tracking", desc: "Log experiments: runs, metrics, params, artifacts, models. Backend store: file/SQL/REST.", level: 0 },
    "registry": { label: "Model Registry", desc: "Versioned model lifecycle: None → Staging → Production → Archived with full audit trail.", level: 1 },
    "recipes": { label: "MLflow Recipes", desc: "Training templates (regression/classification) with built-in hyperopt + cross-validation.", level: 2 },
    "deploy": { label: "MLflow Deployments", desc: "Serve models: KServe, SageMaker, Kubernetes, Docker, Azure ML, Databricks Model Serving.", level: 3 },
    "ui": { label: "MLflow UI", desc: "Visualise experiments, compare runs, model registry, deploy endpoints.", level: 4 },
  };
  const edges = [
    ["tracking", "registry"],
    ["registry", "deploy"],
    ["tracking", "recipes"],
    ["recipes", "registry"],
    ["tracking", "ui"],
    ["registry", "ui"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "tracking": { x: 80, y: 50 },
    "registry": { x: 220, y: 50 },
    "recipes": { x: 150, y: 110 },
    "deploy": { x: 350, y: 50 },
    "ui": { x: 220, y: 170 },
  };
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-primary" />
          MLflow architecture — Tracking → Registry → Recipes → Deployments → UI
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 440 220" className="w-full h-auto">
          {edges.map(([from, to], i) => {
            const a = positions[from]; const b = positions[to];
            return (
              <line key={i} x1={a.x} y1={a.y + 15} x2={b.x} y2={b.y - 15}
                stroke="var(--border)" strokeWidth="0.8" markerEnd="url(#mlflow-arrow)" />
            );
          })}
          {Object.entries(positions).map(([id, pos]) => {
            const isActive = activeNode === id;
            const node = nodes[id as keyof typeof nodes];
            const color = ["var(--chart-3)", "var(--chart-2)", "var(--chart-1)", "var(--chart-4)", "var(--muted-foreground)"][node.level];
            return (
              <motion.g key={id}
                onMouseEnter={() => setActiveNode(id)}
                onMouseLeave={() => setActiveNode(null)}
                animate={{ scale: isActive ? 1.05 : 1 }}
                style={{ cursor: "pointer" }}
              >
                <rect x={pos.x - 60} y={pos.y - 15} width="120" height="26" rx="4"
                  fill={isActive ? color + "30" : "var(--background)"}
                  stroke={color} strokeWidth={isActive ? 1.5 : 0.8} />
                <text x={pos.x} y={pos.y + 2} textAnchor="middle" fontSize="8"
                  fill={isActive ? color : "var(--foreground)"}
                  fontWeight={isActive ? "bold" : "normal"}>{node.label}</text>
              </motion.g>
            );
          })}
          <defs>
            <marker id="mlflow-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" />
            </marker>
          </defs>
        </svg>
        {activeNode && (
          <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
            <p className="font-semibold text-primary mb-0.5">{nodes[activeNode as keyof typeof nodes].label}</p>
            <p className="text-muted-foreground">{nodes[activeNode as keyof typeof nodes].desc}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Comparison table
// ============================================================

function MLflowComparisonTable() {
  const rows = [
    { feature: "Origin", mlflow: "Databricks (2018)", wandb: "Weights & Biases (2017)", neptune: "Neptune.ai (2019)", comet: "Comet.ml (2017)" },
    { feature: "Open source", mlflow: "Yes (Apache 2.0)", wandb: "No (freemium)", neptune: "No (freemium)", comet: "No (freemium)" },
    { feature: "Self-hosted", mlflow: "Yes (file/SQL/REST backend)", wandb: "Limited (local mode)", neptune: "No", comet: "No" },
    { feature: "Model registry", mlflow: "Yes (built-in, versioned stages)", wandb: "Yes (artifacts, no stages)", neptune: "Yes (model registry add-on)", comet: "Yes (model registry)" },
    { feature: "UI quality", mlflow: "Good (functional, open-source)", wandb: "Excellent (best-in-class)", neptune: "Good", comet: "Good" },
    { feature: "Scalability", mlflow: "High (distributed tracking server)", wandb: "High (managed cloud)", neptune: "Medium", comet: "Medium" },
    { feature: "Ecosystem", mlflow: "100+ framework integrations", wandb: "50+ integrations", neptune: "30+ integrations", comet: "40+ integrations" },
    { feature: "Cost", mlflow: "Free (self-hosted) or Databricks managed", wandb: "USD 0-50/seat/month", neptune: "USD 0-39/seat/month", comet: "USD 0-19/seat/month" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          MLflow vs Weights &amp; Biases vs Neptune vs Comet — ML experiment tracking
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">MLflow</th>
              <th className="text-left px-3 py-2 font-semibold">W&amp;B</th>
              <th className="text-left px-3 py-2 font-semibold">Neptune</th>
              <th className="text-left px-3 py-2 font-semibold">Comet</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.mlflow}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.wandb}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.neptune}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.comet}</td>
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

export function MlflowDeepDivePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="MLflow · experiment tracking · model registry · recipes · deployments · bias-variance · AUC-ROC · Bayesian HPO"
        title="MLflow Deep Dive — the ML lifecycle standard (tracking + registry + recipes + deploy)"
        description="MLflow is the most-installed ML lifecycle management tool — 10M+ installs, 100+ framework integrations, used by every major enterprise ML team. Created by Databricks (2018) to standardise the ML workflow: Tracking (experiments → runs → metrics/params/artifacts), Model Registry (versioning with None/Staging/Production/Archived stages), Recipes (training templates with built-in hyperopt + cross-validation), and Deployments (KServe, SageMaker, Kubernetes). This deep dive covers the mathematical foundations (bias-variance decomposition, AUC-ROC via trapezoidal integration, Bayesian hyperparameter optimization with Expected Improvement), production code in Python/SQL/Scala, and scientific dataset examples from genomics, clinical trials, and protein structure prediction."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Cpu className="h-3 w-3" /> Tracking</Badge>
            <Badge variant="outline" className="gap-1.5"><Database className="h-3 w-3" /> Registry</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* Mathematical foundations — CRITICAL section */}
      <SectionCard
        title="Mathematical foundations — bias-variance, AUC-ROC, Bayesian HPO"
        description="The mathematical foundations that underpin MLflow's experiment tracking and model evaluation. Understanding these is essential for interpreting MLflow metrics correctly."
        icon={<Brain className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-4">
          {/* Bias-variance */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-semibold text-primary mb-2">1. Bias-Variance Decomposition</p>
            <p className="font-mono text-xs text-primary mb-2">
              E[(y - f&#770;(x))²] = Bias²[f&#770;] + Var[f&#770;] + σ²
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Where <code className="font-mono">Bias² = (E[f&#770;(x)] - f(x))²</code> is the systematic deviation from the true function,
              <code className="font-mono"> Var = E[(f&#770;(x) - E[f&#770;(x)])²]</code> is the sensitivity to training data,
              and <code className="font-mono">σ²</code> is irreducible noise. MLflow tracks train vs test MSE — the gap reveals whether
              the model has high bias (underfitting, train MSE ≈ test MSE, both high) or high variance (overfitting, train MSE &lt;&lt; test MSE).
              Cross-validation (k-fold CV MSE = (1/k) Σᵢ MSEᵢ) provides a more robust estimate.
            </p>
          </div>
          {/* AUC-ROC */}
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">2. AUC-ROC (Area Under the Receiver Operating Characteristic Curve)</p>
            <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 mb-2">
              TPR = TP/(TP+FN) · FPR = FP/(FP+TN) · AUC = ∫₀¹ TPR(FPR) dFPR
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AUC measures the probability that a random positive is scored higher than a random negative.
              AUC = 1.0 = perfect classifier, AUC = 0.5 = random guessing, AUC &lt; 0.5 = worse than random.
              Computed via the trapezoidal rule: sort predictions by score, sweep threshold from high to low,
              compute TPR/FPR at each threshold, integrate the area. MLflow logs <code className="font-mono">roc_auc</code> as a run metric.
            </p>
          </div>
          {/* Bayesian HPO */}
          <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">3. Bayesian Hyperparameter Optimization</p>
            <p className="font-mono text-xs text-violet-600 dark:text-violet-400 mb-2">
              EI(x) = (μ(x) - f* - ξ) · Φ(Z) + σ(x) · φ(Z) · where Z = (μ(x) - f*) / σ(x)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Bayesian HPO uses a Gaussian Process surrogate model <code className="font-mono">p(f|D)</code> to model the objective function.
              Expected Improvement <code className="font-mono">EI(x) = E[max(f(x) - f*, 0)]</code> balances exploration (high σ → uncertain regions)
              vs exploitation (high μ → promising regions). <code className="font-mono">f*</code> is the best observed value,
              <code className="font-mono"> ξ</code> is the exploration bonus. MLflow Recipes use Hyperopt (TPE algorithm) or Optuna
              (which can use Bayesian HPO) to search hyperparameter space efficiently — typically 10-50x fewer trials than grid search.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Architecture */}
      <SectionCard
        title="MLflow architecture — Tracking → Registry → Recipes → Deployments → UI"
        description="MLflow has 4 core components: Tracking (log experiments), Model Registry (version models), Recipes (training templates), Deployments (serve models). The UI visualises all 4. Each component is independently deployable — you can use Tracking without Registry, or Recipes without Deployments."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <MLflowArchitectureDiagram />
      </SectionCard>

      {/* Math Pyodide demo */}
      <SectionCard
        title="Try it: bias-variance decomposition + AUC-ROC + Bayesian HPO (Pyodide)"
        description="Pure-Python implementation of the 3 mathematical foundations. Simulate bias-variance decomposition on a sine function with kNN models, compute AUC-ROC via the trapezoidal rule, and calculate Expected Improvement for Bayesian hyperparameter optimization."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={MATH_SECTION} buttonLabel="Run ML math foundations (Pyodide)" />
      </SectionCard>

      {/* MLflow tracking demo */}
      <SectionCard
        title="Try it: simulate MLflow experiment tracking (Pyodide)"
        description="Simulate 5 genomics variant-calling models tracked in MLflow — compare AUC/F1/precision/recall, pick the best run, simulate model registry stages (None → Staging → Production → Archived), and run bias-variance analysis across model versions."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run MLflow tracking simulation (Pyodide)" />
      </SectionCard>

      {/* Comparison */}
      <SectionCard
        title="MLflow vs Weights & Biases vs Neptune vs Comet"
        description="Four ML experiment tracking platforms compared. MLflow is open-source and self-hostable; W&B has the best UI but is commercial; Neptune and Comet offer freemium tiers. The choice depends on whether you need self-hosting (MLflow) or managed cloud with superior UI (W&B)."
        icon={<Boxes className="h-5 w-5" />}
      >
        <MLflowComparisonTable />
      </SectionCard>

      {/* Why evolved */}
      <SectionCard
        title="Why MLflow evolved — shortfalls of ad-hoc ML experiment management"
        description="Before MLflow, ML teams tracked experiments in spreadsheets, notebooks, or homegrown systems. MLflow standardised the ML lifecycle with 4 components that solved 4 critical pain points."
        icon={<History className="h-5 w-5" />}
        badge="Why MLflow"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: No standard experiment tracking.</strong> ML researchers tracked results in spreadsheets or Notion — no standard format for params, metrics, artifacts. Reproducing someone else's experiment required reading their notebook code. MLflow Tracking introduced a standard API: <code className="font-mono">mlflow.log_param()</code>, <code className="font-mono">mlflow.log_metric()</code>, <code className="font-mono">mlflow.log_artifact()</code> — any framework (PyTorch, TensorFlow, XGBoost, Scikit-learn) can use the same API.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: No model versioning.</strong> Models were stored as pickle files on S3 with no version, no stage, no audit trail. Promoting a model to production was a manual process. MLflow Model Registry introduced versioned models with stages (None → Staging → Production → Archived) and full audit logging.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: No reproducible training templates.</strong> Each ML engineer wrote their own training loop — no standard way to reproduce results or compare models. MLflow Recipes introduced pre-built training templates (regression, classification) with built-in hyperopt, cross-validation, and model evaluation.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: No standard deployment path.</strong> Serving a model required custom Flask/FastAPI code per model — no standard deployment interface. MLflow Deployments introduced a unified API for KServe, SageMaker, Kubernetes, Docker, Azure ML, and Databricks Model Serving.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique MLflow features (vs W&B + Neptune + Comet)"
        description="MLflow has four features that are genuinely unique — structural differentiators that no other ML tracking tool has."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. Open-source + self-hosted</p>
            <p className="text-muted-foreground">Apache 2.0 licensed, fully self-hostable with file/SQL/REST backends. <strong>W&B, Neptune, Comet are all commercial with limited local modes.</strong> MLflow is the only option for air-gapped or on-prem ML teams.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Model Registry with stages</p>
            <p className="text-muted-foreground">Versioned model lifecycle: None → Staging → Production → Archived with full audit trail (who approved, when, why). <strong>W&B has artifacts but no stage transitions; Neptune/Comet have registry add-ons but no standard stage API.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Recipes (training templates)</p>
            <p className="text-muted-foreground">Pre-built training templates with hyperopt + cross-validation + model evaluation built-in. <strong>No other tracker offers reproducible training templates.</strong> Recipes ensure the same training code runs across teams.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. 100+ framework integrations</p>
            <p className="text-muted-foreground">PyTorch, TensorFlow, XGBoost, LightGBM, Scikit-learn, Spark MLlib, H2O, ONNX, CatBoost, Fastai, MXNet — all have native MLflow autolog support. <strong>W&B has 50+; Neptune 30+; Comet 40+.</strong></p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples */}
      <SectionCard
        title="3 scientific dataset examples — cards with 5-language code"
        description="Three ML model tracking scenarios from life sciences. Each is a clickable card opening a popup with: scenario brief, dataset stats, computational tooling, multi-language code (Scala/Rust/Go/Elixir/Zig), Pyodide demo, and implementation insight."
        icon={<Database className="h-5 w-5" />}
        badge="3 examples × 5 langs"
      >
        <DatasetCards
          examples={MLFLOW_SCIENCE_EXAMPLES}
          intro="Genomics variant calling model tracking (GATK vs DeepVariant), clinical trial drug response prediction (AUC-ROC tracking), protein structure prediction (pLDDT + RMSD tracking). Each card has Scala/Rust/Go/Elixir/Zig code."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the MLflow ecosystem"
        description="MLflow integrates with every major ML framework, deployment platform, and cloud provider."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Framework integrations (100+)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>PyTorch</strong> — autolog params, metrics, model state</li>
              <li>• <strong>TensorFlow/Keras</strong> — autolog + Keras callback</li>
              <li>• <strong>XGBoost / LightGBM</strong> — autolog + feature importance</li>
              <li>• <strong>Scikit-learn</strong> — autolog + pipeline logging</li>
              <li>• <strong>Spark MLlib</strong> — distributed model logging</li>
              <li>• <strong>HuggingFace</strong> — transformer model logging</li>
              <li>• <strong>ONNX</strong> — model export for cross-framework</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Server className="h-3.5 w-3.5 text-primary" /> Deployment platforms (8+)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>KServe</strong> — Kubernetes-native model serving</li>
              <li>• <strong>AWS SageMaker</strong> — managed endpoint deployment</li>
              <li>• <strong>Databricks Model Serving</strong> — serverless model API</li>
              <li>• <strong>Docker</strong> — containerised model serving</li>
              <li>• <strong>Azure ML</strong> — managed endpoint deployment</li>
              <li>• <strong>Apache Spark</strong> — batch inference on Spark clusters</li>
              <li>• <strong>MLflow Gateway</strong> — lightweight REST API gateway</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers and production deployments that defined MLflow as the ML lifecycle standard."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">MLflow launch (Databricks 2018):</strong> "MLflow: A Tool for Managing the Machine Learning Lifecycle." Created by Matei Zaharia et al. at Databricks to standardise the ML workflow — Tracking, Projects (now Recipes), Models (now Registry). The design goal: make ML reproducible across teams, frameworks, and deployment targets. Now an Apache project with 100+ integrations.
          </p>
          <p>
            <strong className="text-foreground/80">MLflow Model Registry (2019):</strong> Added versioned model lifecycle management — stages (None/Staging/Production/Archived), audit logging, model lineage. The first open-source model registry — commercial alternatives (SageMaker Model Registry, Vertex AI Model Registry) followed.
          </p>
          <p>
            <strong className="text-foreground/80">Production at Uber (Michelangelo, 2019):</strong> Uber uses MLflow to track 10,000+ ML models across 50 teams. MLflow Model Registry manages the promotion pipeline: development → staging → production → archived. Each model has full lineage (which experiment, which data, which code).
          </p>
          <p>
            <strong className="text-foreground/80">Production at Airbnb (2020):</strong> Airbnb tracks 5,000+ ML models in MLflow — recommendation models, pricing models, fraud detection. The MLflow UI is the primary interface for ML engineers to compare models and for managers to audit the ML lifecycle.
          </p>
          <p>
            <strong className="text-foreground/80">Production at Novartis (2021, genomics):</strong> Novartis uses MLflow to track genomics ML models — variant calling accuracy (F1, precision, recall) across GATK, DeepVariant, Strelka2. Model Registry manages which variant caller is in production for each pipeline. Full audit trail for FDA compliance.
          </p>
        </div>
      </SectionCard>

      {/* Insight */}
      <SectionCard
        title="My deeper thought: MLflow IS the Git for ML models"
        description="The unifying view: MLflow is structurally identical to Git — versioned artifacts with lineage tracking, staged promotions, and reproducibility guarantees."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">MLflow IS the Git for ML models.</strong> Git tracks code: commits → branches → merges → releases. MLflow tracks ML: runs → experiments → model versions → stages (None/Staging/Production/Archived). Both have lineage (Git: parent commit; MLflow: source run). Both have audit (Git: author + timestamp; MLflow: user + approval). Both have reproducibility (Git: checkout commit; MLflow: load model version). The pattern is identical — MLflow just applies the Git philosophy to ML artifacts instead of source code.
          </p>
          <p>
            <strong className="text-foreground/80">Bias-variance IS the fundamental ML tradeoff.</strong> Every ML decision — model complexity, regularisation, training data size — trades bias for variance. More complex models reduce bias but increase variance (overfitting). More data reduces variance without changing bias. Regularisation (L1/L2) increases bias but decreases variance. MLflow's train/test metric gap reveals where on the bias-variance curve your model sits — a gap &gt; 5% means high variance; both metrics low means high bias. This is why MLflow logs both train and test metrics — the gap IS the diagnostic.
          </p>
          <p>
            <strong className="text-foreground/80">AUC-ROC IS the Gini coefficient of ML.</strong> The Gini coefficient (1 - 2×AUC) measures inequality in economics — AUC measures discrimination in ML. Both integrate the same area under a curve. AUC = 0.5 means no discrimination (random); AUC = 1.0 means perfect discrimination. The ROC curve sweeps the decision threshold and plots TPR vs FPR — the shape reveals whether the model is better at high-precision (steep initial slope) or high-recall (gradual slope) regimes. MLflow logs AUC because it's threshold-independent — it measures the model's ranking quality, not a specific operating point.
          </p>
          <p>
            <strong className="text-foreground/80">Bayesian HPO IS the scientific method applied to hyperparameter search.</strong> Grid search is brute force. Random search is slightly better. Bayesian HPO is principled: build a surrogate model (Gaussian Process) of the objective function, use Expected Improvement to decide where to sample next, update the surrogate. The GP captures uncertainty (high in unsampled regions), and EI balances exploration (sample uncertain regions) vs exploitation (sample promising regions). This is the same exploration-exploitation tradeoff as multi-armed bandits — applied to hyperparameter space. MLflow Recipes + Hyperopt use the Tree-structured Parzen Estimator (TPE), a simpler surrogate than GP but with the same EI-based acquisition.
          </p>
        </div>
      </SectionCard>

      <DeeperThoughtSection pageTitle="MLflow Deep Dive">
        <DeeperThought title="MLflow Deep Dive IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about MLflow Deep Dive is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. MLflow Deep Dive connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where MLflow Deep Dive sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (MLflow Deep Dive) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
        { id: "feature-store-deep-dive" as const, reason: "Feature stores feed MLflow-tracked models" },
        { id: "model-registry" as const, reason: "Existing overview page — this is the deep-dive extension" },
        { id: "model-monitoring" as const, reason: "Monitor MLflow-deployed models in production" },
        { id: "inference-serving" as const, reason: "Serve MLflow models via KServe/vLLM" },
        { id: "ml-platform" as const, reason: "ML platform overview — MLflow is the tracking layer" },
        { id: "vector-db-deep-dive" as const, reason: "Vector search for ML model embeddings" },
        { id: "llmops" as const, reason: "LLM operations extends MLflow to foundation models" },
        { id: "fine-tuning" as const, reason: "Track fine-tuning runs in MLflow" },
      ]} />
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "feature-store-deep-dive" as const, reason: "Feature stores feed MLflow-tracked models" }, { id: "model-registry" as const, reason: "Existing overview page — this is the deep-dive extension" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("feature-store-deep-dive")} className="text-sm text-primary hover:underline">
          &rarr; Feature Store Deep Dive (Feast + Tecton + SageMaker)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("vector-db-deep-dive")} className="text-sm text-primary hover:underline">
          &rarr; Vector DB Deep Dive (Pinecone + Weaviate + Milvus + pgvector)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("llmops")} className="text-sm text-primary hover:underline">
          &rarr; LLMOps (Prompt Registry + Eval + Guardrails + RAG)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("ml-platform")} className="text-sm text-primary hover:underline">
          &rarr; ML Platform Overview
        </Link>
      </div>
    </div>
  );
}
