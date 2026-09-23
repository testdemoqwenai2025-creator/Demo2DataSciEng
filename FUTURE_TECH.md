# ModernDataSciEng Platform — Future Technology Watch

My thoughts on ever-evolving technologies, computational tools, data repositories and libraries that should be considered for the next 24-36 months of this platform's evolution. This is opinionated, dated, and deliberately provocative — it's a watch list, not a commitment list.

> Last updated: FY26-Q3. Refresh quarterly. All assessments are speculative; the future is unevenly distributed.

---

## Storage & formats

### Open table formats: Delta vs Iceberg vs Hudi

The era of "one format wins" is ending. Delta is dominant in our stack today, but Iceberg has strong momentum outside Databricks. **Delta UniForm** (Iceberg interop) lets you serve both ecosystems from one source of truth — we're assessing it for v2.5.

- **Delta Lake**: ACID on cloud object stores, mature, best on Databricks.
- **Apache Iceberg**: Vendor-neutral, growing fast, strong schema evolution. BigQuery, Snowflake, Athena, Trino all support it natively now.
- **Apache Hudi**: Strong on upserts + streaming; less common in BI use cases.
- **Delta UniForm**: write Delta, read as Iceberg. Best of both worlds if it matures.

**Bet**: Delta UniForm will be table stakes by FY27. Plan for it now.

### Apache Arrow / Parquet everywhere

Arrow Flight as a wire protocol between compute engines could replace JDBC/ODBC for high-throughput analytics. The Arrow-native query engines (DataFusion, Polars, DuckDB) are getting fast enough to handle ad-hoc workloads that previously needed Snowflake.

- **DuckDB**: 10× faster than Postgres for analytics on small-to-medium data (< 1TB). Use it in CI to validate dbt models against sample data without provisioning a warehouse.
- **Polars**: 10-30× faster than Pandas on a single node. Replace ad-hoc Pandas pipelines in notebooks.
- **DataFusion (Rust)**: Arrow-native query engine. Could replace Trino for some internal-warehouse use cases.

**Bet**: DuckDB-in-CI is a Q2 priority. Polars replaces Pandas in our PySpark ad-hoc notebooks by FY26 H2.

### Confidential compute on object stores

Confidential computing (SGX, SEV-SNP, TDX) lets you process data without decrypting it in compute memory. For PII-heavy workloads (healthcare, finance), this could become a compliance requirement rather than a nice-to-have.

- **Confidential Databricks**: GA on AWS Nitro Enclaves.
- **Confidential Snowflake**: not yet GA.
- **Confidential Delta Lake**: not directly supported yet, but the building blocks (encrypted Parquet + confidential compute) exist.

**Bet**: niche today, mainstream by FY28. Build the platform so confidential compute can be enabled per-table when needed.

---

## Compute

### Wasm as a portable compute target

WebAssembly (Wasm) is emerging as a portable compute target beyond the browser. **wasmtime + wasm-micro-runtime** let you run compiled Wasm in any environment. PySpark could eventually compile to Wasm for ad-hoc notebook workloads.

- **Extism**: plugin system based on Wasm; could replace Python UDFs in Snowflake.
- **wasmtime**: Rust runtime; could replace JVM UDFs in Databricks.

**Bet**: 2-3 years out, but worth a spike in FY27 to see if UDFs can move to Wasm for portability.

### GPU + LLMs inside the data warehouse

Snowflake Cortex, Databricks AI Functions, BigQuery ML — all are putting LLM inference inside the warehouse. This eliminates the ETL-into-ML-system pattern for many use cases.

- **Snowflake Cortex**: LLM-as-SQL-functions. Currently limited models, but the integration story is clean.
- **Databricks AI Functions + Foundation Models**: native LLM access in SQL + PySpark.
- **BigQuery ML**: ML model training and serving inside BigQuery.

**Bet**: by FY27, most "NLP on customer feedback" or "PII detection on free-text" workloads will run inside the warehouse without a separate ML pipeline.

### Quantum-safe encryption

