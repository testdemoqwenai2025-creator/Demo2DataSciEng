"use client";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { NextSteps } from "../_components/next-steps";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Layers, ShieldCheck, Terminal, ArrowRight } from "lucide-react";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";

const KPIS = [
  { label: "Model stages", value: "4", hint: "None → Staging → Production → Archived", deltaTone: "flat" as const },
  { label: "Versioning", value: "Semantic", hint: "v1.0.0, v1.1.0, v2.0.0 — rollback to any", deltaTone: "flat" as const },
  { label: "A/B testing", value: "Champion/Challenger", hint: "Split traffic between prod + staging models", deltaTone: "flat" as const },
  { label: "Rollback time", value: "< 1 min", hint: "Transition stage: Production → Archived", deltaTone: "flat" as const },
];

export function ModelRegistryPage() {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="MLOps · model registry" title="Model Registry — Versioning + Stages"
        description="Every model is versioned. Every promotion is a stage transition. Rollback is a single API call. MLflow Model Registry (ADR-020) governs the lifecycle: train → register → promote → serve → monitor → rollback if needed."
        right={<Badge variant="outline" className="gap-1.5"><GitBranch className="h-3 w-3" /> MLflow</Badge>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />)}
      </div>
      <SectionCard title="Model lifecycle — the 4 stages" icon={<Layers className="h-5 w-5" />} contentClassName="p-0">
        <div className="grid md:grid-cols-4 divide-x divide-border/60">
          {[{stage:"None",desc:"Just registered, not deployed",color:"var(--muted)"},{stage:"Staging",desc:"A/B testing, champion/challenger",color:"var(--chart-5)"},{stage:"Production",desc:"Live, serving real traffic",color:"var(--chart-1)"},{stage:"Archived",desc:"Superseded or deprecated",color:"var(--chart-2)"}].map((s) => (
            <div key={s.stage} className="p-4">
              <div className="flex items-center gap-2 mb-2"><span className="h-3 w-3 rounded-full" style={{background:s.color}} /><p className="text-sm font-semibold">{s.stage}</p></div>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="MLflow Model Registry API" icon={<GitBranch className="h-5 w-5" />}>
        <CodeBlock language="python" filename="registry_api.py" highlight={[3,4,5,6,9,10,11,14,15,16,19,20]} code={`import mlflow
from mlflow.tracking import MlflowClient

client = MlflowClient()

# 1. REGISTER — create a new model version
client.create_model_version(
    name="revenue_predictor",
    source="runs:/abc123/model",
    tags={"framework": "xgboost", "dataset": "fct_orders_v3"},
)

# 2. PROMOTE — transition to staging
client.transition_model_version_stage(
    name="revenue_predictor", version=2, stage="Staging",
)

# 3. DEPLOY — promote staging to production
client.transition_model_version_stage(
    name="revenue_predictor", version=2, stage="Production",
    archive_existing_versions=True,  # auto-archive old prod
)

# 4. ROLLBACK — revert to previous version (1 min)
client.transition_model_version_stage(
    name="revenue_predictor", version=1, stage="Production",
    archive_existing_versions=True,
)

# 5. SERVE — load production model
model = mlflow.pyfunc.load_model("models:/revenue_predictor/Production")`} />
      </SectionCard>
      <SectionCard title="Try it: Model registry simulation (Pyodide)" icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={`# Model Registry — version + stage simulation
# Shows the full lifecycle: register → promote → rollback

models = {}

def register(name, version, framework, dataset):
    key = f"{name}_v{version}"
    models[key] = {"name": name, "version": version, "stage": "None",
                   "framework": framework, "dataset": dataset}
    print(f"  + Registered {key} (stage=None)")

def promote(name, version, target_stage, archive=False):
    key = f"{name}_v{version}"
    if key not in models:
        print(f"  ? {key} not found"); return
    old_stage = models[key]["stage"]
    models[key]["stage"] = target_stage
    print(f"  → {key}: {old_stage} → {target_stage}")
    if archive and target_stage == "Production":
        for k, m in models.items():
            if m["name"] == name and m["version"] != version and m["stage"] == "Production":
                m["stage"] = "Archived"
                print(f"  → {k}: Production → Archived (auto)")

print("=" * 60)
print("Model Registry — Lifecycle Simulation")
print("=" * 60)

register("revenue_predictor", 1, "sklearn", "fct_orders_v1")
register("revenue_predictor", 2, "xgboost", "fct_orders_v3")
register("churn_model", 1, "logistic", "dim_customer_v1")

print("\\n--- Promote v2 to Staging ---")
promote("revenue_predictor", 2, "Staging")

print("\\n--- Deploy v2 to Production (auto-archive v1) ---")
promote("revenue_predictor", 2, "Production", archive=True)

print("\\n--- Rollback to v1 ---")
promote("revenue_predictor", 1, "Production", archive=True)

print(f"\\n{'=' * 60}")
print("FINAL STATE:")
for key, m in sorted(models.items()):
    print(f"  {key}: stage={m['stage']}, framework={m['framework']}")
print("=" * 60)`} buttonLabel="Run registry simulation (Pyodide)" />
      </SectionCard>

      <DeeperThoughtSection pageTitle="Model Registry">
        <DeeperThought title="Model Registry IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Model Registry is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Model Registry connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Model Registry sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Model Registry) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "feature-store" as const, reason: "Continue to feature store — see also from this page" }, { id: "model-monitoring" as const, reason: "Continue to model monitoring — see also from this page" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("feature-store")} className="text-sm text-primary hover:underline">→ Feature Store</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("model-monitoring")} className="text-sm text-primary hover:underline">→ Model Monitoring</Link>
      </div>
    </div>
  );
}
