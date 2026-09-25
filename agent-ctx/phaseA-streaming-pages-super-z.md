# Agent Work Record: phaseA-streaming-pages

**Task ID:** phaseA-streaming-pages
**Agent:** Super Z (main)
**Date:** 2024-09-26
**Working directory:** `/home/z/appdatasci2/`
**Status:** ✅ Complete

## Task

Build 4 Phase A streaming pages (`flink.tsx`, `kafka.tsx`, `pulsar.tsx`, `spark-streaming.tsx`) in `src/app/_pages/` + `src/app/_components/_dataset_examples9.tsx` with 6 scientific dataset examples (2 life sciences + 2 sensors + 1 physics + 1 math) × 5 languages (Scala/Rust/Go/Elixir/Zig). Each page mirrors the `/iceberg.tsx` reference implementation exactly. Shows how real-time streaming enables the Bronze→Silver→Gold medallion for science.

## Reference documents read

1. `/home/z/appdatasci2/worklog.md` — confirmed Phase 1-4 + scientific-lakehouse-examples + Phase A route stub registration all complete (latest: 2d31573)
2. `/home/z/appdatasci2/src/app/_pages/iceberg.tsx` (983 lines) — REFERENCE IMPLEMENTATION
3. `/home/z/appdatasci2/src/app/_components/dataset-cards.tsx` — `DatasetExample` interface (id, step, title, subtitle, accent, icon, badge, brief, stats, codeTabs, runnablePython, insight, tools)
4. `/home/z/appdatasci2/src/app/_components/_dataset_examples8.tsx` (1,565 lines) — scientific dataset examples reference (6 examples × 5 langs pattern + Pyodide simulation using only math/random/collections)
5. `/home/z/appdatasci2/agent-ctx/phase4-pages-super-z.md` — previous agent's notes on ${var} escaping
6. `/home/z/appdatasci2/agent-ctx/phase3-pages-super-z.md` — previous agent's notes on JSX text rewording for unescaped </>
7. `/home/z/appdatasci2/src/app/_lib/router.ts` — confirmed `flink`, `kafka`, `pulsar`, `spark-streaming` PageIds registered (lines 92-95)
8. `/home/z/appdatasci2/src/app/{flink,kafka,pulsar,spark-streaming}/page.tsx` — confirmed route stubs existed (commit 2d31573)

## Files created

| File | Lines | Purpose |
|------|-------|---------|
| `src/app/_components/_dataset_examples9.tsx` | 2,003 | 6 scientific streaming examples (FLINK_SCIENCE_EXAMPLES=2, KAFKA_SCIENCE_EXAMPLES=2, PULSAR_SCIENCE_EXAMPLES=1, SPARK_STREAMING_SCIENCE_EXAMPLES=1) × 5 languages = 30 code examples + 6 Pyodide simulations |
| `src/app/_pages/flink.tsx` | 907 | Apache Flink page — true streaming, watermarks, state backends, exactly-once 2PC, CEP |
| `src/app/_pages/kafka.tsx` | 887 | Apache Kafka page — partitions, consumer groups, transactions, KRaft, 7T msgs/day LinkedIn |
| `src/app/_pages/pulsar.tsx` | 943 | Apache Pulsar page — segmented storage, geo-replication, functions, Yahoo origin |
| `src/app/_pages/spark-streaming.tsx` | 999 | Spark Structured Streaming page — micro-batch vs continuous, watermarks, stateful ops |
| **Total** | **5,739** | 5 new files |

## Files unchanged (already existed from commit 2d31573)

- `src/app/flink/page.tsx` — route stub imports `FlinkPage` from `../_pages/flink`
- `src/app/kafka/page.tsx` — route stub imports `KafkaPage` from `../_pages/kafka`
- `src/app/pulsar/page.tsx` — route stub imports `PulsarPage` from `../_pages/pulsar`
- `src/app/spark-streaming/page.tsx` — route stub imports `SparkStreamingPage` from `../_pages/spark-streaming`