Q-Day (the day a quantum computer can break RSA) is contested but plausible within 10-15 years. Encrypted data stored today could be decrypted later. **Post-quantum cryptography** (PQC) standards are now NIST-finalised.

- **CRYSTALS-Kyber** (KEM), **CRYSTALS-Dilithium** (signatures): NIST PQC standards.
- Snowflake / Databricks / S3 don't yet offer PQC; S3 server-side encryption still uses AES-256 (sufficient for now).

**Bet**: low priority for FY26. Watch vendor PQC roadmaps; plan for migration window starting FY28.

---

## Modelling & transformation

### Polyseme / metric layers beyond dbt

dbt MetricFlow is the leader, but **Cube.js** and **Looker semantic model** are alternatives. A federated semantic layer (one definition, multiple consumers — BI, ML, reverse-ETL, agentic SQL) is the next step.

- **Cube.js**: open source, REST/GraphQL API, agnostic to warehouse.
- **LookML**: legacy but mature; still a strong choice if Looker is your BI tool.
- **dbt MetricFlow**: tightest integration with dbt project; emerging standard.

**Bet**: stay on MetricFlow through FY26; evaluate Cube.js as a federation layer in FY27 if multi-tool metric drift becomes a problem.

### Streaming-native transformations

Batch + micro-batch is giving way to **streaming-native transformations** with `spark.readStream` + Delta CDF + Kafka. The line between batch and streaming blurs.

- **Delta CDF (Change Data Feed)**: read row-level changes as a stream — no more CDC connectors.
- **Kafka + Flink SQL**: streaming SQL with sub-second latency.
- **Materialize / RisingWave**: streaming SQL databases (mostly-OLTP workloads).

**Bet**: streaming-first Bronze moves from "trial" to "adopt" in FY26 Q2.

### Async Python in dbt + Airflow

**Apache Airflow 3.0** is moving to async + assets-first. **dbt Python models** (PySpark / Pandas / Polars inside dbt) bridge the SQL/Python divide.

- **Airflow 3.0**: native asset graph, async operators, scheduler improvements.
- **dbt Python models**: write PySpark as a dbt model — same lineage, tests, docs.

**Bet**: Airflow 3.0 upgrade in FY26 H2. dbt Python models trial in FY26 Q3.

---

## Orchestration & DevOps

### Asset-based orchestration

Dagster's asset-graph model is becoming the de-facto mental model. Airflow 3.0 is adopting it. The future is: declare the asset (table, model, dashboard), declare its dependencies, let the orchestrator figure out the rest.

- **Dagster**: native asset graph, partitions, software-defined assets.
- **Airflow 3.0**: asset-first + traditional DAGs (hybrid).
- **Prefect 3.0**: dynamic DAGs, async, Pythonic.

**Bet**: 50% of DAGs migrate to Dagster assets by FY26 H2; 100% by FY27.

### IaC evolution: Pulumi / Crossplane / Terraform

Terraform remains dominant but Pulumi (real programming languages) and Crossplane (Kubernetes-native) are gaining.

- **Terraform**: HCL, mature, dominant for cloud.
- **Pulumi**: TypeScript/Python/Go — better abstractions, less DSL pain.
- **Crossplane**: Kubernetes-native control plane; one manifest for everything.

**Bet**: stay on Terraform through FY26; spike Pulumi in FY27 for complex Snowflake module logic.

### Observability as code (OpenTelemetry everywhere)

OpenTelemetry (OTel) is unifying metrics, logs, traces. Data pipelines should emit OTel signals so observability is vendor-neutral.

- **OpenLineage**: lineage-specific OTel.
- **OpenTelemetry**: generic observability.
- **Backstage / Spans**: trace a SQL query from BI → dbt → Snowflake.

**Bet**: by FY27, all platform components emit OTel signals; Datadog becomes one of many consumers (not the only one).

---

## Governance & security

### Open Policy Agent (OPA) for governance-as-code

Policy-as-code is moving from Terraform-style manifests to OPA + Rego. Unity Catalogue has internal policy DSLs; OPA gives cross-system policy portability.

