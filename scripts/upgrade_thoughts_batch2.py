#!/usr/bin/env python3
"""
Upgrade 20 more pages' generic DeeperThought sections to page-specific arguments.
Each page gets 5 ORIGINAL arguments specific to its technology.
Replaces the generic template thoughts.
"""
import re
from pathlib import Path

PAGES_DIR = Path("/home/z/my-project/src/app/_pages")

GENERIC_TITLES = [
    "This page IS part of a larger system",
    "The technology will change; the math won",
    "The fold pattern respects the reader",
    "The output IS the proof",
    "In a decade, this page will evolve",
]

UPGRADES = {
    "arrow.tsx": [
        ("Arrow IS the columnar memory format — and it's the universal data interchange", "ADR-022 (pgvector for variant embeddings)",
         "Apache Arrow's columnar format IS the lingua franca of data engineering. Every modern analytics engine (Spark, Databricks, Snowflake, DuckDB, Pandas) reads/writes Arrow in-memory. The columnar layout (values stored contiguously per column, not per row) enables vectorized SIMD execution — 10x faster than row-oriented processing. Arrow IS to data what UTF-8 is to text: a universal interchange format that eliminates serialization overhead between systems."),
        ("Arrow's zero-copy IPC IS the end of serialization", "ADR-001 (platform architecture)",
         "Arrow's Inter-Process Communication (IPC) protocol enables zero-copy data transfer between processes. If Spark writes Arrow data to shared memory, DuckDB can read it without deserialization — no CPU spent on copying or parsing. This IS the same principle as memory-mapped files (mmap) — the data IS the message. The serialization tax (JSON → parse → object → serialize → parse) IS eliminated. Arrow IS the post-serialization era."),
        ("Arrow Flight IS gRPC for data — and it's the right transport", "ADR-050 (fold-section architecture)",
         "Arrow Flight uses gRPC (HTTP/2 + Protocol Buffers) for columnar data transport. Unlike ODBC/JDBC (which add 3-5x overhead from row-oriented wire format + deserialization), Flight streams Arrow batches directly — zero-copy from sender to receiver. The 10Gbps+ throughput IS because the wire format IS the in-memory format. Arrow Flight IS to data what HTTP/2 is to web — a transport that doesn't tax the payload."),
        ("Arrow's C++ kernel IS the universal compute engine", "ADR-034 (ESM-2 + AlphaFold2)",
         "Arrow's C++ kernel (Gandiva, compute functions, expression evaluation) is shared across all Arrow-compatible engines (Acero in Spark, DuckDB's execution engine, Polars' Rust bindings). When you call df.filter() in Pandas, Polars, or DuckDB — the SAME C++ code runs. The kernel IS the universal compute engine. Python/R/Java are just bindings. The math (columnar scan + predicate pushdown + vectorized execution) stays; the language binding changes."),
        ("Arrow IS to data what NumPy is to ML — the universal array format", "ADR-022 (pgvector for variant embeddings)",
         "NumPy defined the N-dimensional array (ndarray) as the universal data structure for ML. Arrow defines the columnar table (RecordBatch) as the universal data structure for analytics. Both are: (1) memory-contiguous, (2) language-agnostic, (3) zero-copy, (4) SIMD-vectorized. NumPy IS for tensors; Arrow IS for tables. The pattern (define the in-memory format → every tool adopts it → zero-copy between tools) IS the same. Arrow IS NumPy for data engineering."),
    ],
    "dbt.tsx": [
        ("dbt IS the transformation layer — and it's SQL all the way down", "ADR-001 (platform architecture)",
         "dbt doesn't invent a new language — it uses SQL. The .sql files ARE the transformation logic. The YAML files ARE the tests. The manifest.json IS the lineage. dbt IS the answer to 'how do you version-control your data transformations?' — by making them SQL files in a Git repo. The pattern (SQL + tests + lineage in Git) IS the same as application code (Python + tests + CI in Git). dbt IS Git for data transformations."),
        ("dbt tests ARE assertions — and they prevent the 'wrong data' bug", "ADR-050 (fold-section architecture)",
         "dbt tests (not_null, unique, accepted_values, relationships) ARE assertions about data quality. They're the data equivalent of unit tests in software. A not_null test on user_id IS like a type check: if user_id is null, the test fails, the pipeline stops. This prevents the 'wrong data in the dashboard' bug that costs data teams 20% of their time. The pattern (assertions + CI) IS the same as software testing — just for data instead of code."),
        ("The Medallion architecture (Bronze→Silver→Gold) IS progressive disclosure for data", "ADR-050 (fold-section architecture)",
         "The Medallion pattern (Bronze = raw, Silver = cleaned, Gold = business-aligned) IS the fold pattern applied to data. Bronze IS the 'brief' — raw data, immediately available. Silver IS the 'production patterns' — cleaned, conformed, tested. Gold IS the 'deeper thought' — business-aligned marts that serve specific use cases. Each layer adds value without rewriting the previous. Progressive disclosure for data = Medallion for code."),
        ("dbt's ref() function IS the dependency graph — same as Make", "ADR-001 (platform architecture)",
         "dbt's ref('model_name') resolves at compile time to the actual table/view name — and it tracks dependencies. If model B refs model A, dbt knows to run A before B. This IS the SAME pattern as Make's dependency resolution (Makefile: target depends on source). The DAG (directed acyclic graph) of dbt models IS a Makefile for data. The math (topological sort) IS the same. dbt IS Make for SQL."),
        ("dbt + Great Expectations IS typed data — and types win", "ADR-022 (pgvector for variant embeddings)",
         "dbt tests + Great Expectations suites ARE the type system for data. A column with not_null + unique + accepted_values IS a typed column. A column without tests IS an untyped column (any value accepted). The typed vs untyped debate IS the SAME as TypeScript vs JavaScript: types catch errors early, enable better tooling, and prevent the 'wrong format' bug. dbt + GE IS TypeScript for data pipelines."),
    ],
    "flink.tsx": [
        ("Flink IS event-time processing — and it's the right abstraction", "ADR-001 (platform architecture)",
         "Flink's event-time processing (using the event's timestamp, not the processing time) IS the correct abstraction for streaming. If a Kafka message was produced at 10:00 but processed at 10:05, the 5-minute delay should NOT affect the computation. Event-time + watermarks handle this correctly: process the event AS IF it arrived at 10:00. Processing-time would produce wrong results when backpressure delays messages. Event-time IS to streaming what ACID is to databases — a correctness guarantee."),
        ("Flink's checkpoint IS Chandy-Lamport distributed snapshots — and it's the right algorithm", "ADR-013 (Delta Lake)",
         "Flink's checkpointing mechanism (barrier injection + async snapshot) IS the Chandy-Lamport distributed snapshot algorithm (1985). The barrier IS the marker that separates pre-snapshot from post-snapshot state. Each operator snapshots its state when it sees the barrier. This gives exactly-once semantics WITHOUT pausing the pipeline. The math (distributed snapshots) IS 40 years old; the implementation (Flink) IS modern. The algorithm stays; the framework evolves."),
        ("Flink's watermark IS the truth about time — and it's a trade-off", "ADR-050 (fold-section architecture)",
         "Watermarks tell Flink: 'I believe all events with timestamp < T have arrived.' This IS a trade-off: high watermark = low latency but risk of late events (wrong results); low watermark = correct results but high latency (old data). The watermark IS the same trade-off as CAP theorem's consistency vs availability — just for time instead of distributed state. Understanding watermarks IS understanding the fundamental tension in stream processing: you can't have both perfect correctness and zero latency."),
        ("Flink state IS a key-value store — and it's the right model", "ADR-022 (pgvector for variant embeddings)",
         "Flink's managed state (ValueState, ListState, MapState) IS a key-value store embedded in the operator. The state IS local (no network calls), versioned (checkpointed), and queryable (QueryableState). This IS the SAME pattern as a database's buffer pool: local state for fast access, persisted for durability. The difference: Flink state is per-key (sharded by partition), while a database buffer pool is per-node. The pattern (local state + checkpoint) IS the same."),
        ("Flink vs Spark streaming IS micro-batch vs continuous — and continuous wins for low latency", "ADR-050 (fold-section architecture)",
         "Spark Structured Streaming processes data in micro-batches (collect 100ms of data → process → commit). Flink processes continuously (event-by-event). For latency-sensitive workloads (fraud detection, real-time alerting), continuous processing IS necessary — a 100ms batch delay can miss a fraud event. For throughput-sensitive workloads (ETL, aggregation), micro-batch IS fine. The trade-off (latency vs throughput) IS the same as TCP's Nagle algorithm (small packets = low latency, large packets = high throughput). Flink IS TCP_NODELAY; Spark IS Nagle."),
    ],
    "pinot.tsx": [
        ("Pinot IS the real-time analytics database — and it's columnar + pre-aggregated", "ADR-001 (platform architecture)",
         "Pinot combines columnar storage (fast scans) with pre-aggregated star-tree indexes (fast GROUP BY). The star-tree pre-computes aggregations at ingestion time — so a COUNT(*) GROUP BY city query that would scan 1B rows scans only 100 pre-aggregated segments. This IS the SAME trade-off as materialized views in databases: pay the cost at write time to save at query time. Pinot IS materialized views for real-time analytics."),
        ("Pinot's segment IS the immutable unit — and it's the right abstraction", "ADR-013 (Delta Lake)",
         "Pinot stores data in segments (immutable, compressed, indexed). Each segment IS a self-contained file with its own index. Segments are never updated — new data creates new segments. This IS the SAME pattern as Delta Lake's immutable Parquet files + transaction log. The immutability enables: (1) zero-copy reads (no locks), (2) easy replication (copy files), (3) time travel (old segments preserved). The pattern (immutable segment + append-only) IS event sourcing for analytics."),
        ("Pinot's real-time vs batch segments IS the lambda architecture — unified", "ADR-050 (fold-section architecture)",
         "Pinot has two segment types: batch (loaded from offline files) and real-time (consumed from Kafka). Queries read from BOTH simultaneously. This IS the lambda architecture (batch + speed layer) UNIFIED — no separate batch and real-time clusters. The query planner merges results from both layers. The pattern (unified batch + real-time) IS the same as Delta Lake's unified batch + streaming. Pinot IS the unified lambda for analytics."),
        ("Pinot's indexes ARE the query plan — and they're multi-dimensional", "ADR-022 (pgvector for variant embeddings)",
         "Pinot's index types (inverted, sorted, range, geo, JSON, text) ARE pre-computed query plans. An inverted index on 'city' IS a pre-computed GROUP BY city. A sorted index on 'timestamp' IS a pre-computed ORDER BY timestamp. A range index on 'price' IS a pre-computed WHERE price > 100. The query planner chooses which index to use — like a database query planner chooses which B-tree to scan. The difference: Pinot's indexes are multi-dimensional (you can combine city + timestamp + price). Pinot IS multi-dimensional indexing for real-time analytics."),
        ("Pinot IS to analytics what Kafka IS to streaming — the real-time layer", "ADR-001 (platform architecture)",
         "Kafka IS the real-time data transport (publish-subscribe). Pinot IS the real-time data analytics (query). Together: Kafka → Pinot = real-time pipeline → real-time dashboard. The pattern (transport + analytics) IS the same as the batch pattern (S3 → Snowflake = batch storage → batch analytics). Pinot IS the real-time Snowflake — columnar, indexed, fast — just for streaming data instead of batch data."),
    ],
    "schema-registry.tsx": [
        ("Schema Registry IS the data contract — and it's the API for data", "ADR-001 (platform architecture)",
         "Schema Registry stores Avro/Protobuf/JSON schemas for Kafka topics. Producers register schemas before writing; consumers fetch schemas before reading. This IS the API for data: the schema IS the interface, the topic IS the endpoint, the message IS the payload. The pattern (schema + endpoint + payload) IS identical to REST (OpenAPI + URL + body). Schema Registry IS OpenAPI for streaming data."),
        ("Schema evolution IS backward/forward compatibility — and it's the right design", "ADR-050 (fold-section architecture)",
         "Schema Registry's compatibility modes (BACKWARD, FORWARD, FULL) ARE the rules for evolving schemas without breaking consumers. BACKWARD: new schema can read old data (add field with default). FORWARD: old schema can read new data (ignore extra fields). FULL: both. This IS the SAME pattern as Avro's schema evolution and Protobuf's wire compatibility. The math (partial order on schemas) IS the same. Schema evolution IS version control for data types."),
        ("Schema Registry IS the type system for Kafka — and types prevent bugs", "ADR-022 (pgvector for variant embeddings)",
         "Without Schema Registry, Kafka messages are untyped byte arrays. Consumers must know the format (is it JSON? Avro? Protobuf?). With Schema Registry, every message has a schema ID → consumers know the type → deserialization is automatic. This IS the SAME upgrade as dynamically-typed → statically-typed languages. Schema Registry IS TypeScript for Kafka — it catches the 'wrong format' bug at ingestion, not at query time."),
        ("Confluent's Schema Registry IS the canonical implementation — but it's not the only one", "ADR-050 (fold-section architecture)",
         "Confluent's Schema Registry is the reference implementation. Alternatives: AWS Glue Schema Registry, Apicurio Registry, Google's Protobuf descriptor pool. All implement the SAME pattern: register → validate → fetch → deserialize. The pattern (centralized schema store + producer/consumer validation) IS the same. The implementation (Confluent vs Glue vs Apicurio) changes. The fold absorbs the change."),
        ("Schema Registry's compatibility check IS the CI/CD gate for data", "ADR-013 (Delta Lake)",
         "Schema Registry checks compatibility BEFORE registering a new schema. If the new schema is incompatible (e.g., removes a required field without default), registration fails. This IS the SAME pattern as a CI/CD gate: code change → run tests → merge if pass. Schema change → check compatibility → register if pass. Schema Registry IS CI/CD for data schemas."),
    ],
    "lineage.tsx": [
        ("Lineage IS the dependency graph — and it's git blame for data", "ADR-001 (platform architecture)",
         "Data lineage tracks: table A depends on table B depends on table C. When table C breaks, lineage tells you all downstream tables affected. This IS the SAME pattern as git blame (which file caused this bug?) and Make's dependency graph (which targets depend on this source?). The lineage graph IS a DAG (directed acyclic graph) — the SAME structure as dbt's DAG, Airflow's DAG, and Make's dependency tree. Lineage IS git blame for data."),
        ("OpenLineage IS the open standard — and it's the right design", "ADR-050 (fold-section architecture)",
         "OpenLineage (open standard for lineage) defines events: job started, job completed, dataset created, dataset read. Each event has metadata (run ID, inputs, outputs, facets). This IS the SAME pattern as OpenTelemetry for distributed tracing (span started, span completed, attributes). OpenLineage IS OpenTelemetry for data — the same event-driven, vendor-neutral, standards-based approach. The pattern (events + metadata + open API) IS the same."),
        ("Column-level lineage IS field-level dependency — and it's more useful than table-level", "ADR-022 (pgvector for variant embeddings)",
         "Table-level lineage says 'dashboard depends on table A.' Column-level lineage says 'dashboard's revenue column depends on table A's price column and table B's quantity column.' When price changes, you know exactly which dashboard cells are affected. This IS the SAME upgrade as git diff (file-level → line-level). Column-level lineage IS git diff for data."),
        ("Lineage + impact analysis IS the blast radius — and it's the right question", "ADR-013 (Delta Lake)",
         "When a source table changes schema, the blast radius IS the set of all downstream tables/dashboards/ML models that depend on it. Lineage + impact analysis computes this set. This IS the SAME question as 'what services depend on this microservice?' in service mesh. The blast radius IS the dependency fanout. The math (graph reachability from a node) IS the same. Impact analysis IS reachability for data graphs."),
        ("Lineage IS the audit trail — and it's the compliance requirement", "ADR-001 (platform architecture)",
         "GDPR Article 30 requires data processing records. Lineage IS the processing record: this PII column came from source X, was transformed by job Y, and feeds dashboard Z. When a user requests data deletion (Article 17), lineage tells you exactly which tables to purge. Lineage IS the compliance API for data — the audit trail that proves you know where every column came from and where it goes."),
    ],
    "data-contracts.tsx": [
        ("Data contracts ARE API contracts — and they should be treated as such", "ADR-001 (platform architecture)",
         "A data contract specifies: schema (fields, types, constraints), SLA (freshness, completeness), ownership (who produces, who consumes), and change management (how to evolve). This IS the SAME pattern as an API contract (OpenAPI spec: endpoints, request/response types, SLAs, versioning). Data contracts ARE API contracts for data. The pattern (typed contract + ownership + SLA) IS the same. The implementation (SQL assertions vs HTTP schemas) differs."),
        ("Data contracts prevent the 'upstream changed and broke my dashboard' bug", "ADR-022 (pgvector for variant embeddings)",
         "Without contracts, upstream teams can rename columns, change types, or add nulls without telling downstream consumers. The dashboard breaks. With contracts, upstream must get approval from downstream before changing. This IS the SAME pattern as API versioning: you can't change the response schema without bumping the version and notifying consumers. Data contracts ARE API versioning for data pipelines."),
        ("Data contracts ARE the CI/CD gate for schema changes", "ADR-013 (Delta Lake)",
         "A data contract enforces: if you change the schema, run the compatibility check. If incompatible, the contract fails, the CI gate blocks the merge. This IS the SAME pattern as running tests before merging code. The contract IS the test. The CI gate IS the merge protection. Data contracts ARE CI/CD for data schemas — the same pattern, different artifact."),
        ("Data contracts shift left — and that's the right direction", "ADR-050 (fold-section architecture)",
         "Without contracts, schema problems are discovered at query time (dashboard breaks). With contracts, schema problems are discovered at design time (contract review). This IS the 'shift left' pattern from software engineering: catch bugs earlier (design time) instead of later (production). The earlier you catch a schema incompatibility, the cheaper it is to fix. Data contracts ARE shift-left for data."),
        ("Data contracts + Schema Registry = the full type system for data", "ADR-022 (pgvector for variant embeddings)",
         "Schema Registry enforces the technical contract (field types, compatibility). Data contracts enforce the business contract (SLA, ownership, change process). Together, they form a full type system: technical (schema) + semantic (contract). This IS the SAME as TypeScript + JSDoc: TypeScript enforces types (technical), JSDoc documents intent (semantic). Data contracts ARE the JSDoc layer on top of Schema Registry's TypeScript layer."),
    ],
    "privacy-enhancing-tech.tsx": [
        ("Differential privacy IS the mathematical guarantee — and it's the right abstraction", "ADR-001 (platform architecture)",
         "Differential privacy (DP) guarantees: the output of a query changes by at most ε when any single record is added/removed. This IS a mathematical theorem, not a heuristic. The ε (epsilon) parameter controls the privacy-utility trade-off: small ε = strong privacy but noisy results; large ε = weak privacy but accurate results. DP IS the only privacy definition with a PROVABLE guarantee. Everything else (anonymization, pseudonymization) is a heuristic that can be defeated."),
        ("DP's Laplace mechanism IS noise injection — and it's calibrated to ε", "ADR-022 (pgvector for variant embeddings)",
         "The Laplace mechanism adds noise drawn from Laplace(0, 1/ε) to each query result. The noise scale IS inversely proportional to ε: more privacy (smaller ε) = more noise. This IS the SAME math as Kalman filtering (add noise proportional to the uncertainty). The difference: Kalman minimizes estimation error; DP maximizes privacy. Both add Gaussian/Laplace noise calibrated to a parameter (R for Kalman, ε for DP). The math (noise injection + parameter calibration) IS the same."),
        ("Homomorphic encryption IS computation on ciphertext — and it's the holy grail", "ADR-034 (ESM-2 + AlphaFold2)",
         "Fully homomorphic encryption (FHE) allows computation on encrypted data without decryption. You send encrypted data to a cloud server; it computes f(encrypted) and returns the encrypted result; you decrypt locally. The server NEVER sees the plaintext. FHE IS the holy grail of privacy: the cloud computes but doesn't know what it's computing on. The math (ring homomorphisms + bootstrapping) is 15 years old (Gentry 2009). The implementation (10,000x overhead) is not yet practical — but it will be."),
        ("Secure multiparty computation IS the split-key pattern — and it's practical", "ADR-050 (fold-section architecture)",
         "SMPC allows multiple parties to jointly compute a function on their private inputs without revealing the inputs to each other. Each party holds a share of the data; the computation proceeds without anyone seeing the full input. This IS the SAME pattern as Shamir's secret sharing: split the secret into N shares, distribute to N parties, reconstruct only when M < N shares are combined. SMPC IS Shamir's secret sharing for computation."),
        ("Federated learning IS distributed training — and it's the right model for privacy", "ADR-034 (ESM-2 + AlphaFold2)",
         "Federated learning trains ML models on each user's device (local data), then aggregates the model updates (not the data) on a central server. The server NEVER sees the raw data — only the gradient updates. This IS the SAME pattern as distributed SGD (each worker computes gradients, server averages). The difference: in distributed SGD, the data is on the same cluster; in federated learning, the data is on different devices (phones, hospitals). Federated learning IS distributed SGD across trust boundaries."),
    ],
    "dask-ray.tsx": [
        ("Dask IS pandas at scale — and it's the right abstraction", "ADR-001 (platform architecture)",
         "Dask's DataFrame API mirrors Pandas — groupby, merge, join, filter. The difference: Dask partitions the DataFrame into chunks and processes them in parallel across a cluster. A 100GB DataFrame that doesn't fit in memory becomes 100 1GB partitions that fit. The user writes the SAME Pandas code; Dask handles the parallelism. Dask IS Pandas with a distributed backend — the same pattern as NumPy with a GPU backend."),
        ("Ray IS the universal distributed computing framework — and it's the right design", "ADR-034 (ESM-2 + AlphaFold2)",
         "Ray provides: task parallelism (remote functions), actor model (stateful workers), and object store (distributed shared memory). The SAME framework runs: RL training (RLlib), hyperparameter tuning (Tune), model serving (Serve), and data processing (Datasets). Ray IS the universal backend for Python distributed computing — the same pattern as Spark for the JVM. The math (task scheduling + actor model + shared memory) IS the same; the language (Python) differs."),
        ("Dask vs Ray IS task-graph vs actor-model — and both are valid", "ADR-050 (fold-section architecture)",
         "Dask uses a task graph (build DAG → schedule → execute). Ray uses an actor model (create remote actors → send messages → receive results). Dask's approach is better for data-parallel workloads (groupby, join) where the DAG is known upfront. Ray's approach is better for stateful workloads (RL training, model serving) where the computation is dynamic. The trade-off (static DAG vs dynamic actors) IS the same as Spark vs Flink. Both are valid; the workload determines the winner."),
        ("Dask's task graph IS lazy evaluation — and it's the right pattern", "ADR-022 (pgvector for variant embeddings)",
         "Dask builds a task graph (DAG) when you call df.groupby().mean() — but doesn't execute it. Execution only happens when you call .compute(). This IS the SAME pattern as Spark's lazy evaluation (transformations build the DAG, actions trigger execution). The benefit: the scheduler can optimize the entire DAG before executing — reorder, fuse, prune. Lazy evaluation IS the right pattern for data processing because it enables whole-query optimization."),
        ("Ray Serve IS the model serving layer — and it's the production pattern", "ADR-001 (platform architecture)",
         "Ray Serve deploys ML models as HTTP endpoints. Each model runs as a Ray actor (stateful, auto-scaled). The SAME Ray cluster that trained the model (RLlib/Tune) also serves it (Serve). This IS the SAME pattern as a Kubernetes deployment: the cluster runs both training (jobs) and serving (deployments). Ray IS Kubernetes for Python ML — the pattern (cluster + jobs + deployments) IS the same; the implementation (Ray vs K8s) differs."),
    ],
    "gpu-computing.tsx": [
        ("GPU computing IS SIMD at massive scale — and it's the right hardware", "ADR-034 (ESM-2 + AlphaFold2)",
         "A GPU has 10,000+ cores that execute the SAME instruction on DIFFERENT data (SIMD). A CPU has 8-64 cores that execute DIFFERENT instructions (MIMD). For matrix multiply (the core of ML), SIMD IS the right model: every element of the output matrix is computed the SAME way (dot product), just with different data. The GPU's 10,000 cores compute 10,000 dot products simultaneously. GPU IS the hardware that matches the math of matrix multiplication."),
        ("CUDA IS the programming model — and it's C with parallel extensions", "ADR-050 (fold-section architecture)",
         "CUDA extends C with: thread blocks (groups of threads), shared memory (fast on-chip cache), and synchronization primitives (__syncthreads). The programmer writes ONE kernel function; the GPU launches N copies (one per thread). This IS the SAME pattern as MapReduce: the programmer writes ONE map function; the framework launches N copies. CUDA IS MapReduce for the GPU — the pattern (write once, launch many) IS the same."),
        ("GPU memory hierarchy IS the optimization — and it's the bottleneck", "ADR-022 (pgvector for variant embeddings)",
         "GPU has 3 memory tiers: registers (1 cycle, ~256KB), shared memory (5 cycles, ~100KB/SM), global memory (400 cycles, ~24GB). Moving data from global to shared memory IS the optimization. The SAME pattern as CPU cache hierarchy (L1/L2/L3). The difference: GPU shared memory is programmer-managed (you decide what goes in shared); CPU cache is hardware-managed (the CPU decides). GPU computing IS manual cache management for parallel workloads."),
        ("CuPy IS NumPy on GPU — and it's the right abstraction", "ADR-034 (ESM-2 + AlphaFold2)",
         "CuPy's API mirrors NumPy — np.array becomes cp.array, np.linalg.svd becomes cp.linalg.svd. The user writes the SAME NumPy code; CuPy runs it on the GPU. 10-100x speedup for matrix operations. This IS the SAME pattern as Dask (Pandas code, distributed backend) and JAX (NumPy code, autodiff backend). CuPy IS NumPy with a GPU backend — the pattern (same API, different hardware) IS the right abstraction."),
        ("Multi-GPU training IS the next frontier — and it's AllReduce", "ADR-034 (ESM-2 + AlphaFold2)",
         "Training GPT-4 (175B parameters) requires multiple GPUs (each has 80GB, model needs ~700GB). Each GPU computes gradients on a mini-batch; gradients are averaged across GPUs via AllReduce. This IS the SAME pattern as distributed SGD in Dask/Ray — each worker computes, server averages. The math (gradient averaging) IS the same; the interconnect (NVLink vs Ethernet) determines the speed. Multi-GPU IS distributed SGD over a fast interconnect."),
    ],
    "jupyter.tsx": [
        ("Jupyter IS the REPL for data science — and it's the right UX", "ADR-001 (platform architecture)",
         "Jupyter notebooks let you write code, see output, write more code — iteratively. This IS the REPL (Read-Eval-Print Loop) pattern, extended with rich output (plots, tables, HTML). The REPL IS the right UX for exploratory data analysis: you don't know what you're looking for until you see it. Jupyter IS the REPL that matches the exploratory nature of data science — you explore, find, then productionize."),
        ("Jupyter's cell model IS the state machine — and it's the source of bugs", "ADR-050 (fold-section architecture)",
         "Jupyter notebooks execute cells in order — but the state (variables, imports) persists between cells. If you re-run cell 3 after changing cell 1, the state from the previous run persists. This IS the hidden-state problem: the notebook's state IS NOT a function of its code (it depends on execution history). This is why notebooks are hard to reproduce. The fix: 'Restart kernel and run all' — which makes the state a function of the code. The cell model IS the state machine; 'run all' IS the deterministic execution."),
        ("JupyterHub IS the multi-user Jupyter — and it's the right pattern", "ADR-001 (platform architecture)",
         "JupyterHub runs a Jupyter server per user (spawned on demand). Each user gets their own kernel, filesystem, and environment. This IS the SAME pattern as Kubernetes pods (one pod per user) and Jupyter IS the container. JupyterHub IS Kubernetes for notebooks — the pattern (multi-tenant + on-demand spawning) IS the same."),
        ("Jupyter IS the lab notebook — and that's the right metaphor", "ADR-050 (fold-section architecture)",
         "A Jupyter notebook IS a digital lab notebook: code (method), output (result), markdown (observation). The sequence of cells IS the experimental record. This IS the SAME pattern as a scientist's lab notebook — where you write what you did, what you saw, and what you think. Jupyter IS the lab notebook for computational science. The reproducibility issue (hidden state) IS the same as a lab notebook that says 'I added reagent X' but doesn't specify the concentration."),
        ("Jupyter → production IS the gap — and nbconvert is the bridge", "ADR-022 (pgvector for variant embeddings)",
         "Notebooks are for exploration; production needs scripts. The gap: how to turn exploratory code into production code. nbconvert (convert notebook to .py script) IS the bridge. The pattern (exploration → production) IS the same as the fold pattern (summary → deeper). The notebook IS the 'brief' (exploratory); the script IS the 'production patterns' (deterministic). nbconvert IS the fold between exploration and production."),
    ],
    "comp-sci-materials.tsx": [
        ("Materials science IS the multi-scale problem — and it's the right framing", "ADR-034 (ESM-2 + AlphaFold2)",
         "Materials science spans 12 orders of magnitude: quantum (10^-11 m, DFT) → atomistic (10^-9 m, MD) → mesoscale (10^-6 m, phase field) → continuum (10^-3 m, FEM) → structural (1 m, engineering). Each scale needs a different equation: Schrödinger (quantum), Newton (MD), Cahn-Hilliard (phase field), Navier-Stokes (FEM). The platform's thesis applies: the SAME math (PDEs) appears at every scale — just with different parameters and dimensions."),
        ("DFT IS the quantum ground state — and it's the foundation of materials", "ADR-034 (ESM-2 + AlphaFold2)",
         "Density Functional Theory (DFT) solves the Kohn-Sham equations: [-½∇² + V_eff]ψ = εψ. This IS a variant of the Schrödinger equation — the SAME equation that appears on the computational-chemistry page. DFT approximates the many-body electron problem with a single-particle effective potential. The math (eigenvalue problem for a PDE) IS the same as SVD (eigenvalue problem for a matrix). DFT IS SVD for quantum states."),
        ("Molecular dynamics at the materials scale IS Verlet — same as protein folding", "ADR-051 (living-equation pages)",
         "Materials MD uses the SAME Verlet integrator as protein MD (AMBER/GROMACS). The difference: materials MD simulates 10^6-10^9 atoms (crystal lattice) vs protein MD's 10^4-10^5 atoms. The equation (F = ma, Verlet step) IS identical. The force field (EAM for metals vs AMBER for proteins) differs. The math (Verlet integration) IS the same — just different F(x). This IS the multi-disciplinary elegance: one integrator, two sciences."),
        ("Phase-field models ARE Cahn-Hilliard — and they're PDEs", "ADR-055 (cross-disciplinary scope)",
         "Phase-field models use the Cahn-Hilliard equation: ∂c/∂t = ∇·(M∇(δF/δc)). This IS a fourth-order PDE — the SAME class as Navier-Stokes (second-order). The phase field c represents the concentration; the free energy F drives the evolution. The pattern (free energy minimization via PDE) IS the same as gradient descent (loss minimization via gradient). Phase-field IS gradient descent for materials science."),
        ("The Materials Project IS the open database — and it's the right model", "ADR-022 (pgvector for variant embeddings)",
         "The Materials Project (Berkeley 2011) computed 150,000+ materials via DFT and made the results open. Researchers query the database (not run DFT) to find materials with desired properties. This IS the SAME pattern as UniProt (computed protein structures, open database) and gnomAD (genetic variants, open database). The pattern (compute once → store → query → discover) IS the pattern of modern computational science. The Materials Project IS UniProt for materials."),
    ],
    "alphamissense.tsx": [
        ("AlphaMissense IS evolution's experimental log — queried via ML", "ADR-043 (AlphaMissense adoption)",
         "AlphaMissense predicts pathogenicity of 71M missense variants by learning from evolution. The 250M sequences in UniProt ARE the training data — 4 billion years of natural selection ARE the experiment. Variants that survived (common in gnomAD) are benign; variants that were selected against (absent) are pathogenic. AlphaMissense IS the lookup table for evolution's experimental results — distilled into a 650M-parameter transformer."),
        ("AlphaMissense's 94% accuracy IS the evolutionary signal", "ADR-043 (AlphaMissense adoption)",
         "PolyPhen-2 (75%) used rule-based features. CADD (80%) ensembled 63 annotations. AlphaMissense (94%) uses a deep-learning model on 250M sequences. The 94% IS the upper bound of what's possible from sequence + structure alone — the remaining 6% requires functional assay data. The accuracy improvement (75 → 80 → 94) IS the deep-learning signal: the model discovers the SAME patterns evolution used, without explicit rules."),
        ("Precision medicine IS multi-modal RAG on the human genome", "ADR-043 (AlphaMissense adoption)",
         "A clinical variant report combines: VCF (genetic modality) + ClinVar (clinical modality) + AlphaFold structure (3D modality) + ESM-2 embedding (protein modality) + LLM summary (natural language). This IS multi-modal RAG: query the genome (VCF), retrieve from multiple knowledge bases, generate a summary. Precision medicine IS multi-modal RAG on the human genome — the platform's GenAI stack applied to clinical genomics."),
        ("AlphaMissense + gnomAD IS the variant-to-phenotype pipeline", "ADR-037 (genetic materials + variant calling)",
         "The pipeline: sequence genome → call variants (GATK + Poisson) → annotate pathogenicity (AlphaMissense) → classify (ClinVar) → report (LLM). Each step uses a different mathematical tool: Poisson (coverage), Bayes (genotype likelihood), Attention (AlphaMissense), Entropy (constraint), Shannon (compression). The pipeline IS a chain of equations — each one from a different elegant-code card. AlphaMissense IS the Attention card in the clinical genomics pipeline."),
        ("The 71M variant lookup table IS the pre-computation pattern", "ADR-022 (pgvector for variant embeddings)",
         "AlphaMissense pre-computes all 71M possible missense variants and stores them in a lookup table. Instead of running the model per patient (slow), the clinician queries the table (instant). This IS the SAME pattern as the Materials Project (pre-compute DFT, store, query) and UniProt (pre-compute protein clusters, store, query). The pattern (compute once → store → query) IS the pattern of modern computational science. AlphaMissense IS the pre-computation pattern for clinical genomics."),
    ],
    "boltz.tsx": [
        ("Boltz IS the open-source protein structure predictor — and it's the right model", "ADR-034 (ESM-2 + AlphaFold2)",
         "Boltz (2024) is an open-source protein structure predictor that rivals AlphaFold2. It uses the SAME attention + diffusion architecture — but with open weights and MIT license. The math (Attention + diffusion + SE(3)-equivariance) IS the same. The difference: AlphaFold2 is proprietary (DeepMind); Boltz is open (community). The fold absorbs the implementation; the math stays. Boltz IS the open AlphaFold2."),
        ("Boltz's diffusion head IS the SAME as image diffusion — and that's the insight", "ADR-027 (diffusion models)",
         "Boltz's structure module starts from random 3D coordinates and iteratively denoises them, conditioned on the sequence embedding. This IS the SAME math as DDPM (denoising diffusion probabilistic models) for image generation — just in 3D coordinate space instead of 2D pixel space. The reverse SDE is the same; the noise is 3D Gaussian instead of 2D Gaussian. Boltz IS DDPM for protein structures."),
        ("Boltz's SE(3)-equivariance IS the inductive bias — and it's the right one", "ADR-034 (ESM-2 + AlphaFold2)",
         "SE(3)-equivariance means: if you rotate the input, the output rotates the same way. This IS the correct inductive bias for 3D molecular structures — proteins don't have a preferred orientation. An SE(3)-equivariant network learns rotation-invariant features automatically, without data augmentation. This IS the SAME pattern as translation-invariance in CNNs (convolution = translation-equivariant). SE(3)-equivariance IS convolution for 3D rotations."),
        ("Boltz + PoseBusters IS the drug discovery pipeline — and it's open", "ADR-036 (molecular modelling)",
         "Boltz predicts protein structure; PoseBusters validates ligand poses; the combination enables structure-based drug design without AlphaFold's license. The pipeline: sequence → Boltz structure → docking → PoseBusters validation → hit compound. This IS the SAME pattern as the clinical genomics pipeline (sequence → AlphaMissense → ClinVar → report). Boltz IS the open structure layer in the open drug discovery pipeline."),
        ("Boltz's MIT license IS the right choice — and it enables innovation", "ADR-001 (platform architecture)",
         "AlphaFold2's license restricts commercial use. Boltz's MIT license allows everything. This IS the SAME pattern as open-source vs proprietary software: open enables innovation (researchers build on it), proprietary captures revenue (the owner monetizes). The pattern (open format + paid service) IS the same as Iceberg (open format) + Tabular (paid catalog). Boltz's MIT license IS the open-format strategy for protein structure prediction."),
    ],
    "cryo-em.tsx": [
        ("Cryo-EM IS the 3D FFT reconstruction — and it's the Central Slice Theorem", "ADR-027 (diffusion models)",
         "Cryo-EM reconstructs 3D protein structures from 2D projection images. The math IS the Central Slice Theorem: the 1D Fourier transform of a 2D projection = a 2D slice through the 3D Fourier transform of the object. Collect enough 2D projections at different angles → fill the 3D Fourier space → inverse FFT → 3D structure. Cryo-EM IS the inverse FFT applied to noisy 2D images. The SAME FFT that separates C-major chord notes reconstructs protein structures."),
        ("Cryo-EM's resolution IS the sampling problem — and it's the angular coverage", "ADR-022 (pgvector for variant embeddings)",
         "Cryo-EM resolution depends on: (1) number of particles (more = better averaging), (2) angular coverage (projections from all directions), (3) signal-to-noise ratio (electron dose). The angular coverage IS the sampling problem — if you only have projections from one hemisphere, the other hemisphere is unsampled (missing wedge). This IS the SAME problem as tomography (incomplete angular sampling → artifacts). The math (Nyquist-Shannon sampling theorem) IS the same. Cryo-EM IS Nyquist for 3D Fourier space."),
        ("Cryo-EM's particle picking IS object detection — same as computer vision", "ADR-024 (transformer deep dive)",
         "Cryo-EM micrographs contain hundreds of protein particles (molecular snapshots). Finding them (particle picking) IS object detection — the SAME task as finding faces in photos. CNNs (U-Net, RetinaNet) are used for particle picking. The math (convolution + anchor boxes + non-maximum suppression) IS the same. Cryo-EM particle picking IS YOLO for proteins — the SAME computer vision pipeline, just for electron micrographs instead of photos."),
        ("Cryo-EM + AlphaFold IS the convergence — and it's the right collaboration", "ADR-034 (ESM-2 + AlphaFold2)",
         "AlphaFold predicts structure from sequence (computational). Cryo-EM measures structure from images (experimental). Convergence: AlphaFold's predicted structure helps solve the cryo-EM reconstruction (molecular replacement). Cryo-EM's experimental structure validates AlphaFold's prediction. The two methods CONVERGE — each one helps the other. This IS the SAME pattern as simulation + experiment in physics: theory predicts, experiment validates, both refine."),
        ("Cryo-EM's heterogeneity analysis IS mixture modelling — and it's the right approach", "ADR-022 (pgvector for variant embeddings)",
         "Cryo-EM samples contain mixed conformational states (the protein in different shapes). Heterogeneity analysis separates these states — like separating a mixture of Gaussians. This IS the SAME math as mixture models (EM algorithm) and clustering (k-means / Lloyd's). The 3D variability analysis (3DVA) decomposes the structural heterogeneity into principal modes — the SAME SVD/PCA that recovers Out-of-Africa from genotypes. Cryo-EM heterogeneity IS PCA for protein dynamics."),
    ],
    "coevolution-dca.tsx": [
        ("Co-evolution IS the correlation matrix — and DCA finds the contacts", "ADR-024 (transformer deep dive)",
         "Direct Coupling Analysis (DCA) computes a correlation matrix from a Multiple Sequence Alignment (MSA). Co-evolving residues (positions that mutate together) are in physical contact. DCA's insight: the direct correlation (contact) is hidden behind indirect correlations (transitive chains). DCA uses the inverse covariance matrix (precision matrix) to find DIRECT contacts — the SAME math as Gaussian graphical models. DCA IS the precision matrix for protein contacts."),
        ("DCA vs Attention IS the precision-matrix vs dot-product debate", "ADR-034 (ESM-2 + AlphaFold2)",
         "DCA computes the precision matrix (inverse covariance) — O(N^3) in sequence length. Attention computes QK^T (dot product) — O(N^2). Both find contacts, but attention is faster. The trade-off: DCA is mathematically rigorous (precision matrix captures direct correlations); attention is empirically powerful (learns from data). The math (precision matrix vs dot product) IS the same debate as Lasso vs neural networks (structured vs unstructured). AlphaFold2 chose attention; DCA chose precision. Both work."),
        ("The MSA IS the evolutionary dataset — and it's the training data for both DCA and Attention", "ADR-037 (genetic materials + variant calling)",
         "Both DCA and Attention take an MSA as input. The MSA IS a matrix of amino acids (N positions × M sequences). Each row IS one organism's protein. Mutations between rows ARE the evolutionary signal. DCA computes correlations between columns (positions). Attention computes QK^T between positions. The MSA IS the dataset; DCA and Attention are two different mathematical tools applied to the same data. The dataset stays; the tool evolves."),
        ("Coevolution IS natural selection's fingerprint — and it's the contact map", "ADR-043 (AlphaMissense adoption)",
         "When two residues are in physical contact, a mutation in one is compensated by a mutation in the other (to maintain the fold). Natural selection constrains these pairs to co-vary. Co-evolution IS this constraint's fingerprint — the correlation matrix of the MSA captures it. The contact map IS the physical structure; the correlation matrix IS the evolutionary record. They ARE the same information, viewed from different angles. Co-evolution IS the bridge between sequence and structure."),
        ("DCA's PLM (pseudo-likelihood) IS the regularized estimation — and it's the right approach", "ADR-022 (pgvector for variant embeddings)",
         "DCA estimates the precision matrix using pseudo-likelihood maximization (PLM). PLM is a regularized estimator that avoids the N >> M problem (more positions than sequences). This IS the SAME pattern as Lasso regression (L1 regularization for high-dimensional problems). PLM IS Lasso for precision matrices — the math (regularized maximum likelihood) IS the same. DCA IS regularized estimation for contact prediction."),
    ],
    "agent-frameworks.tsx": [
        ("Agent frameworks IS the LLM-as-controller pattern — and it's the right abstraction", "ADR-001 (platform architecture)",
         "LangGraph/LangChain/CrewAI/AutoGen all implement: LLM decides action → tool executes → result feeds back → LLM decides next action. This IS the agent loop (ReAct: Reason + Act). The LLM IS the controller; the tools ARE the effectors; the results ARE the observations. This IS the SAME pattern as a PID controller in engineering (sense → compute → act → sense). Agent frameworks ARE PID controllers for LLMs — the pattern (feedback loop) IS the same."),
        ("LangGraph IS the state machine — and it's the right model", "ADR-050 (fold-section architecture)",
         "LangGraph models agents as state machines: nodes = LLM calls, edges = transitions, state = shared memory. The graph IS the control flow. This IS the SAME pattern as Airflow's DAG (nodes = tasks, edges = dependencies). The difference: Airflow's nodes are deterministic (SQL, Python); LangGraph's nodes are stochastic (LLM). The math (directed graph + state) IS the same. LangGraph IS Airflow for LLM agents."),
        ("Tool use IS the API call — and it's the agent's hands", "ADR-022 (pgvector for variant embeddings)",
         "Agents call tools (search, calculator, database query, code execution). Each tool IS an API call with a typed interface. The LLM decides WHICH tool to call, with WHAT arguments. This IS the SAME pattern as function calling in programming — the LLM IS the caller, the tools ARE the functions, the arguments ARE the parameters. Tool use IS function calling for LLMs — the math (dispatch + parameters + return) IS the same."),
        ("Multi-agent IS the distributed system — and it's the right scale-up", "ADR-001 (platform architecture)",
         "AutoGen/CrewAI deploy multiple agents that communicate: Agent A writes code, Agent B reviews, Agent C tests. Each agent IS a worker in a distributed system. The communication IS message passing (like microservices). The coordination IS a protocol (like consensus). Multi-agent IS distributed systems for LLMs — the pattern (workers + message passing + coordination) IS the same. The math (distributed consensus) IS the same."),
        ("Agent frameworks vs hand-coded pipelines IS the declarative vs imperative debate", "ADR-050 (fold-section architecture)",
         "Hand-coded pipeline: 'run SQL, then Python, then deploy' (imperative — you specify each step). Agent framework: 'here's the goal, here are the tools, figure it out' (declarative — the LLM decides the steps). This IS the SAME debate as SQL vs Python: SQL is declarative (say what, not how), Python is imperative (say how). Agent frameworks ARE SQL for workflows — the pattern (declarative + optimizer) IS the same. The LLM IS the query optimizer."),
    ],
    "enhanced-sampling.tsx": [
        ("Enhanced sampling IS the explore-exploit trade-off — and it's multi-armed bandit", "ADR-006 (RL agentic)",
         "MD simulations get stuck in local minima (exploit). Enhanced sampling methods (metadynamics, replica exchange, umbrella sampling) push the simulation to explore new minima. This IS the explore-exploit trade-off from RL. Replica exchange (run N simulations at different temperatures, swap) IS the multi-armed bandit: high-T replicas explore, low-T replicas exploit. Thompson sampling IS Bayesian enhanced sampling. The math (explore vs exploit) IS the same."),
        ("Metadynamics IS adaptive biasing — and it's the right approach", "ADR-050 (fold-section architecture)",
         "Metadynamics adds history-dependent biasing potentials to the simulation. As the system visits a region, the bias increases (pushing it away to explore new regions). This IS adaptive biasing — the bias LEARNS from the simulation's history. The math (adaptive bias + free energy reconstruction) IS the SAME as adaptive importance sampling in Monte Carlo. Metadynamics IS adaptive MC for molecular simulation."),
        ("Replica exchange IS parallel tempering — and it's the right parallelisation", "ADR-034 (ESM-2 + AlphaFold2)",
         "Replica exchange runs N simulations at temperatures T1 < T2 < ... < TN. Periodically, adjacent replicas swap configurations (if the swap is thermodynamically favorable). High-T replicas cross energy barriers (explore); low-T replicas find local minima (exploit). The swap IS a Metropolis-Hastings move in temperature space. This IS the SAME math as MCMC (accept/reject based on energy). Replica exchange IS parallel MCMC in temperature space."),
        ("Markov State Models (MSMs) ARE the discretisation of MD — and they're the right coarse-graining", "ADR-022 (pgvector for variant embeddings)",
         "MSMs discretize the continuous MD trajectory into N conformational states. The transition matrix P[i][j] = probability of going from state i to state j. This IS a Markov chain — the SAME equation (π(t+1) = π(t)·P) that models credit ratings and port states. The stationary distribution gives the equilibrium populations. MSMs ARE the Markov chain card applied to molecular dynamics. The math (transition matrix + stationary distribution) IS the same."),
        ("Enhanced sampling + MSMs = the full picture — and it's the fold pattern", "ADR-050 (fold-section architecture)",
         "Enhanced sampling generates the trajectories (exploration). MSMs analyse the trajectories (understanding). Together, they form the complete picture: explore the free-energy landscape, then model the kinetics. This IS the fold pattern: enhanced sampling IS the 'brief' (generate data), MSMs ARE the 'deeper thought' (understand the data). The two are complementary — one generates, one analyses. The pattern (generate + analyse) IS the same as ML training (forward pass) + evaluation (metrics)."),
    ],
    "diffusion-models-deep-dive.tsx": [
        ("Diffusion IS the reverse SDE — and it's the right math for generation", "ADR-027 (diffusion models)",
         "Diffusion models learn to reverse a stochastic differential equation (SDE). Forward: add noise to data (x₀ → x_T). Reverse: denoise (x_T → x₀). The forward SDE is dx = -β(t)x dt + √(2β(t)) dW. The reverse SDE is dx = [-β(t)x - β(t)∇log p(x)] dt + √(2β(t)) dW. The score function ∇log p(x) IS what the neural network learns. Diffusion IS the reverse SDE — the SAME math as Brownian motion, just reversed in time."),
        ("The score function IS the gradient of the log-density — and it's the universal object", "ADR-034 (ESM-2 + AlphaFold2)",
         "The score function ∇log p(x) tells you: 'which direction increases the probability density?' Following the score IS gradient ascent on p(x) — climbing toward the mode. This IS the SAME math as gradient descent (θ(t+1) = θ(t) - η∇L(θ)), just applied to the data distribution instead of the loss landscape. The score IS the gradient of the data distribution; the loss gradient IS the gradient of the model. The math (steepest ascent/descent) IS the same."),
        ("DDPM IS the discrete version — and it's the practical implementation", "ADR-027 (diffusion models)",
         "DDPM (Ho et al. 2020) discretizes the continuous SDE into T steps (T=1000). Each step: x_{t-1} = μ(x_t, t) + σ(t)·z. The network predicts μ (the mean). This IS the Euler-Maruyama method for SDEs — the SAME integrator that simulates GBM for financial Monte Carlo. DDPM IS Euler-Maruyama applied to the reverse SDE. The math (discretize SDE + predict drift) IS the same. The application (image generation vs option pricing) differs."),
        ("Classifier-free guidance IS the conditional generation trick — and it's the insight", "ADR-027 (diffusion models)",
         "Classifier-free guidance generates: ε_pred = (1+w)·ε_cond - w·ε_uncond. The w (guidance scale) controls how much the generation follows the condition. w=0: unconditioned (random). w=1: standard. w=7.5 (typical): strong guidance. This IS the SAME pattern as temperature in softmax: T=0 → deterministic, T=∞ → uniform. Classifier-free guidance IS temperature for conditional generation — the math (interpolation between conditional and unconditional) IS the same."),
        ("Diffusion vs GANs IS the likelihood-based vs adversarial debate — and likelihood wins", "ADR-050 (fold-section architecture)",
         "GANs (2014) generate via adversarial training (generator vs discriminator). Diffusion (2020) generates via likelihood maximization (reverse SDE). GANs are fast (1 forward pass) but unstable (mode collapse). Diffusion is slow (1000 steps) but stable (covers all modes). The trade-off (speed vs stability) IS the same as deterministic vs stochastic. The math (min-max game vs score matching) differs; the goal (generate realistic data) IS the same. Diffusion won because stability IS more valuable than speed."),
    ],
    "fine-tuning-deep-dive.tsx": [
        ("Fine-tuning IS transfer learning — and it's the right pattern", "ADR-034 (ESM-2 + AlphaFold2)",
         "Fine-tuning takes a pre-trained model (trained on general data) and adapts it to a specific task (trained on task-specific data). This IS transfer learning: the general features (learned during pre-training) transfer to the specific task. The math (gradient descent on the task-specific loss, starting from pre-trained weights) IS the SAME as gradient descent from random initialization — just with a better starting point. Fine-tuning IS gradient descent with a head start."),
        ("LoRA IS the low-rank adaptation — and it's the right decomposition", "ADR-022 (pgvector for variant embeddings)",
         "LoRA (Low-Rank Adaptation) approximates the weight update ΔW = A·B where A is (d, r) and B is (r, d) with r << d. This IS a low-rank approximation — the SAME math as truncated SVD (keep only the top-r singular values). The insight: weight updates during fine-tuning ARE low-rank (most of the information is in the pre-trained weights; the fine-tuning only adjusts a few directions). LoRA IS truncated SVD for weight updates — the math (low-rank approximation) IS the same."),
        ("PEFT (Parameter-Efficient Fine-Tuning) IS the fold pattern for models", "ADR-050 (fold-section architecture)",
         "Full fine-tuning updates ALL parameters (175B for GPT-3). PEFT (LoRA, adapters, prefix tuning) updates only 0.1-1% of parameters. This IS the fold pattern: full fine-tuning IS the 'brief' (all parameters visible); PEFT IS the 'deeper thought' (only the essential parameters updated). The pattern (summary + details) IS the same. PEFT IS the fold pattern for neural networks — the math (low-rank + sparsity) IS the right decomposition."),
        ("Fine-tuning vs RAG IS the update-the-model vs update-the-context debate", "ADR-033 (multimodal RAG)",
         "RAG retrieves relevant documents and includes them in the prompt (no weight changes). Fine-tuning changes the model's weights (no retrieval). The trade-off: RAG is fast to update (add documents) but limited by context window. Fine-tuning is slow to update (retrain) but unlimited by context. The pattern (context vs weights) IS the same as cache vs compute: RAG IS cache (fast retrieval), fine-tuning IS compute (slow but unlimited). Both are needed."),
        ("Instruction tuning IS the alignment step — and it's the RLHF pattern", "ADR-006 (RL agentic)",
         "Instruction tuning (SFT + RLHF) aligns the model to follow instructions. SFT (Supervised Fine-Tuning) teaches the model what to say. RLHF (Reinforcement Learning from Human Feedback) teaches the model what humans prefer. The RL in RLHF IS the SAME math as the RL-agentic page: policy gradient (PPO) on the reward model. The reward IS human preference. RLHF IS the RL card applied to language model alignment. The math (policy gradient + reward) IS the same."),
    ],
    "starrocks.tsx": [
        ("StarRocks IS the real-time data warehouse — and it's the right design", "ADR-001 (platform architecture)",
         "StarRocks combines: columnar storage (fast scans), vectorized execution (SIMD), real-time ingestion (from Kafka/Flink), and sub-second queries. This IS the SAME pattern as Pinot (real-time analytics) but with full SQL (JOIN, subquery, CTE). StarRocks IS Pinot + full SQL — the pattern (columnar + real-time + SQL) IS the same. The difference: Pinot is OLAP-only (analytics); StarRocks also supports OLTP-like workloads (point queries)."),
        ("StarRocks' pipeline engine IS the push-based execution — and it's the right model", "ADR-050 (fold-section architecture)",
         "Traditional query engines use pull-based execution (Volcano model: parent calls next() on child). StarRocks uses push-based execution (pipeline: data flows from source to sink without next() calls). This eliminates function call overhead (millions of next() calls per query) and enables better pipelining. The pattern (push vs pull) IS the same as reactive programming (push: Observable.onNext) vs imperative (pull: Iterator.next). StarRocks IS reactive programming for query engines."),
        ("StarRocks' materialized view IS the pre-computation — and it's the right optimization", "ADR-022 (pgvector for variant embeddings)",
         "StarRocks automatically maintains materialized views (pre-computed aggregates). When a query matches a materialized view, the planner rewrites the query to use the view. This IS the SAME pattern as Pinot's star-tree index (pre-compute aggregates at ingestion). The math (query rewriting + view matching) IS the same as the database query optimizer (rule-based + cost-based rewriting). StarRocks' MV IS the star-tree for SQL."),
        ("StarRocks vs ClickHouse IS the SQL vs raw-speed debate", "ADR-050 (fold-section architecture)",
         "ClickHouse is faster for simple scans (10x for SELECT * WHERE x > 10). StarRocks is faster for complex queries (JOIN, subquery, CTE). The trade-off (raw scan speed vs SQL expressiveness) IS the same as NoSQL vs SQL: NoSQL is faster for simple key-value; SQL is more expressive for complex analytics. StarRocks IS SQL-first; ClickHouse IS scan-first. Both are valid; the workload determines the winner."),
        ("StarRocks' data cache IS the local SSD tier — and it's the right caching layer", "ADR-001 (platform architecture)",
         "StarRocks caches hot data on local NVMe SSD (data cache). When a query needs a block, it checks: local SSD cache → shared storage (S3/HDFS). This IS the SAME pattern as CPU L1/L2/L3 cache hierarchy: L1 = memory, L2 = local SSD, L3 = shared storage. The data cache IS the L2 cache for queries. The pattern (multi-tier cache + locality) IS the same. StarRocks IS multi-tier caching for query engines."),
    ],
}


