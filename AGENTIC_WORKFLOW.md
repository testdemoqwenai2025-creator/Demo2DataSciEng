# ModernDataSciEng Platform — Agentic Workflow Design

How AI agents fit into a modern, governed data platform. The platform today is largely deterministic — pipelines run on schedules, DQ rules fire on data, observability alerts page humans. The FY26 v3.0 roadmap moves toward an **agentic** operating model where LLM-backed agents participate in every layer.

> **Synthetic disclaimer**: this is a reference design, not a deployed system. All numbers, models and behaviours are hypothetical.

---

## Agentic operating model

### Today (v2.4 — deterministic)

```
Schedule → DAG → PySpark/dbt → Tests → Materialised tables → BI/Hightouch
                              ↓
                      Observability alerts → Human on-call
```

### Future (v3.0 — agentic)

```
Schedule → DAG → PySpark/dbt → Tests → Materialised tables → BI/Hightouch
                              ↓
              ┌───────────────┴────────────────┐
              ▼                                ▼
      Observability alerts              Agentic triage layer
      (Monte Carlo + OpenLineage)       (LangGraph + LLM)
              │                                │
              │                                ▼
              │              ┌─────────────────┴──────────────┐
              │              ▼                                   ▼
              │       Auto-investigate anomaly        Auto-generate fix PR
              │       (read lineage + tests +           (dbt model + test)
              │        sample data + docs)
              │              │                                │
              │              ▼                                ▼
              │       Classify: known/unknown        Open PR + slim CI run
              │       │                                │
              │       ├─ Known → auto-resolve         │
              │       └─ Unknown → page human         │
              │                                │
              └──────────────►  Audit log  ◄──────────┘
                                │
                                ▼
                       Human review (every PR, every auto-resolve)
```

---

## Agent inventory

Each agent has a narrow scope, a tool inventory, and a hard requirement for human approval before any production change.

### 1. DQ Triage Agent (LangGraph)

**Purpose**: When Monte Carlo or dbt test raises an alert, investigate it: read lineage, sample affected rows, look at recent schema changes, propose a root cause.

**Tools**:
- `read_lineage(table_name)` → OpenLineage API
- `sample_rows(table, where_clause)` → Snowflake / Databricks query
- `read_recent_adrs(topic)` → search ADRs for similar past incidents
- `search_dbt_docs(metric)` → dbt docs API
- `propose_root_cause(analysis)` → LLM final step

**Approval required before**: any production write.

**Outputs**:
- Slack message to #data-platform with root cause + suggested fix
- Auto-filed Jira ticket with full investigation trace
- If known pattern (e.g. "schema drift column added"), open schema-registry PR

### 2. Schema Drift PR Agent

**Purpose**: When Fivetran reports schema drift (column added/removed/type changed), generate the schema-registry PR.

**Tools**:
- `read_fivetran_metadata(connector_id)` → Fivetran API
- `read_bronze_table_schema(table)` → Unity Catalogue API
- `find_affected_dbt_models(column)` → OpenLineage reverse traversal
- `generate_dbt_yml_patch(model, new_columns)` → LLM generates YAML

**Approval required before**: merge.

**Outputs**:
- Auto-opened PR with: schema-registry YAML update, dbt model YAML update, DQ test stub for new column, CODEOWNERS ping for review

### 3. Cost Optimisation Agent

**Purpose**: Daily review of cost telemetry. Spot anomalies (e.g. WH_DBT_TRANSFORM burning 2.3× baseline) and propose right-sizing or Z-ORDER refresh.

**Tools**:
- `read_snowflake_account_usage(days)` → Snowflake `SNOWFLAKE.ACCOUNT_USAGE` views
- `read_databricks_job_runs(days)` → Databricks API
- `find_expensive_queries(top_n)` → sort by credits
- `propose_right_sizing(wh, current, p95)` → LLM proposes warehouse resize

**Approval required before**: any warehouse resize or cluster policy change.

**Outputs**:
- Daily cost digest in Slack
- Terraform PRs pre-staged (one per right-sizing recommendation)
- FinOps weekly summary

### 4. Semantic Query Agent (Snowflake Cortex)

**Purpose**: Natural-language queries on top of certified Gold datasets. "What was revenue by channel last quarter?" → SQL → result.

**Tools**:
- `list_certified_datasets()` → Tableau Catalog API
- `read_semantic_entities()` → MetricFlow API
- `generate_sql(question, entities)` → Cortex LLM
- `execute_sql(sql)` → Snowflake (read-only service user)

**Approval required before**: any write query (denied by default).

**Outputs**:
- Conversational interface for non-technical users
- Each query logged with: question, generated SQL, result, latency
- Hallucination guard: SQL must only reference certified Gold datasets; otherwise reject

### 5. Documentation Agent

**Purpose**: Keep docs in sync with code. When a dbt model changes, regenerate docs; when an ADR is added, link it from relevant pages.

**Tools**:
- `diff_dbt_manifests(old, new)` → identify changed models
- `read_model_code(model)` → dbt project files
- `generate_doc_update(model, change)` → LLM
- `update_markdown(file, patch)` → git commit