## Page structure (all 4 pages — exactly mirrors /iceberg.tsx)

1. **PageHeader** with eyebrow + title + description + right-side Badges
2. **4 KpiCards** (grid 2×4) — origin, scale, components/tooling count, adoptions
3. **Interactive SVG architecture diagram** (motion.g hover nodes, edges with arrow markers)
4. **5 CodeBlocks** with language-specific highlighting (SQL, Python, Scala, YAML, bash, Java)
5. **PyodideRunner** with synthetic-data simulation (only `math`, `random`, `collections`, `hashlib`)
6. **Comparison table** (4-way: Flink vs Spark Streaming vs Kafka Streams vs Kafka)
7. **Why-evolved section** — 4 shortfalls of prior approaches
8. **Unique features 2×2 grid** — 4 differentiators
9. **DatasetCards** — 1-2 examples × 5 langs (Scala/Rust/Go/Elixir/Zig) with lazy popups
10. **Computational tooling** — ecosystem overview (2 sub-lists per page)
11. **Research + production case studies** — 7 paragraphs of papers + production deployments
12. **Deeper-thought insight** — 5 paragraphs of unifying views
13. **RelatedTopics + cross-links** — 8 related + 5 inline links

## Page specifics

### Flink page (907 lines)
- Architecture diagram: 8 nodes (Client + JobManager + TaskManager + Source + Operators + Sink + State Backend RocksDB + Checkpoint Coordinator)
- 5 code blocks: Watermark SQL (event-time + windowed aggregation), State backends (HashMap vs RocksDB), Exactly-once (2PC on checkpoint, Kafka offsets in Flink state, Iceberg 2PC sink), CEP Scala (Pattern API for fraud detection), Dataset API Scala (ProcessFunction + keyBy + timeWindow + side output)
- Pyodide demo: Flink pipeline simulation — 5,000 sensor events with out-of-order arrival, watermark tracker with 5s tolerance, stateful per-sensor rolling mean (HashMap state backend), tumbling window aggregation, late event detection, 2PC checkpoint commit to Iceberg Bronze sink, state TTL expiry stats
- Comparison: Flink vs Spark Streaming vs Kafka Streams (11 aspects — true streaming, latency, state backends, EOS, watermarks, CEP, stateful ops, deployment, best fit, adoption)
- 4 unique features: True streaming (sub-ms latency), Native CEP library, Pluggable state backends (HashMap + RocksDB), Two-phase commit on checkpoint
- 2 scientific examples: Real-time genomics variant calling (10k vars/sec from Illumina NovaSeq → Flink CDC → Bronze Iceberg) + LHC trigger pipeline (40MHz collisions → Flink CEP → Bronze)

### Kafka page (887 lines)
- Architecture diagram: 7 nodes (Producer keyed + Broker KRaft quorum + Topic 24 partitions + Partition ordered log + ISR In-Sync Replicas + Consumer Group 24 members + Consumer→Bronze Iceberg)
- 5 code blocks: Python producer (idempotent + transactional + zstd compression + acks=all), Scala consumer (exactly-once via transactions + read_committed isolation + read-process-write pattern), KRaft server.properties YAML (broker+controller combined mode + 2M+ partitions), Partitions SQL (Murmur2 hash key partitioning + 24 partitions for chromosomes + consumer group parallelism + rebalance strategies), Transactions Python (begin/commit/abort + sendOffsetsToTransaction for atomic offset commit)
- Pyodide demo: Kafka partition simulation — 50,000 variant events keyed by chromosome, Murmur2 hash → 24 partitions, 24 parallel consumers writing to Bronze Iceberg, partition imbalance check, checkpoint commit
- Comparison: Kafka vs Pulsar vs Kinesis (11 aspects — architecture, storage, partitions/shards, consumer groups, EOS, geo-replication, functions, throughput 7T LinkedIn scale, latency, best fit)
- 4 unique features: 7T msgs/day production scale, Idempotent producer + transactions (true EOS), KRaft metadata quorum (2M+ partitions), Largest ecosystem (100+ integrations)
- 2 scientific examples: Environmental sensor network (50k EPA AirNow sensors → Kafka partitioned by sensor_id → Bronze) + Genomics event streaming (GATK VCF records → Kafka partitioned by chromosome → Bronze)