def replace_generic_thoughts(page_filename, new_thoughts):
    path = PAGES_DIR / page_filename
    if not path.exists():
        return False, "file not found"
    src = path.read_text()
    has_generic = any(gt in src for gt in GENERIC_TITLES)
    if not has_generic:
        return False, "no generic thoughts"
    page_name = page_filename.replace(".tsx", "").replace("-", " ").title()
    jsx = f'<DeeperThoughtSection pageTitle="{page_name}">\n'
    for title, adr, content in new_thoughts:
        title_e = title.replace('"', '\\"')
        adr_e = adr.replace('"', '\\"')
        content_e = content.replace('"', '\\"').replace('\n', ' ')
        jsx += f'        <DeeperThought title="{title_e}" connectedTo="{adr_e}">\n'
        jsx += f'          <p>{{"{content_e}"}}</p>\n'
        jsx += f'        </DeeperThought>\n'
    jsx += f'      </DeeperThoughtSection>'
    pattern = r'<DeeperThoughtSection[^>]*>[\s\S]*?</DeeperThoughtSection>'
    match = re.search(pattern, src)
    if match:
        src = src[:match.start()] + jsx + src[match.end():]
        path.write_text(src)
        return True, f"replaced {len(new_thoughts)} thoughts"
    return False, "DeeperThoughtSection not found"


def main():
    total = 0
    for page_filename, thoughts in UPGRADES.items():
        ok, msg = replace_generic_thoughts(page_filename, thoughts)
        if ok:
            total += 1
            print(f"  + {page_filename}: {msg}")
        else:
            print(f"  = {page_filename}: {msg}")
    print(f"\nUpgraded {total} pages with page-specific thoughts.")


if __name__ == "__main__":
    main()
