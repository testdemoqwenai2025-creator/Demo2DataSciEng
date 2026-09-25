# Task ID: phaseD-pages

## Agent: Super Z (main)

## Task
Build 3 Phase D pages (dbt-deep-dive, Airflow, Dagster) in `src/app/_pages/` + `src/app/_components/_dataset_examples11.tsx` with 6 scientific dataset examples (2 per page) × 5 languages (Scala/Rust/Go/Elixir/Zig). Each page mirrors the `/iceberg.tsx` reference implementation exactly with all 13 sections.

## Work Log
- Read `/home/z/appdatasci2/worklog.md` — confirmed Phase A + Phase C pages all complete and pushed to private/main (latest: 56a00e1 Phase C, 1717c8d Phase B/C/D route stubs registered).
- Read `/home/z/appdatasci2/src/app/_pages/iceberg.tsx` (983 lines) — REFERENCE IMPLEMENTATION. Followed exact 13-section structure.
- Read `/home/z/appdatasci2/src/app/_components/dataset-cards.tsx` — confirmed DatasetExample interface.
- Read `/home/z/appdatasci2/src/app/_components/_dataset_examples10.tsx` (2,256 lines) — Phase C reference for 6 examples × 5 langs pattern + Pyodide simulation using only math/random/collections.
- Read `/home/z/appdatasci2/agent-ctx/phaseC-pages-super-z.md` + `phaseA-streaming-pages-super-z.md` — previous agents' notes on escaping `${var}` in Scala strings inside JS template literals (use single backslash: `\${var}`).
- Verified route folders `src/app/{airflow,dagster,dbt-deep-dive}/page.tsx` already existed (commit 1717c8d registered stubs importing AirflowPage/DagsterPage/DbtDeepDivePage from `../_pages/<name>`).

## Files built
1. `src/app/_components/_dataset_examples11.tsx` (2,556 lines)
   - DBT_SCIENCE_EXAMPLES (2 examples)
   - AIRFLOW_SCIENCE_EXAMPLES (2 examples)
   - DAGSTER_SCIENCE_EXAMPLES (2 examples)
2. `src/app/_pages/dbt-deep-dive.tsx` (1,134 lines)
3. `src/app/_pages/airflow.tsx` (1,135 lines)
4. `src/app/_pages/dagster.tsx` (1,286 lines)

Total: ~6,111 lines of TypeScript/TSX added across 4 files.

## The 6 scientific examples

### DBT_SCIENCE_EXAMPLES (2 examples)
1. **Genomics Transform Models** (Life Sciences) — 1000 Genomes VCF (85M variants × 2,504 samples) → Bronze→Silver→Gold dbt models → allele frequency by population. 14 models (3 bronze + 6 silver + 5 gold). dbt tests at each layer.
2. **Clinical Trial QA** (Life Sciences) — FDA FAERS adverse event reports (~14M reports × 7 source tables × 200+ columns). 47 dbt tests (schema + business rules + custom singular). Failures routed to Slack + Jira.

### AIRFLOW_SCIENCE_EXAMPLES (2 examples)
1. **Genomics Pipeline DAGs** (Life Sciences) — GATK Best Practices germline variant calling as Airflow DAG (BWA → SortSam → MarkDups → HaplotypeCaller → GenotypeGVCFs). ~10,000 samples × 5 tasks each. KubernetesPodOperator + FileSensor + ExternalTaskSensor.
2. **LHC Analysis Workflows** (Physics) — CERN ATLAS analysis chain as Airflow DAG (trigger → reconstruct → skim → analyze). ~1 PB/sec raw → ~50 PB/year stored. HTCondorOperator + SparkSubmitOperator + HdfsSensor.

### DAGSTER_SCIENCE_EXAMPLES (2 examples)
1. **Genomics Asset Graph** (Life Sciences) — 8 software-defined assets for GATK variant calling pipeline (fastq_reads → aligned_bam → dedup_bam → recalibrated_bam → raw_vcf → filtered_vcf → annotated_vcf → allele_freq_table). IO Manager for BAM/VCF artifact handoff on S3.
2. **Sensor Data Partitions** (Sensors) — Hourly partitions for 50,000 IoT sensors (4.3B events/day) via Dagster partition-aware IO Manager. 24 hourly partitions/day, Hive-style S3 paths, partition-aware lineage queryable.

