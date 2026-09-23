# ModernDataSciEng Platform

A scalable, governed data platform reference architecture — built as a multi-page application (MPA) showcasing a complete, single-source-of-truth analytics stack for a hypothetical omnichannel retailer (ModernDataSciEng Ltd).

> **Synthetic data disclaimer:** every number, schema, pipeline, dashboard and business name in this reference is **synthetic and hypothetical**. No real personal data is processed, stored or transmitted. See the in-app **About & Compliance** page for full GDPR details.

## What's inside

A 10-page MPA covering every layer of a modern data platform:

| Page | Scope |
| --- | --- |
| **Overview** | Executive KPIs, mini architecture, design principles |
| **Reference Architecture** | End-to-end sources → Bronze → Silver → Gold → consumption diagram |
| **Fivetran & Hightouch** | ELT ingestion (14 sources) + reverse-ETL activation |
| **Databricks Lakehouse** | PySpark, Delta Lake, Medallion (Bronze/Silver/Gold) |
| **Snowflake & SQL** | Multi-cluster warehouses, RBAC, Gold serving views |
| **dbt & Dimensional Modelling** | 312 models, 1,184 tests, SCD2, MetricFlow semantic layer |
| **Orchestration** | Airflow DAGs + Dagster asset graph, SLA monitoring |
| **Tableau & Analytics** | Certified datasets, RLS, sample dashboards |
| **Data Governance & Observability** | Unity Catalogue, Monte Carlo, OpenLineage |
| **CI/CD & DevOps** | Git trunk flow, GitHub Actions, Terraform, OIDC |
| **About & Compliance** | Mission, GDPR, contact, repository links |

## Tech stack

- **Framework:** Next.js 16 (App Router) + TypeScript 5
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Charts:** Recharts
- **Theme:** next-themes (light/dark on every page)

## Repositories

| Repository | Visibility | Purpose |
| --- | --- | --- |
| [`AppDataSci-Advanced`](https://github.com/testdemoqwenai2025-creator/AppDataSci-Advanced) | **Private** | Source of truth — development & modifications happen here |
| [`DemoAppDataSci`](https://github.com/testdemoqwenai2025-creator/DemoAppDataSci) | **Public** | Preview mirror — anyone can browse without an NDA |

### Sync workflow

A GitHub Actions workflow in the private repo mirrors every push to `main` into the public repo. The public preview therefore always reflects the latest state of the advanced repo, with no manual intervention.

## Getting started

```bash
bun install
bun run dev      # http://localhost:3000
bun run lint
```

## Contact

- Email: `testdemoqwenai2025-creator@users.noreply.github.com`
- GitHub: [@testdemoqwenai2025-creator](https://github.com/testdemoqwenai2025-creator)

## Licence

Reference / educational use. Synthetic data only. © ModernDataSciEng Ltd (fictional).
