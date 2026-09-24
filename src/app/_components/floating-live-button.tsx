"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Radio, ChevronUp } from "lucide-react";
import { LiveResourcesDrawer } from "./live-resources-drawer";
import { Button } from "@/components/ui/button";
import { pathnameToPageId, type PageId } from "../_lib/router";

/**
 * FloatingLiveButton — Material FAB pattern, fixed bottom-right.
 *
 * Opens the LiveResourcesDrawer pre-configured with the topic appropriate
 * to the current page. One persistent entry point across the whole
 * platform — replaces scattered inline "View live resources" buttons
 * on individual pages.
 *
 * Visual pattern: small circular button, pulsing emerald glow on first
 * load (subtle, not annoying). Dismissible per-session via localStorage
 * (resets next visit). After dismissal, becomes a quiet chevron-up that
 * still works on click.
 */

interface PageTopic {
  topic: string;
  codeRepo?: string;
  label: string;
}

const PAGE_TOPICS: Record<PageId, PageTopic> = {
  "home":                { topic: "modern data platform architecture single source of truth",       label: "Platform",      codeRepo: "apache/iceberg/main/README.md" },
  "architecture":        { topic: "data lakehouse medallion architecture bronze silver gold",       label: "Architecture",  codeRepo: "delta-io/delta/master/README.md" },
  "fivetran-hightouch":  { topic: "Fivetran Hightouch ELT reverse-ETL data activation",              label: "ELT + rETL",    codeRepo: "fivetran/fivetran/main/README.md" },
  "databricks":          { topic: "Apache Spark Delta Lake Lakehouse Databricks",                    label: "Databricks",    codeRepo: "delta-io/delta/master/README.md" },
  "snowflake":           { topic: "Snowflake cloud data warehouse",                                   label: "Snowflake",     codeRepo: "snowflakedb/snowflake-connector-python/main/README.md" },
  "dbt":                 { topic: "dbt data build tool analytics engineering semantic layer",        label: "dbt",           codeRepo: "dbt-labs/dbt-core/main/README.md" },
  "orchestration":       { topic: "Apache Airflow Dagster data orchestration DAG asset graph",       label: "Orchestration", codeRepo: "apache/airflow/main/README.md" },
  "tableau":             { topic: "Tableau analytics BI dashboard row-level security semantic layer", label: "Tableau",       codeRepo: "tableau/server-client-python/main/README.md" },
  "governance":          { topic: "Unity Catalogue data governance lineage observability OpenLineage",label: "Governance",    codeRepo: "OpenLineage/OpenLineage/main/README.md" },
  "cicd":                { topic: "GitHub Actions Terraform CI/CD data engineering DevOps",          label: "CI/CD",         codeRepo: "hashicorp/terraform/main/README.md" },
  "about":               { topic: "GDPR data governance compliance privacy engineering",              label: "About",         codeRepo: "OpenLineage/OpenLineage/main/README.md" },
  "knowledge":           { topic: "architecture decision records ADR patterns trade-offs",            label: "Knowledge",     codeRepo: "adr/madr/main/README.md" },
  "dashboard":           { topic: "data observability Monte Carlo anomaly detection pipeline monitoring", label: "Dashboard", codeRepo: "OpenLineage/OpenLineage/main/README.md" },
  "evolution":           { topic: "technology radar Thoughtworks data engineering roadmap",          label: "Evolution",     codeRepo: "thoughtworks/radar/main/README.md" },
  "research":            { topic: "MapReduce Delta Lake Kimball dimensional modelling Lakehouse",    label: "Research",      codeRepo: "apache/spark/main/README.md" },
  "modern-big-data":     { topic: "Apache Kafka Flink Spark streaming big data lakehouse",           label: "Big Data",      codeRepo: "apache/kafka/trunk/README.md" },
  "duckdb":              { topic: "DuckDB in-process OLAP analytical SQL Parquet Arrow",                label: "DuckDB",        codeRepo: "duckdb/duckdb/main/README.md" },
  "streaming":           { topic: "Apache Kafka Flink Pulsar streaming Lambda Kappa architecture",     label: "Streaming",     codeRepo: "apache/flink/main/README.md" },
  "arrow":               { topic: "Apache Arrow columnar in-memory format Flight zero-copy IPC",     label: "Arrow",          codeRepo: "apache/arrow/main/README.md" },
  "patterns":            { topic: "data engineering patterns Medallion SCD2 slim CI reverse-ETL",     label: "Patterns",       codeRepo: "dbt-labs/dbt-core/main/README.md" },
  "data-mesh":            { topic: "data mesh domain-oriented data products federated governance",      label: "Data Mesh",      codeRepo: "DataEngineeringZine/data-mesh/main/README.md" },
  "polars":              { topic: "Polars DuckDB Pandas DataFrame Arrow columnar benchmark",       label: "DataFrames",     codeRepo: "pola-rs/polars/main/README.md" },
  "ml-platform":         { topic: "MLflow machine learning MLOps model registry feature store inference", label: "ML Platform",   codeRepo: "mlflow/mlflow/main/README.md" },
  "neural-networks":     { topic: "neural networks deep learning transformer attention LLM GPT",     label: "Neural Nets",    codeRepo: "pytorch/pytorch/main/README.md" },
  "feature-store":       { topic: "feature store online offline train serve consistency Feast",        label: "Feature Store",  codeRepo: "feast-dev/feast/main/README.md" },
  "model-registry":      { topic: "MLflow model registry versioning staging production archived",      label: "Model Registry", codeRepo: "mlflow/mlflow/main/README.md" },
  "model-monitoring":    { topic: "model monitoring drift detection Evidently NannyML retraining",     label: "Monitoring",     codeRepo: "evidentlyai/evidently/main/README.md" },
  "rag-llms":            { topic: "RAG retrieval augmented generation vector database embeddings LLM", label: "RAG & LLMs",     codeRepo: "langchain-ai/langchain/main/README.md" },
  "vector-db":           { topic: "pgvector Pinecone Weaviate Qdrant vector database HNSW cosine similarity",  label: "Vector DBs",    codeRepo: "pgvector/pgvector/main/README.md" },
  "rl-agentic":          { topic: "reinforcement learning Q-learning PPO policy gradient agentic AI agents",  label: "RL & Agents",   codeRepo: "openai/spinningup/main/README.md" },
  "fine-tuning":         { topic: "LoRA QLoRA fine-tuning RLHF DPO LLM adaptation low-rank",                label: "Fine-Tuning",   codeRepo: "microsoft/LoRA/main/README.md" },
  "transformer":         { topic: "transformer self-attention multi-head positional encoding BERT GPT", label: "Transformer",  codeRepo: "pytorch/pytorch/main/README.md" },
  "comp-sci-materials":  { topic: "computational science materials chemistry silicon GPU semiconductor LLM hardware", label: "Comp Sci",     codeRepo: "cmu-db/oltp-bench/main/README.md" },
  "gen-ai-patterns":      { topic: "generative AI autoregressive decoding BPE tokeniser temperature sampling",      label: "Gen AI",         codeRepo: "openai/tiktoken/main/README.md" },
  "computer-vision":      { topic: "computer vision convolutional neural network Vision Transformer ViT CNN ResNet attention",      label: "Comp Vision",    codeRepo: "pytorch/vision/main/README.md" },
  "diffusion-models":     { topic: "diffusion models DDPM DDIM score matching U-Net noise schedule Langevin dynamics SDE",      label: "Diffusion",      codeRepo: "openai/improved-diffusion/main/README.md" },
  "distributed-training": { topic: "distributed training DDP FSDP ZeRO AllReduce Ring AllReduce PyTorch multi-GPU",      label: "Distributed",   codeRepo: "pytorch/pytorch/main/torch/distributed/README.md" },
  "mlops-tracing":        { topic: "OpenTelemetry distributed tracing spans critical path SLO observability MLflow",      label: "MLOps",          codeRepo: "open-telemetry/opentelemetry-python/main/README.md" },
  "quantization-inference": { topic: "LLM quantization NF4 AWQ GPTQ llama.cpp GGUF 4-bit inference QLoRA",      label: "Quantization",  codeRepo: "IST-DASLab/gptq/main/README.md" },
  "inference-serving":     { topic: "vLLM PagedAttention continuous batching KV cache LLM inference serving Triton OpenAI API",      label: "Inference",     codeRepo: "vllm-project/vllm/main/README.md" },
  "rag-deep-dive":         { topic: "RAG retrieval augmented generation hybrid BM25 vector cross-encoder re-rank chunking RRF",      label: "RAG",           codeRepo: "langchain-ai/langchain/main/README.md" },
  "multimodal-rag":         { topic: "CLIP SigLIP contrastive learning multi-modal RAG cross-modal embeddings shared embedding space",      label: "Multi-modal",   codeRepo: "google-research/big_vision/main/README.md" },
  "bioinformatics":         { topic: "bioinformatics sequence alignment Needleman-Wunsch Smith-Waterman BLAST BWA ESM-2 AlphaFold2 protein",      label: "Bioinformatics", codeRepo: "facebookresearch/esm/main/README.md" },
  "cheminformatics":         { topic: "cheminformatics ECFP fingerprint Tanimoto similarity ChemBERTa RDKit SMILES molecular virtual screening drug discovery",      label: "Cheminformatics", codeRepo: "rdkit/rdkit/main/README.md" },
  "molecular-modelling":      { topic: "molecular dynamics force field AMBER CHARMM Verlet integration E(n)-equivariant neural network AlphaFold3 SchNet Equiformer",      label: "Molecular Mod.",  codeRepo: "openmm/openmm/main/README.md" },
  "genetic-materials":         { topic: "genetics DNA RNA CRISPR Cas9 GWAS HMM Viterbi BLOSUM ENCODE GTEx UK Biobank BWA GATK genomics",      label: "Genetics",       codeRepo: "samtools/bcftools/main/README.md" },
  "macro-structures":          { topic: "protein structure Ramachandran Michaelis-Menten enzyme kinetics glycan WURCS lipid LIPID MAPS AlphaFold DB",      label: "Macro Structures", codeRepo: "dptech-corp/Uni-Mol/main/README.md" },
  "systems-biology":           { topic: "systems biology FBA flux balance analysis metabolic network PPI STRING multi-omics MOFA whole-cell COBRApy",      label: "Systems Biology", codeRepo: "opencobra/cobrapy/main/README.md" },
  "cryo-em":                    { topic: "cryo-EM RELION CryoSPARC cryoDRGN Fourier projection-slice CTF Radon transform single particle analysis",      label: "Cryo-EM",        codeRepo: "structuremlucsb/cryodrgn/main/README.md" },
  "spatial-transcriptomics":    { topic: "spatial transcriptomics Visium MERFISH Stereo-seq STAGATE NicheNet combinatorial barcoding U-Net cell segmentation",      label: "Spatial Tx",    codeRepo: "theislab/stlearn/main/README.md" },
  "singlecell-multiomics":      { topic: "single-cell multi-omics scVI WNN RNA velocity Harmony 10x Genomics scVelo Seurat multi-modal integration",      label: "Single-cell",   codeRepo: "scvi-tools/scvi-tools/main/README.md" },
  "alphamissense":              { topic: "AlphaMissense variant pathogenicity ClinVar gnomAD PolyPhen CADD REVEL missense variant interpretation ACMG classification",      label: "AlphaMissense", codeRepo: "deepmind/alphamissense/main/README.md" },
  "alphaproteo":                { topic: "AlphaProteo RFdiffusion ProteinMPNN de novo protein design binder diffusion inverse folding ESM-IF",      label: "AlphaProteo",   codeRepo: "RosettaCommons/RFdiffusion/main/README.md" },
};

