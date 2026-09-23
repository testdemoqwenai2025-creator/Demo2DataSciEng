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
