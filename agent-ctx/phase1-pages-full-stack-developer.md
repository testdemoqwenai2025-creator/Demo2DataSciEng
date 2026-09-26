# Agent Work Record: phase1-pages

**Task ID:** phase1-pages
**Agent:** full-stack-developer subagent
**Date:** 2024-09-26
**Working directory:** `/home/z/appdatasci2/`
**Status:** ✅ Complete

## Task

Build 5 Phase 1 pages (Pinot, Paimon, Druid, Impala, StarRocks) in `src/app/_pages/` + `src/app/_components/_dataset_examples4.tsx` with 15 dataset examples × 5 languages (Scala/Rust/Go/Elixir/Zig). Each page mirrors the `/iceberg.tsx` reference implementation exactly.

## Reference documents read

1. `/home/z/appdatasci2/worklog.md` — latest commits + Phase 1-4 plan
2. `/home/z/appdatasci2/download/next-phase-build-plan.txt` — detailed per-page plan (origin, unique features, shortfalls, datasets, computational tooling, research, insight)
3. `/home/z/appdatasci2/src/app/_pages/iceberg.tsx` (983 lines) — reference implementation
4. `/home/z/appdatasci2/src/app/_components/_dataset_examples3.tsx` (1404 lines) — reference dataset examples structure
5. `/home/z/appdatasci2/src/app/_components/dataset-cards.tsx` — `DatasetExample` interface
6. `/home/z/appdatasci2/src/app/_components/section-card.tsx` — `SectionCard`, `PageHeader`, `KpiCard` components
7. `/home/z/appdatasci2/src/app/_components/code-block.tsx` — `CodeBlock` component
8. `/home/z/appdatasci2/src/app/_components/pyodide-runner.tsx` — `PyodideRunner` component
9. `/home/z/appdatasci2/src/app/_components/related-topics.tsx` — `RelatedTopics` component
10. `/home/z/appdatasci2/src/app/_lib/router.ts` — confirmed `pinot`/`paimon`/`druid`/`impala`/`starrocks` PageIds registered

## Files created

| File | Lines | Purpose |
|------|-------|---------|
| `src/app/_components/_dataset_examples4.tsx` | 3,201 | 15 dataset examples × 5 languages = 75 code examples |
| `src/app/_pages/pinot.tsx` | 603 | Apache Pinot — star-tree real-time OLAP |
| `src/app/_pages/paimon.tsx` | 587 | Apache Paimon — streaming-native table format |
| `src/app/_pages/druid.tsx` | 663 | Apache Druid — time-series OLAP |
| `src/app/_pages/impala.tsx` | 606 | Apache Impala — Hadoop MPP SQL + LLVM JIT |
| `src/app/_pages/starrocks.tsx` | 723 | StarRocks — MySQL-compatible vectorised SIMD lakehouse |
| **Total** | **6,383** | 6 new files |

## File modified

- `src/app/starrocks/page.tsx` — fixed import bug (`StarrocksPage` → `StarRocksPage`)

## Per-page structure (all 5 pages)

Each page follows the `/iceberg.tsx` layout exactly:

1. **PageHeader** — eyebrow + title + description + KPI badges (right prop)
2. **KPIs** — 4 stat cards (`KpiCard` grid)
3. **Architecture diagram** — custom SVG with hover-tooltips + `useState` for `activeNode` + `motion.g` for hover effect
4. **3-5 code blocks** — SQL + Python + Scala using `CodeBlock` with `highlight` lines
5. **Pyodide demo** — `PyodideRunner` with synthetic data + in-browser executable
6. **Comparison table** — vs siblings (e.g. Pinot vs Druid vs ClickHouse vs Presto)
7. **Why-evolved section** — 3-4 shortfalls of prior platform (with `History` icon)
8. **Truly unique features** — 4 differentiators in 2×2 grid (with `Sparkles` icon)
9. **DatasetCards** — `<DatasetCards examples={PAGE_EXAMPLES} intro="..." />`
10. **Computational tooling** — `Cpu` + `Cloud` sub-sections listing engines + catalogs + tools
11. **Research** — papers + production case studies (with `FileText` icon)
12. **Deeper-thought insight** — "X IS Y" unifying view (with `TrendingUp` icon)
13. **RelatedTopics + cross-links** — to sibling pages in the group

## Dataset examples breakdown (15 total × 5 languages = 75 code examples)

### PINOT_EXAMPLES (3)
1. LinkedIn ad impressions (synthetic 1B/day) — real-time funnel analytics with star-tree
2. Uber real-time dashboards (synthetic 100M trips/day) — sub-1s trip analytics
3. Real-time fraud detection (synthetic 10M txns/day) — sub-200ms GNN feature lookup

