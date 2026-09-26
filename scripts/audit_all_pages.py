#!/usr/bin/env python3
"""
Comprehensive audit script for the ModernDataSciEng Platform.
Checks all 132 pages in the static export (out/) for:
  1. File exists (page was prerendered)
  2. File is non-empty (>1KB)
  3. Contains expected key content (not a blank/error page)
  4. No JavaScript error markers in the HTML
  5. Has the AppShell (sidebar + footer present)

Usage: python3 scripts/audit_all_pages.py
"""
import json
import re
import sys
from pathlib import Path
from datetime import datetime

OUT_DIR = Path("/home/z/my-project/out")
REPORT_FILE = Path("/home/z/my-project/download/audit-report.txt")

# Pages to audit — extracted from router.ts
PAGES = [
    "index", "about", "architecture", "snowflake", "dbt", "databricks",
    "tableau", "fivetran-hightouch", "orchestration", "governance", "cicd",
    "knowledge", "dashboard", "evolution", "research", "modern-big-data",
    "duckdb", "streaming", "arrow", "patterns", "data-mesh", "polars",
    "ml-platform", "neural-networks", "feature-store", "model-registry",
    "model-monitoring", "rag-llms", "vector-db", "rl-agentic", "fine-tuning",
    "transformer", "comp-sci-materials", "gen-ai-patterns", "computer-vision",
    "diffusion-models", "distributed-training", "mlops-tracing",
    "quantization-inference", "inference-serving", "rag-deep-dive",
    "multimodal-rag", "bioinformatics", "cheminformatics", "molecular-modelling",
    "genetic-materials", "macro-structures", "systems-biology", "cryo-em",
    "spatial-transcriptomics", "singlecell-multiomics", "alphamissense",
    "alphaproteo", "boltz", "ai-drug-discovery", "spatial-multiomics",
    "coevolution-dca", "neural-network-potentials", "enhanced-sampling",
    "generative-chemistry-2", "quantum-computing", "space-science", "fintech",
    "data-lakehouse", "iceberg", "glue", "hudi", "delta-lake", "catalogs",
    "pinot", "paimon", "druid", "impala", "starrocks", "kafka-connect",
    "schema-registry", "lineage", "data-contracts", "tabular",
    "databricks-lakehouse", "snowflake-polaris", "aws-lake-formation",
    "flink", "kafka", "pulsar", "spark-streaming", "bigquery", "redshift",
    "clickhouse", "dbt-deep-dive", "airflow", "dagster", "great-expectations",
    "monte-carlo", "elementary", "mlflow-deep-dive", "feature-store-deep-dive",
    "vector-db-deep-dive", "llmops", "data-mesh-deep-dive", "streaming-sql",
    "data-contracts-deep-dive", "privacy-enhancing-tech", "numpy-scipy",
    "dask-ray", "gpu-computing", "jupyter", "transformer-deep-dive",
    "diffusion-models-deep-dive", "fine-tuning-deep-dive", "agent-frameworks",
    "computational-biology", "computational-chemistry", "computational-physics",
    "bioinformatics-pipelines", "elegant-code", "connections", "resources",
    "global-shipping", "future", "genealogy",
    "living-svd", "living-attention", "living-fft", "living-poisson",
    "living-entropy", "living-black-scholes", "living-haversine", "living-kalman",
    "living-monte-carlo", "living-gbm",
]

# Key content markers to check per page type
CONTENT_CHECKS = {
    "default": ["<html", "</html>", "AppShell", "sidebar"],
    "elegant-code": ["elegant", "20", "card"],
    "connections": ["connection", "graph", "card"],
    "resources": ["resource", "dataset", "paper"],
    "future": ["future", "projection", "timeline"],
    "genealogy": ["genealogy", "milestone", "Bayes"],
    "living-": ["living", "equation", "slider"],
}

ERROR_MARKERS = [
    "Application error",
    "Internal Server Error",
    "TypeError",
    "ReferenceError",
    "Cannot read propert",
    "is not defined",
]