### Pulsar page (943 lines)
- Architecture diagram: 7 nodes (Producer regional + Broker stateless + Bookie BookKeeper storage + Topic segmented + Geo-replication native + Consumer regional + Pulsar Function in-broker)
- 5 code blocks: Python producer (batching + zstd compression + mTLS auth + geo-replication config), Scala Pulsar Functions (stateful BookKeeper-backed state + windowed processing), Geo-replication admin CLI (clusters create + namespaces set-replication-coverage + topic stats), Segmented storage config (compute-storage split + tiered storage S3 + BookKeeper bookie config), Scala consumer (4 subscription modes: Exclusive/Shared/Failover/Key_Shared)
- Pyodide demo: Pulsar geo-replication simulation — EU producer → 3 Pulsar clusters (EU/US/Asia), BookKeeper ledger + replicated_to tracking, 3 Bronze Iceberg sinks (one per region), per-region latency stats (5ms local + 80ms US replica + 180ms Asia replica), replication counts, disaster recovery semantics
- Comparison: Pulsar vs Kafka vs Kinesis (11 aspects — architecture segmented vs commit-log, broker state stateless vs stateful, tiered storage native vs KIP-405 GA 2024, geo-replication native vs MirrorMaker 2.0, functions in-broker vs external KSQL, multi-tenancy native vs topic-level)
- 4 unique features: Native geo-replication, Compute-storage split (stateless brokers), In-broker Pulsar Functions, Native multi-tenancy (tenant/namespace/topic)
- 1 scientific example: Multi-region sensor network (150k sensors across EU+US+Asia → Pulsar geo-replication → Bronze per region)

### Spark Streaming page (999 lines)
- Architecture diagram: 8 nodes (Driver query orchestrator + Executor workers + Source Kafka/file/rate + Micro-batch 1-N sec + Stateful operator RocksDB + Watermark event-time + Sink Iceberg/Kafka + Checkpoint S3/HDFS)
- 5 code blocks: PySpark pipeline (Kafka → JSON parsing → watermark + stateful enrichment UDF → Iceberg Bronze Append mode 5-min trigger), Continuous mode SQL (experimental sub-1ms latency, Kafka source rate-limited), Stateful Scala (mapGroupsWithState + RocksDB + per-sensor anomaly detection + 3 sigma), Output modes SQL (Append/Update/Complete + sink compatibility matrix), Watermarks SQL (tumbling/sliding/session windows Spark 3.4+)
- Pyodide demo: Spark micro-batch simulation — 5,000 sensor events spread across 5 minutes, 5 1-minute micro-batches, watermark 5s tolerance, Append mode commits closed windows to Bronze, micro-batch vs continuous mode comparison table, 3 output modes comparison
- Comparison: Spark Streaming vs Flink vs Kafka Streams (11 aspects — processing model micro-batch vs true streaming, latency, continuous mode experimental vs native, state backends RocksDB-only vs HashMap+RocksDB, EOS via WALs vs 2PC, watermarks, stateful ops, output modes 3 vs 2 vs 1, window types, best fit unified batch+streaming vs low-latency+CEP vs microservices)
- 4 unique features: Unified batch + streaming (same DataFrame API), Continuous mode (low-latency ~1ms), Session windows (Spark 3.4+), 3 output modes (Append/Update/Complete)
- 1 scientific example: OEIS sequence property computation (370k+ sequences, 5-20 new submissions/day → Spark micro-batch growth-rate computation → Bronze)

## Issues encountered + fixes