**Approval required before**: any commit to docs.

**Outputs**:
- Auto-PRs for dbt docs regeneration
- ADR cross-link suggestions
- README staleness alerts

---

## Agent guardrails (non-negotiable)

1. **No production writes without human approval.** Agents can open PRs, never merge them.
2. **Read-only by default.** Agent service users have SELECT-only grants on Bronze/Silver/Gold. Writes go through the existing CI/CD pipeline.
3. **Audit every action.** Every agent step is logged with: agent ID, input, tools called, LLM prompt, LLM output, action taken. Logs go to Datadog + immutable S3 bucket.
4. **Cost cap.** Each agent has a daily LLM-token budget; exceeding pauses the agent and pages a human.
5. **Hallucination guard.** SQL-generating agents can only reference certified Gold datasets and semantic entities. Out-of-scope references → reject.
6. **Fallback to human.** Any agent that hits retry exhaustion or an unknown pattern escalates to a human with full investigation trace.
7. **PII never leaves the warehouse.** Agents sample rows but PII columns are masked at the Unity Catalogue layer; LLMs only see masked values.
8. **Versioned prompts.** All agent system prompts are versioned in Git; prompt changes go through PR review.

---

## Agentic vs deterministic — when to use which

| Pattern | Deterministic today | Agentic future | Why |
| --- | --- | --- | --- |
| Bronze→Silver conformance | Yes | No | Deterministic, well-understood; agents add risk without value |
| DQ test execution | Yes | No | Tests are deterministic by design |
| DQ alert triage | Human | **Yes** | Open-ended investigation; LLMs excel at pattern matching across lineage + schema + history |
| Schema drift handling | PR by human | **Yes (PR draft)** | Mechanical YAML generation; LLMs do it consistently |
| Cost right-sizing | Quarterly review | **Yes (daily)** | Continuous telemetry + LLM proposes; human approves |
| Semantic Q&A for analysts | Build a dashboard | **Yes** | Natural-language → SQL → result; LLMs are good at this |
| Pipeline generation | Engineer writes dbt model | **Yes (draft)** | LLM drafts model + tests from spec; engineer reviews |
| Pipeline failure recovery | Airflow retries → human | **Yes (triage)** | LLM reads logs + lineage + recent changes; proposes fix |
| Onboarding new source | Engineer writes ADR + Terraform + Fivetran config | **Yes (drafts)** | LLM drafts all artifacts; engineer reviews |

---

## Implementation sketch (LangGraph)

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Optional

class TriageState(TypedDict):
    anomaly_id: str
    signal: str
    layer: str
    severity: str
    lineage: Optional[dict]
    sample_rows: Optional[list]
    recent_changes: Optional[list]
    root_cause: Optional[str]
    proposed_fix: Optional[str]
    known_pattern: bool
    pr_url: Optional[str]
    steps_taken: List[str]

def read_lineage(state):
    state["lineage"] = call_openlineage(state["signal"])
    state["steps_taken"].append("read_lineage")
    return state

def sample_affected_rows(state):
    state["sample_rows"] = call_snowflake_sample(state["lineage"])
    state["steps_taken"].append("sample_rows")
    return state

def find_recent_changes(state):
    state["recent_changes"] = call_git_log(state["lineage"])
    state["steps_taken"].append("find_recent_changes")
    return state

def classify(state):
    """LLM step: is this a known pattern?"""
    state["known_pattern"], state["root_cause"] = llm_classify(state)
    state["steps_taken"].append("classify")
    return state

def route(state):
    if state["known_pattern"]:
        return "auto_fix"
    return "page_human"

def auto_fix(state):
    state["pr_url"] = open_schema_registry_pr(state)
    state["steps_taken"].append("auto_fix")
    return state

def page_human(state):
    slack_notify(state)
    jira_file(state)
    state["steps_taken"].append("page_human")
    return state

# Build graph
graph = StateGraph(TriageState)
graph.add_node("read_lineage", read_lineage)
graph.add_node("sample_rows", sample_affected_rows)
graph.add_node("find_changes", find_recent_changes)
graph.add_node("classify", classify)
graph.add_node("auto_fix", auto_fix)
graph.add_node("page_human", page_human)

graph.set_entry_point("read_lineage")
graph.add_edge("read_lineage", "sample_rows")
graph.add_edge("sample_rows", "find_changes")
graph.add_edge("find_changes", "classify")
graph.add_conditional_edges("classify", route, {
    "auto_fix": "auto_fix",
    "page_human": "page_human",
})
graph.add_edge("auto_fix", END)
graph.add_edge("page_human", END)

app = graph.compile()
```

---

## Roadmap alignment

This document underpins the **v3.0 (FY26) "Agentic era"** milestone on the Evolution page. The roadmap items there — agentic DQ, LLM-based schema registry, autonomous right-sizing — all reference agents described here.

**Hypothesis**: agents will reduce on-call load by 60% and pipeline delivery time from 2 weeks to 2 days.

**Risk**: agents making schema changes autonomously. Mitigation: human approval required for every PR; audit log immutable; cost cap enforced.