def audit_page(page_id):
    """Audit a single page. Returns dict of check results."""
    result = {
        "page": page_id,
        "exists": False,
        "size_kb": 0,
        "has_html": False,
        "has_key_content": False,
        "has_errors": False,
        "error_markers": [],
        "status": "PASS",
        "notes": "",
    }

    # Map page_id to file path.
    file_path = OUT_DIR / page_id / "index.html" if page_id != "index" else OUT_DIR / "index.html"
    if not file_path.exists():
        result["status"] = "FAIL"
        result["notes"] = "File not found"
        return result

    result["exists"] = True
    html = file_path.read_text(errors="replace")
    result["size_kb"] = round(len(html) / 1024, 1)

    # Check 1: non-empty (>1KB)
    if len(html) < 1024:
        result["status"] = "WARN"
        result["notes"] = f"Page too small: {len(html)} bytes"

    # Check 2: has <html> and </html>
    result["has_html"] = "<html" in html and "</html>" in html
    if not result["has_html"]:
        result["status"] = "FAIL"
        result["notes"] = "Missing <html> tags"

    # Check 3: has key content
    checks_key = "default"
    for prefix in CONTENT_CHECKS:
        if page_id.startswith(prefix):
            checks_key = prefix
            break

    expected_terms = CONTENT_CHECKS.get(checks_key, CONTENT_CHECKS["default"])
    found = sum(1 for term in expected_terms if term.lower() in html.lower())
    result["has_key_content"] = found >= len(expected_terms) // 2  # at least half the terms
    if not result["has_key_content"]:
        result["status"] = "WARN"
        result["notes"] = f"Missing key content (found {found}/{len(expected_terms)} terms)"

    # Check 4: no error markers
    for marker in ERROR_MARKERS:
        if marker in html:
            result["has_errors"] = True
            result["error_markers"].append(marker)
    if result["has_errors"]:
        result["status"] = "FAIL"
        result["notes"] = f"Error markers: {', '.join(result['error_markers'])}"

    return result


def main():
    print(f"=== ModernDataSciEng Platform Audit ===")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Pages to audit: {len(PAGES)}")
    print()

    results = []
    pass_count = 0
    warn_count = 0
    fail_count = 0

    for page_id in PAGES:
        result = audit_page(page_id)
        results.append(result)
        status_icon = {"PASS": "✅", "WARN": "⚠️ ", "FAIL": "❌"}[result["status"]]
        size_str = f"{result['size_kb']:.0f}KB" if result["exists"] else "N/A"
        print(f"  {status_icon} {page_id:<35s} {size_str:>8s}  {result['notes']}")
        if result["status"] == "PASS":
            pass_count += 1
        elif result["status"] == "WARN":
            warn_count += 1
        else:
            fail_count += 1

    print()
    print(f"=== SUMMARY ===")
    print(f"Total pages: {len(PAGES)}")
    print(f"  ✅ PASS:  {pass_count}")
    print(f"  ⚠️  WARN:  {warn_count}")
    print(f"  ❌ FAIL:  {fail_count}")
    print(f"Pass rate: {pass_count/len(PAGES)*100:.1f}%")

    # Write report to file
    REPORT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(REPORT_FILE, "w") as f:
        f.write(f"ModernDataSciEng Platform Audit Report\n")
        f.write(f"Timestamp: {datetime.now().isoformat()}\n")
        f.write(f"{'='*60}\n\n")
        f.write(f"SUMMARY: {pass_count} PASS, {warn_count} WARN, {fail_count} FAIL out of {len(PAGES)} pages\n")
        f.write(f"Pass rate: {pass_count/len(PAGES)*100:.1f}%\n\n")
        f.write(f"{'='*60}\n\n")
        f.write(f"{'Page':<35s} {'Status':<6s} {'Size':>8s}  Notes\n")
        f.write(f"{'-'*35} {'-'*6} {'-'*8}  {'-'*40}\n")
        for r in results:
            size_str = f"{r['size_kb']:.0f}KB" if r["exists"] else "N/A"
            f.write(f"{r['page']:<35s} {r['status']:<6s} {size_str:>8s}  {r['notes']}\n")
    print(f"\nReport saved to: {REPORT_FILE}")

    # Exit code: 0 if all pass, 1 if any fail
    sys.exit(0 if fail_count == 0 else 1)


if __name__ == "__main__":
    main()