1. **Unescaped `${var}` in Scala s-strings inside JS template literals**: Used `\\${var}` (double backslash + dollar + brace) instead of `\${var}` (single backslash + dollar + brace) in 6 places:
   - 4 in `_dataset_examples9.tsx` (lines 682, 698, 1014, 1327) — Scala s-string interpolations in sensor producer + genomics producer code samples
   - 2 in `pulsar.tsx` (lines 117, 152) — Scala s-string interpolations in Pulsar Functions (per-key state)
   
   `\\${var}` in JS template literal parses as: `\\` → one backslash output + `${var}` → JS INTERPOLATION (because `${` is unescaped). This threw `ReferenceError: region is not defined` at module evaluation during static export prerender of `/pulsar` (because `region` is a Scala variable, not a JS variable).
   
   **Fix**: Python script to walk each file and replace `\\\\\${` (regex for 2 backslashes + dollar + brace) with `\\\${` (1 backslash + dollar + brace). All 6 instances now properly escaped as `\${...}` which produces literal `${...}` in the output string (the backslash escapes the dollar sign in JS template literals).
   
   Note: existing files `ml-platform.tsx` and `neural-networks.tsx` have `\\\${...}` (3 backslashes + dollar + brace) which produces `\${...}` (with literal backslash) in the output — technically incorrect (extra backslash shown to user) but doesn't crash because `\$` properly escapes the dollar sign preventing JS interpolation. Left these alone since they're pre-existing and don't break the build.

## Lint + build verification

- ESLint: `bunx eslint src/app/_pages/{flink,kafka,pulsar,spark-streaming}.tsx src/app/_components/_dataset_examples9.tsx --max-warnings=0` → all pass (0 errors, 0 warnings).
- Build: `GITHUB_PAGES=true bun run build:static` → succeeded after fix. 88/88 pages prerendered (Turbopack, 28.7s compile).
- Output: `out/flink/index.html` ✅, `out/kafka/index.html` ✅, `out/pulsar/index.html` ✅, `out/spark-streaming/index.html` ✅.
- `.nojekyll` touched in `out/`.
- API routes restored: `src/app/api/agent-triage/route.ts` present post-build.

## Commit + push

- SHA: ad09239 on private/main (AppDataSciEng2-Advance)
- Previous: 2d31573 (Phase A route stub registration)
- Push: `git push private main` → 2d31573..ad09239. Pre-push guardrail checks passed.
- Sync workflow will mirror to public/main (Demo2DataSciEng); deploy workflow will build + publish to GitHub Pages.

## Worklog appended

- Appended Task ID `phaseA-streaming-pages` section to `/home/z/appdatasci2/worklog.md`.

## Stage Summary — Phase A complete

- 4 new Phase A streaming pages + 1 new dataset examples file: 5,739 lines of TypeScript/TSX added across 5 files.
- 6 dataset examples × 5 languages (Scala/Rust/Go/Elixir/Zig) = 30 code examples in `_dataset_examples9.tsx` + 6 Pyodide simulations.
- Each of the 4 Phase A pages follows the `/iceberg.tsx` pattern exactly: PageHeader → 4 KPIs → architecture diagram → 5 code blocks → Pyodide demo → comparison table → Why-evolved → Unique-features (2×2) → DatasetCards → Computational tooling → Research → Deeper-thought insight → RelatedTopics + cross-links.
- All 4 pages lint clean + build clean + render live on the dev server.
- Pushed SHA: 2d31573..ad09239 on private/main.
- The 6 scientific examples show how real-time streaming enables the Bronze→Silver→Gold medallion for science:
  - Life sciences: real-time genomics variant calling (Flink CDC, 10k vars/sec), genomics event streaming (Kafka by chromosome, GATK VCF records)
  - Sensors: environmental sensor network (Kafka by sensor_id, 50k EPA AirNow), multi-region sensor network (Pulsar geo-replication, 150k sensors across EU+US+Asia)
  - Physics: LHC trigger pipeline (Flink CEP, 40MHz collisions)
  - Mathematics: OEIS sequence property computation (Spark micro-batch, 370k+ sequences)
