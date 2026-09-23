# ModernDataSciEng Platform — Skills & Capabilities

A living inventory of the skills, capabilities and competencies embodied by this reference platform. Each skill maps to one or more pages of the application so you can see it in context.

> **Synthetic disclaimer**: every number, schema, pipeline and dashboard in this platform is hypothetical. See the in-app About page for full details.

---

## Skill matrix

| Capability | Skills | Tooling | App page |
| --- | --- | --- | --- |
| **Data warehousing** | Multi-cluster compute, RLS, secure sharing, resource monitors, search optimisation, cluster keys | Snowflake | `#/snowflake` |
| **Lakehouse engineering** | Delta Lake, ACID, time travel, Z-ORDER, MERGE, change data feed, Photon runtime | Databricks, Delta Lake | `#/databricks` |
| **Medallion architecture** | Bronze (raw, append-only) → Silver (conformed) → Gold (dimensional), idempotent MERGE | Databricks + dbt | `#/databricks`, `#/dbt` |
| **Dimensional modelling** | Star schemas, SCD Types 1/2/3/6, conformed dimensions, fact table grains | dbt + Kimball methodology | `#/dbt` |
| **Transformation engineering** | Staging → Intermediate → Marts → Serving, slim CI, state-aware promotion | dbt Core + dbt Cloud | `#/dbt`, `#/cicd` |
| **Semantic layer** | MetricFlow, measures, dimensions, entities, derived metrics | dbt MetricFlow | `#/dbt`, `#/tableau` |
| **ELT ingestion** | Schema-on-read, log-based CDC, connector management, schema drift handling | Fivetran | `#/fivetran-hightouch` |
| **Reverse-ETL activation** | SQL models, audience upserts, PII masking, sync schedules | Hightouch | `#/fivetran-hightouch` |
| **Orchestration** | DAGs, asset graphs, SLA monitoring, retries, circuit-breakers, partition-aware backfill | Airflow + Dagster | `#/orchestration` |
| **Analytics enablement** | Certified datasets, self-service, RLS via session context, embedded analytics, alerting | Tableau Server + Catalog | `#/tableau` |
| **Data governance** | Column-level RBAC, PII tagging, dynamic view redaction, audit, lineage | Unity Catalogue, Immuta | `#/governance` |
| **Data quality** | Generic + custom + relationships tests, freshness SLAs, anomaly detection | dbt tests + Great Expectations + Monte Carlo | `#/governance`, `#/dbt` |
| **Observability** | Volume / freshness / schema drift monitors, cost attribution, SLO reviews | Monte Carlo + OpenLineage + Datadog | `#/governance`, `#/dashboard` |
| **DevOps for data** | Trunk-based Git, slim CI, OIDC, Terraform-as-code, blue/green dbt, runbooks | GitHub Actions + Terraform | `#/cicd` |
| **FinOps** | Multi-cluster autoscale, auto-suspend, Z-ORDER, cluster pools, cost-per-task attribution | Databricks + Snowflake + custom | `#/cicd`, `#/snowflake` |
| **Cloud platform** | Azure primary, AWS DR, multi-region replication, ADLS Gen2, S3, OIDC workload identity | Azure + AWS | `#/architecture` |
| **Knowledge engineering** | Architecture Decision Records, pattern library, trade-off matrices, citation graphs | Custom (this app) | `#/knowledge`, `#/research`, `#/evolution` |
| **Live observability** | Real-time synthetic pipeline runs, anomaly feeds, what-if simulators | Custom (this app) | `#/dashboard` |

---

## Skill profiles

### Data Engineer

**Primary skills**: Lakehouse engineering, Medallion architecture, PySpark, Delta MERGE, idempotent pipelines, Airflow DAGs, dbt models, SCD2, CI/CD.

**Reference pages**: `#/databricks`, `#/dbt`, `#/orchestration`, `#/cicd`

**Sample task**: Build a new Bronze→Silver conformance pipeline for a new source system. Write the PySpark DLT notebook, register the Unity Catalogue grants, add a dbt intermediate model + Gold mart, write 8 tests, wire the Airflow DAG, add a slim CI selector, document an ADR.

### Analytics Engineer

**Primary skills**: dbt modelling, dimensional modelling, semantic layer, SCD2 snapshots, tests, dbt docs, metric design.

**Reference pages**: `#/dbt`, `#/tableau`, `#/knowledge`

**Sample task**: Add a new metric (Repeat Purchase Rate) to the semantic layer. Compose the derived metric in MetricFlow YAML, add tests, validate via dbt build --select state:modified+, expose to Tableau + Hightouch, update the docs site.

### Data Platform Engineer

**Primary skills**: Terraform, GitHub Actions, OIDC, Snowflake warehouse sizing, Databricks cluster policies, Unity Catalogue, OpenLineage.

**Reference pages**: `#/snowflake`, `#/databricks`, `#/governance`, `#/cicd`

**Sample task**: Onboard a new cloud account. Terraform module for Snowflake + Databricks + S3, OIDC for GitHub Actions, Datadog integration, cost monitor, DR replication, runbook.

### Analytics Consumer

**Primary skills**: Certified datasets, RLS context, self-service BI, semantic entities, alerting.

**Reference pages**: `#/tableau`, `#/dbt`

**Sample task**: Build a new dashboard for the Q4 board. Pick a certified Gold dataset, use semantic entities (avoid raw SQL), subscribe for daily email, set a threshold alert for returns rate > 7%, document the audience in the About page.

---

## Skills under development (FY25 roadmap)

| Skill | Status | Notes |
| --- | --- | --- |
| Streaming-first Bronze (Kafka + Delta CDF) | Trial | Spark Structured Streaming, watermarking, idempotent MERGE on CDF |
| Agentic DQ triage (LangGraph + LLM) | Assess | Multi-step agents for anomaly investigation + auto-PR for fixes |
| Snowflake Cortex (in-warehouse LLM) | Assess | Semantic Q&A on top of certified Gold datasets |
| Delta UniForm (Iceberg interop) | Assess | Open format choice for downstream consumers |
| DuckDB in CI | Assess | 4× faster dbt CI for small models |
| Vector search on platform docs | Assess | RAG on dbt docs + ADRs for onboarding |
| Federated semantic layer (Cube + MetricFlow) | Assess | Cross-org metric consistency |

Full roadmap is on the `#/evolution` page; tech radar is on the same page.

---

## How to demonstrate a skill

1. **Open the relevant page** in the app — every page demonstrates the skill in production.
2. **Read the code blocks** — they're real, copy-paste-runnable patterns.
3. **Cross-reference the Knowledge Hub** — every pattern has a related ADR.
4. **Read the Research page** — every architectural choice has an academic foundation.
5. **Watch the dashboard** — the live ticker shows the skill operating in (synthetic) production.