- **OPA + Rego**: declarative policy language.
- **Styra (commercial OPA)**: enterprise governance.
- ** Cedar (AWS)**: alternative policy language.

**Bet**: trial OPA for cross-platform policy enforcement (Snowflake + Databricks + dbt) in FY26 Q4.

### Confidential ML + federated learning

For multi-party analytics (e.g. partner analytics where neither party can see the other's raw data), federated learning + confidential compute are emerging.

- **TensorFlow Federated**: model training without centralising data.
- **OpenMined PySyft**: privacy-preserving ML.
- **Confidential computing on Databricks**: GA.

**Bet**: low priority FY26; spike if a partner-analytics use case emerges.

### Verifiable credentials for data subject access

GDPR data-subject access requests (DSARs) could be self-served via **verifiable credentials** — a customer holds a VC proving identity, the platform issues a signed DSAR report without manual verification.

- **W3C Verifiable Credentials**: standard.
- **did:web**: DIDs based on domain ownership.

**Bet**: blue-sky, but worth a research spike in FY27.

---

## Data repositories & catalogues

### Open data catalogues

The market is consolidating around **Unity Catalogue** (Databricks), **Snowflake Horizon**, **Google Data Catalog**, **Apache Atlas** (legacy), **DataHub** (open source), **OpenMetadata** (open source).

- **Unity Catalogue**: Databricks-native, growing ecosystem.
- **Snowflake Horizon**: Snowflake-native, more limited scope.
- **DataHub** / **OpenMetadata**: open source, vendor-neutral, good if you have multiple warehouses.

**Bet**: stay on Unity Catalogue through FY26; evaluate OpenMetadata as a federation layer in FY27 if Snowflake Horizon + Unity diverge.

### Open data lakehouses (vendor-neutral)

MinIO + Trino + Iceberg + Nessie is a viable open-source alternative to Databricks + Delta. Useful for cost arbitrage on cold storage tiers.

- **MinIO**: S3-compatible, self-hosted.
- **Trino**: SQL-on-everything, fast.
- **Nessie**: git-like table versioning.
- **Apache Iceberg**: open table format.

**Bet**: not in active consideration; reserved as a DR / cost-arbitrage option for cold Bronze tiers.

### Public datasets integration

AWS Open Data, Google Public Datasets, Microsoft Open Datasets are increasingly useful as reference data (currencies, weather, demographics, financial calendars).

- **AWS Open Data**: S3-hosted public datasets.
- **Google Public Datasets**: BigQuery-hosted.
- **Microsoft Open Datasets**: Azure-hosted, pre-cleaned.

**Bet**: integrate reference data (FX rates, calendars, ISO country codes) from public datasets in FY26 Q2.

---

## Libraries & languages

### Rust in data engineering

Rust is becoming the implementation language for high-performance data tooling. **Polars** (Rust), **DataFusion** (Rust), **Apache Arrow** (Rust core), **Vector.dev** (Rust). If you write performance-critical UDFs, Rust is becoming the right choice.

- **Polars**: replaces Pandas for ad-hoc analytics.
- **DataFusion**: SQL-on-Arrow query engine.
- **tokio-rs**: async runtime for high-throughput services.
- **Apache Arrow Rust**: native Arrow implementation.

**Bet**: trial Rust UDFs in Snowflake (via External Function) in FY27 for one hot-path calculation.

### Modern Python stack

- **Polars**: replaces Pandas.
- **Pydantic v2**: Rust core, 10× faster than v1.
- **uv**: 10-100× faster pip replacement.
- **ruff**: 100× faster flake8 + black + isort replacement.
- **maturin**: build Python wheels from Rust.

**Bet**: migrate internal Python tools to uv + ruff in FY26 Q1 (mostly done already). Pydantic v2 for all new code.

### JavaScript / TypeScript

The frontend of this platform uses Next.js + TypeScript. The TS ecosystem is consolidating around **Bun** (runtime + bundler + test runner), **Vite** (dev server), **Tailwind 4** (styling), **shadcn/ui** (components). The platform already uses most of these.

- **Bun**: faster than Node + npm; used in this project's dev tooling.
- **Vite**: dominates the dev server space.
- **shadcn/ui**: copy-paste components, not a library — winning the React component pattern war.

**Bet**: stay on this stack through FY27. Watch **Million.js** (React performance) and **TanStack Start** (full-stack TS framework) for possible disruption.

---

## Compute paradigms

### Edge + fog computing for data collection

Some data is too expensive (bandwidth) or too sensitive (PII) to centralise. Edge preprocessing (filter, aggregate, anonymise) before central ingest is growing.

- **Apache Kappa**: stream-first architecture.
- **AWS IoT Greengrass** / **Azure IoT Edge**: edge runtime.
- **Apache Pulsar**: geo-distributed streaming.

**Bet**: only relevant if IoT / store-edge ingest becomes a priority. On watch.

### Carbon-aware computing

**Green Software Foundation** is publishing patterns for shifting workloads to times/places where grid carbon intensity is low. Snowflake + Databricks don't yet support carbon-aware scheduling natively, but the building blocks exist (region choice, schedule choice).

- **Carbon-aware SDK**: open source, helps schedule workloads based on carbon intensity forecasts.
- **Electricity Maps API**: real-time grid carbon intensity.
- **Scaphandre**: open-source energy + carbon monitoring.

**Bet**: long-term aspiration (FY27+); a carbon-aware batch scheduler that defers non-urgent workloads to low-CO₂ hours.

---

## AI & ML

### Vector databases + RAG

The RAG pattern (retrieve-then-generate) is becoming standard for LLM-augmented applications. Vector DBs are the retrieval layer.

- **pgvector**: Postgres + vectors. Good if you already have Postgres.
- **Pinecone** / **Weaviate** / **Qdrant**: dedicated vector DBs.
- **Databricks Vector Search**: integrated with Delta Lakehouse.
- **Snowflake Cortex Vector**: integrated with Snowflake.

**Bet**: Databricks Vector Search for ML use cases; pgvector for documentation RAG (this platform's docs site, FY26 Q3).

### Multi-agent orchestration

Single-LLM-call applications are giving way to multi-agent systems where specialised agents collaborate.

- **LangGraph**: stateful, multi-step agent orchestration.
- **CrewAI**: role-based agent collaboration.
- **AutoGen** (Microsoft): conversational multi-agent.

**Bet**: LangGraph for the Agentic Workflow (see AGENTIC_WORKFLOW.md). Spike CrewAI if multi-role workflows emerge.

### Local / on-device ML

For some use cases (edge anomaly detection, customer-facing real-time scoring), local ML is preferable to warehouse-hosted.

- **ONNX Runtime**: cross-platform ML execution.
- **llama.cpp** + **Ollama**: local LLMs.
- **Apple CoreML** / **TensorFlow Lite**: mobile ML.

**Bet**: not directly relevant to data platform, but on-device anomaly detection for store-edge ingest is a FY27 spike.

---

## What I'm explicitly NOT betting on (yet)

- **Blockchain for data lineage**: solution looking for a problem; OpenLineage + Merquez do this better with conventional tech.
- **Data mesh as an org pattern**: viable org pattern, but most companies aren't ready for it. Stay domain-driven internally but not full mesh.
- **Pure serverless data warehouses**: cost-unpredictable at scale; multi-cluster + auto-suspend is the sweet spot.
- **Replacing SQL with Python-first analytics**: SQL won. Python is a complement, not a replacement.
- **Rebuilding the platform on Kubernetes**: IaC is the right level of abstraction; raw Kubernetes adds ops burden without value for data workloads.
- **Replacing dbt with notebook-only transformations**: dbt's tests + docs + slim CI are too valuable to give up.

---

## How to use this document

1. **Quarterly review**: re-read every quarter; update status (watch → spike → trial → adopt).
2. **Cross-reference**: every entry that becomes a real bet should get an ADR on the Knowledge Hub page.
3. **Stay honest**: track which past predictions were right and which were wrong. The Evolution page is the scorecard.
4. **Pull requests welcome**: this is a living document. Submit PRs with new technologies, corrected assessments, or sunset predictions that didn't age well.
