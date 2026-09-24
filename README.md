# ModernDataSciEng Platform

A scalable, governed data platform reference architecture — built as a multi-page application (MPA) showcasing a complete, single-source-of-truth analytics stack for a hypothetical omnichannel retailer (ModernDataSciEng Ltd).

> **Synthetic data disclaimer:** every number, schema, pipeline, dashboard and business name in this reference is **synthetic and hypothetical**. No real personal data is processed, stored or transmitted. See the in-app **About & Compliance** page for full GDPR details.

## Live preview (24/7/365)

The platform is deployed to GitHub Pages from the public mirror repo. Anyone can browse the latest state without signing an NDA:

### <https://testdemoqwenai2025-creator.github.io/DemoAppDataSci/>

Bookmark this URL — it updates automatically on every push to `main` via the GitHub Actions deploy workflow in `.github/workflows/deploy-pages.yml`. No dev server required.

> **Note**: the agentic DQ triage feature (`/api/agent-triage`) requires a runtime backend and is only available on the dev preview, not on the static GitHub Pages site. The Live Dashboard's anomaly feed still ticks on Pages — but agent hypothesis cards fall back to a deterministic stub when the API is unavailable.

## What's inside

A 15-page MPA covering every layer of a modern data platform + a Knowledge Loop that closes the circuit between academic research and production architecture:

### Architecture pages (11)

| Page | Scope |
| --- | --- |
| **Overview** | Executive KPIs, mini architecture, design principles, search box, Get Started CTA |
| **Reference Architecture** | End-to-end sources → Bronze → Silver → Gold → consumption diagram |
| **Fivetran & Hightouch** | ELT ingestion (14 sources) + reverse-ETL activation (5 audiences) |
| **Databricks Lakehouse** | PySpark, Delta Lake, Medallion (Bronze/Silver/Gold), Photon runtime |
| **Snowflake & SQL** | Multi-cluster warehouses, RBAC, Gold serving views, cluster keys |
| **dbt & Dimensional Modelling** | 312 models, 1,184 tests, SCD2, MetricFlow semantic layer, slim CI |
| **Orchestration** | Airflow DAGs + Dagster asset graph, SLA monitoring |
| **Tableau & Analytics** | Certified datasets, RLS, sample dashboards |
| **Data Governance & Observability** | Unity Catalogue, Monte Carlo, OpenLineage |
| **CI/CD & DevOps** | Git trunk flow, GitHub Actions, Terraform, OIDC, FinOps |
| **About & Compliance** | Mission, synthetic-data disclaimer, GDPR rights table, contact, repo links |

### Knowledge Loop pages (4)

| Page | Scope |
| --- | --- |
| **Knowledge Hub** | 12 Architecture Decision Records, 8 reusable patterns, 4 trade-off matrices, 10 Knowledge Shorts |
| **Live Dashboard** | Synthetic real-time observatory — pipeline runs tick every 3s, cost meter, anomaly feed, **agentic DQ triage agent** wired into every anomaly, what-if simulator |
| **Evolution Timeline** | Versioned history v1.0 → v3.0, technology radar (29 items), 4-horizon future roadmap |
| **Research Papers** | 16 academic foundations (MapReduce, RDDs, Delta Lake, Kimball, Lakehouse, OpenLineage…), interactive citation graph |

### The Knowledge Loop

```
Research → Knowledge → Architecture → Dashboard → back to Research
```

Papers inspire patterns. Patterns become architecture. Architecture is observed in the live dashboard. Observations drive new research. The platform is never finished — it's an ongoing conversation between theory and production.

## Tech stack

- **Framework:** Next.js 16 (App Router) + TypeScript 5
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Charts:** Recharts
- **Theme:** next-themes (light/dark toggle on every page)
- **Agentic layer:** z-ai-web-dev-sdk (GLM-4-Plus LLM) via `/api/agent-triage`

## Repositories

| Repository | Visibility | Purpose | URL |
| --- | --- | --- | --- |
| `AppDataSci-Advanced` | **Private** | Source of truth — development & modifications happen here | <https://github.com/testdemoqwenai2025-creator/AppDataSci-Advanced> |
| `DemoAppDataSci` | **Public** | Preview mirror — anyone can browse without an NDA | <https://github.com/testdemoqwenai2025-creator/DemoAppDataSci> |
| `DemoAppDataSci` Pages site | **Public** | 24/7/365 live preview | <https://testdemoqwenai2025-creator.github.io/DemoAppDataSci/> |

### Sync + deploy workflows

Two GitHub Actions workflows run on the private repo:

1. **`sync-to-public.yml`** — on every push to `main`, force-pushes the commit to the public repo. The public preview always reflects the latest state of the advanced repo, with no manual intervention.
2. **`deploy-pages.yml`** (on the public repo, mirrored from private) — on every push to `main` on the public repo, builds the static export with `GITHUB_PAGES=true` (basePath `/DemoAppDataSci`) and deploys to GitHub Pages via the official `actions/deploy-pages` action.

## Getting started (local dev)

```bash
bun install
bun run dev              # http://localhost:3000  (full preview incl. agent API)
bun run lint
bun run build:static     # static export with GITHUB_PAGES=true for Pages-style build
```

**Demo login** (on the Sign in button in the header):
- Username: `admin`
- Password: `admin`
- Or click "Auto-fill & sign in" — the form pre-fills and submits in one click.

## Project PDF

A 6-page project PDF lives at [`download/ModernDataSciEng-Platform.pdf`](./download/ModernDataSciEng-Platform.pdf). It covers executive summary, reference architecture, the 15 pages, the Knowledge Loop, GDPR compliance, future technology thoughts, and contact. Generated by `scripts/generate-project-pdf.py`.

## Companion docs in repo root

- [`SKILLS.md`](./SKILLS.md) — 18-capability skills matrix, 4 role profiles, FY25 skills under development
- [`AGENTIC_WORKFLOW.md`](./AGENTIC_WORKFLOW.md) — Today (deterministic) vs Future (agentic) operating models, 5 agent designs, 8 guardrails, LangGraph sketch
- [`FUTURE_TECH.md`](./FUTURE_TECH.md) — 24-36 month technology watch list across 8 categories, with explicit "what I'm NOT betting on" section
- [`worklog.md`](./worklog.md) — append-only multi-agent work log

## Contact

- Email: `testdemoqwenai2025@gmail.com`
- GitHub: [@testdemoqwenai2025-creator](https://github.com/testdemoqwenai2025-creator)
- Live preview: <https://testdemoqwenai2025-creator.github.io/DemoAppDataSci/>

## Licence

Reference / educational use. Synthetic data only. © ModernDataSciEng Ltd (fictional).