const DISMISS_KEY = "mdse-floating-live-dismissed-v1";

export function FloatingLiveButton() {
  const pathname = usePathname();
  const pageId = pathnameToPageId(pathname);
  const topic = PAGE_TOPICS[pageId] ?? PAGE_TOPICS.home;
  const [dismissed, setDismissed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Load dismissed state — deferred to a microtask to satisfy lint
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setDismissed(localStorage.getItem(DISMISS_KEY) === "true");
      } catch { /* ignore */ }
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, "true"); } catch { /* ignore */ }
  };

  // Hide on home page (the home page has its own search + CTAs that are enough)
  if (pageId === "home") return null;

  return (
    <>
      <style>{`
        @keyframes floatPulse {
          0%, 100% { box-shadow: 0 0 0 0 oklch(0.55 0.16 165 / 0.45); }
          50%      { box-shadow: 0 0 0 14px oklch(0.55 0.16 165 / 0); }
        }
        .float-pulse:not(.dismissed) { animation: floatPulse 2.5s ease-in-out infinite; }
      `}</style>

      <motion.div
        initial={{ opacity: 0, scale: 0.6, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
        className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2"
      >
        {/* Tooltip card — appears above the button (auto-hide after a few seconds) */}
        <AnimatePresence>
          {!dismissed && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ delay: 1.2 }}
              className="mb-1 max-w-[260px] rounded-lg border border-border/60 bg-popover p-2.5 shadow-lg"
            >
              <button
                onClick={handleDismiss}
                aria-label="Dismiss tooltip"
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full border border-border/60 bg-background flex items-center justify-center hover:bg-accent"
              >
                <X className="h-3 w-3" />
              </button>
              <p className="text-[11px] font-semibold flex items-center gap-1.5 text-primary">
                <Sparkles className="h-3 w-3" /> Live data for {topic.label}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                Fetches real-time arXiv papers + GitHub repos + Hugging Face datasets +
                Papers with Code for <span className="font-mono">{topic.topic}</span>
              </p>
              <p className="text-[9px] text-muted-foreground/70 mt-1.5 italic">
                Click the button below to open.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The floating button itself — wraps LiveResourcesDrawer trigger */}
        <LiveResourcesDrawer
          topic={topic.topic}
          codeRepo={topic.codeRepo}
          trigger={
            <button
              className={`float-pulse ${dismissed ? "dismissed" : ""} group relative h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center`}
              aria-label={`View live data for ${topic.label}`}
            >
              <Radio className="h-5 w-5 sm:h-6 sm:w-6 group-hover:animate-pulse" />
              {/* Small label badge that appears on hover (desktop) */}
              <span className="hidden sm:block absolute right-full mr-3 whitespace-nowrap text-[11px] font-medium px-2 py-1 rounded-md bg-popover text-popover-foreground border border-border/60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Live data for {topic.label}
              </span>
              {/* Live indicator dot */}
              <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-primary animate-pulse" />
              {dismissed && (
                <ChevronUp className="absolute inset-0 m-auto h-4 w-4 opacity-30" />
              )}
            </button>
          }
        />
      </motion.div>
    </>
  );
}