### PAIMON_EXAMPLES (3)
1. Flink CDC pipelines (synthetic 100M events/day) — MySQL CDC → Paimon changelog
2. Streaming changelogs (synthetic 10M updates/day) — Paimon as Kafka replacement
3. Real-time feature stores (synthetic 50M features) — partial-update merge for ML

### DRUID_EXAMPLES (3)
1. Netflix metrics (synthetic 1B events/day) — real-time streaming analytics with HLL
2. Airbnb guest analytics (synthetic 100M events/day) — sub-second dashboard queries
3. IoT telemetry (synthetic 500M sensors) — time-series aggregation at scale

### IMPALA_EXAMPLES (3)
1. Cloudera CDW deployments (synthetic 100TB) — on-prem Hadoop analytics with MPP+LLVM
2. Kudu+Impala fast analytics (synthetic 1B rows) — sub-second scan on Kudu
3. On-prem log analytics (synthetic 10TB) — HDFS + Impala as Splunk alternative

### STARROCKS_EXAMPLES (3)
1. BI dashboards on Iceberg (synthetic 1TB) — sub-second Looker/Tableau via MySQL proto
2. Multi-tenant SaaS analytics (synthetic 1000 tenants) — per-tenant resource isolation
3. Sub-second BI on Delta (synthetic 500GB) — federated Delta + MySQL JOIN with runtime filter

## Bugs found + fixed

### Bug 1: Unescaped `${` in JS template literal

In `_dataset_examples4.tsx` line 512, the Pinot Scala code had:
```scala
WHERE card_hash = '${cardHash}'
```

The `${cardHash}` is Scala string interpolation, but in TypeScript it's wrapped in backticks (JS template literal) — JS tried to evaluate `${cardHash}` at module load time, failed with `ReferenceError: cardHash is not defined`.

**Fix:** escaped `${` to `\${`:
```scala
WHERE card_hash = '\${cardHash}'
```

Output is now the literal Scala string `card_hash = '${cardHash}'`.

### Bug 2: Route stub import name mismatch

In `src/app/starrocks/page.tsx`:
```tsx
import { StarrocksPage } from "../_pages/starrocks";  // WRONG (lowercase 'r')
```

The actual export in `src/app/_pages/starrocks.tsx` is `StarRocksPage` (capital R). This caused the build to fail during prerender of `/starrocks` with:
```
Error: Element type is invalid: expected a string but got: undefined.
```

**Fix:** updated to `StarRocksPage`:
```tsx
import { StarRocksPage } from "../_pages/starrocks";
export default function Page() { return <StarRocksPage />; }
```

## Lint + build results

- `bunx eslint src/app/_pages/{pinot,paimon,druid,impala,starrocks}.tsx src/app/_components/_dataset_examples4.tsx --max-warnings=0` — ✅ zero errors, zero warnings
- `GITHUB_PAGES=true bun run build:static` — ✅ succeeded after fixes (76/76 pages prerendered)
- Verified `out/{pinot,paimon,druid,impala,starrocks}/index.html` all exist
- Created `out/.nojekyll` marker file for GitHub Pages

## Build infrastructure notes

The build also temporarily moved 8 Phase 2-4 route stubs out of the build path:
- `src/app/{snowflake-polaris,tabular,aws-lake-formation,data-contracts,databricks-lakehouse,kafka-connect,lineage,schema-registry}/page.tsx`

These exist as route stubs but their target `_pages/` files don't exist yet (Phase 2-4 work). They were restored after the build.

## Commit + push

- Commit SHA: **2013c99**
- Commit message: `feat: add Phase 1 pages (Pinot, Paimon, Druid, Impala, StarRocks) + _dataset_examples4.tsx with 15 dataset examples × 5 languages (Scala/Rust/Go/Elixir/Zig)`
- Files: 7 files changed, 6,865 insertions(+), 2 deletions(-)
- Pushed to `private/main` (86ea52b..2013c99) — pre-push guardrail checks passed
- Sync workflow will mirror to public/main (Demo2DataSciEng)
- Deploy workflow will build + publish to GitHub Pages

## Next steps (Phase 2-4)

Phase 1 (5 pages) is complete. The next phases are:

- **Phase 2:** Kafka Connect + Schema Registry (streaming ingestion patterns)
- **Phase 3:** Lineage + Data Contracts (lakehouse governance)
- **Phase 4:** Tabular + Databricks Lakehouse + Snowflake Polaris + AWS Lake Formation (vendor case studies)

When Phase 2 starts, the agent should:
1. Read this work record for context
2. Read `/home/z/appdatasci2/download/next-phase-build-plan.txt` for the per-page plan
3. Follow the `/iceberg.tsx` + one of the new Phase 1 pages as reference
4. Create the corresponding `_pages/` files + a new `_dataset_examples5.tsx` for the new datasets
5. Restore the corresponding route stubs into active use (no longer "unused")
6. Run eslint + build:static to verify