## Lint + build verification

### Lint
ESLint: `bunx eslint src/app/_pages/{dbt-deep-dive,airflow,dagster}.tsx src/app/_components/_dataset_examples11.tsx --max-warnings=0` → all pass (0 errors, 0 warnings).

Fixed 1 issue during lint:
- Unescaped `>>` in JSX text on dagster.tsx line 1095 — Airflow's `>>` dependency syntax shown in JSX text. Wrapped in `<code>` tag with `&gt;&gt;` HTML entity to fix the JSX parser error.

### Build
`GITHUB_PAGES=true bun run build:static` — succeeded. 94/94 pages prerendered (91 + 3 new). All 3 Phase D pages built:
- `out/dbt-deep-dive/index.html` ✅ (483KB)
- `out/airflow/index.html` ✅ (540KB)
- `out/dagster/index.html` ✅ (589KB)
- 3 stub route folders (elementary, great-expectations, monte-carlo) moved to `.stub-routes-backup/` during build (their _pages files don't exist yet — future Phase B pages). Restored after build.
- `src/app/api` directory moved aside to `.api-routes-backup/` during build (z-ai-web-dev-sdk doesn't work in static export), restored after build. `src/app/api/agent-triage/route.ts` present post-build.
- `.nojekyll` touched in `out/`.
- Content verified in built HTML:
  - `dbt-deep-dive`: dbt model SQL, schema.yml tests, Jinja macros, Semantic Layer YAML, dbt Cloud + incremental + snapshots, FAERS — all present
  - `airflow`: Apache Airflow DAG Python, Operators, Sensors, XCom, TaskFlow API, GATK Best Practices, CERN LHC ATLAS — all present
  - `dagster`: Software-Defined Assets, IO Manager, Partitions, Resources, asset vs DAG comparison — all present

## Page specifics

### dbt-deep-dive.tsx (1,134 lines)
- Architecture diagram: 8 nodes (Sources → stg_ → int_ → fct_/dim_ + Snapshots + Tests + manifest.json + Semantic Layer)
- 5 code blocks: dbt models SQL (Bronze stg_ + Silver int_ + Gold fct_/dim_), dbt tests YAML (schema.yml + singular + custom generic macros), dbt macros Jinja (generate_surrogate_key + pivot + assert_freshness), Semantic Layer YAML (semantic_models + metrics), dbt Cloud + incremental + snapshots (SCD2)
- Pyodide demo: Bronze→Silver→Gold simulation — 200 orders with 1% data quality issues (nulls, out-of-range, lowercase country codes); per-layer test execution (12 tests across Bronze + Silver + Gold); materialisation summary; Semantic Layer query demo
- Comparison: dbt vs Airflow vs Dagster vs hand-rolled SQL (11 aspects)
- 4 unique features: SQL-as-code (Jinja + ref()), First-class tests + docs, Semantic Layer (MetricFlow), Cross-warehouse portability
- 2 scientific examples: Genomics Transform Models (1000 Genomes VCF → AF) + Clinical Trial QA (FDA FAERS dbt tests)

### airflow.tsx (1,135 lines)
- Architecture diagram: 8 nodes (Webserver + Scheduler + Executor + Workers + Metadata DB + XCom Backend + DAG Bag + Celery Queue)
- 5 code blocks: DAG Python (TaskFlow @dag + @task + FileSensor + ExternalTaskSensor + KubernetesPodOperator + BashOperator), Operators (BashOperator + PythonOperator + KubernetesPodOperator + SparkSubmitOperator + DatabricksSubmitRunOperator + ECSOperator), Sensors (FileSensor + PythonSensor + S3KeySensor + ExternalTaskSensor + SqlSensor + smart sensor daemon), XCom (small data only + custom S3XComBackend + auto-threaded by TaskFlow), TaskFlow API (@task + @task_group + .expand() dynamic task mapping)
- Pyodide demo: DAG execution simulation — 6-task DAG with topological scheduling (Kahn's algorithm), retries with backoff, XCom handoff between tasks, sensor poke intervals, pool concurrency, smart sensor mode analysis
- Comparison: Airflow vs Dagster vs dbt vs Prefect (11 aspects)
- 4 unique features: 3,000+ DAG scale (Airbnb proven), Smart sensors (90% pool pressure reduction), KubernetesExecutor (per-task pod), 100+ provider packages
- 2 scientific examples: GATK Best Practices DAG + CERN LHC ATLAS analysis chain DAG

### dagster.tsx (1,286 lines)
- Architecture diagram: 8 nodes (Dagit UI + Dagster Daemon + Code Locations + Asset Graph + IO Managers + Resources + Runs DB + Executor)
- 5 code blocks: Software-Defined Assets (@asset + deps parameter + AssetIn), IO Manager (S3ParquetIOManager + partition-aware subclass), Partitions (HourlyPartitionsDefinition + DailyPartitionsDefinition + MultiPartitionsDefinition + DynamicPartitionsDefinition + backfill), Resources (ConfigurableResource + pydantic + DI + testing), asset vs DAG comparison (same pipeline in Airflow + Dagster side-by-side)
- Pyodide demo: asset graph materialisation simulation — 5-asset graph (raw_orders → clean_orders → fct_orders + dim_customer → daily_summary) with topological order, IO Manager S3 Parquet writes, stale-asset re-materialisation logic, partition-aware sensor_readings simulation (24 hourly partitions, 5% missing), backfill missing partitions, asset lineage query
- Comparison: Dagster vs Airflow vs dbt vs Prefect (11 aspects — asset vs DAG axis)
- 4 unique features: Software-Defined Assets (SDA), Partition-aware backfills, IO Manager (typed storage), ConfigurableResource (pydantic DI)
- 2 scientific examples: Genomics asset graph (8 SDA for GATK) + Sensor data partitions (hourly partitions for 50k IoT sensors)

## Issues encountered + fixes

1 issue during lint:
- Unescaped `>>` in JSX text on dagster.tsx line 1095 — the text `Airflow's task dependencies were explicit (>>),` had `>>` which the JSX parser interpreted as the closing `>` of a tag, followed by `>` text. Fixed by wrapping `>>` in `<code className="font-mono">&gt;&gt;</code>` — the `&gt;` HTML entity escapes the `>` character within JSX text.

No issues during build.

## Commit + push

- SHA: pending commit on private/main (AppDataSciEng2-Advance)
- Previous: 56a00e1 (Phase C pages)
- Push: `git push private main` → expected to succeed (lint + build verified clean).
- Sync workflow will mirror to public/main (Demo2DataSciEng); deploy workflow will build + publish to GitHub Pages.

## Stage Summary — Phase D complete

- 3 new Phase D pages + 1 new dataset examples file: ~6,111 lines of TypeScript/TSX added across 4 files.
- 6 dataset examples × 5 languages (Scala/Rust/Go/Elixir/Zig) = 30 code examples in `_dataset_examples11.tsx` + 6 Pyodide simulations.
- Each of the 3 Phase D pages follows the `/iceberg.tsx` pattern exactly: PageHeader → 4 KPIs → architecture diagram → 5 code blocks → Pyodide demo → comparison table → Why-evolved → Unique-features (2×2) → DatasetCards → Computational tooling → Research → Deeper-thought insight → RelatedTopics + cross-links.
- All 3 pages lint clean + build clean + render live on the dev server.
- The 6 scientific examples show how dbt (transform), Airflow (orchestrate), and Dagster (asset-oriented) power science workloads:
  * Life sciences: genomics Bronze→Silver→Gold via dbt models (1000 Genomes), GATK Best Practices DAG (10k samples), genomics asset graph (8 SDA for variant calling).
  * Physics: CERN LHC ATLAS analysis chain DAG (trigger → reconstruct → skim → analyze).
  * Sensors: hourly partitions for 50k IoT sensors via Dagster IO Manager (4.3B events/day).
  * Pharmacovigilance: FDA FAERS clinical trial QA via dbt tests (14M adverse event reports × 47 tests).
- ModernDataSciEng Platform v2 now has 94 pages total (91 + 3 new Phase D pages).
