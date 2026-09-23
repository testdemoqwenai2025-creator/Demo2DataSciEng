"use client";

import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import {
  Boxes, Layers, GitBranch, ShieldCheck, ArrowLeftRight,
  Terminal, Play, Zap, TrendingUp,
} from "lucide-react";

const KPIS = [
  { label: "Interactive patterns", value: "5", hint: "Each with Pyodide executable demo", deltaTone: "flat" as const },
  { label: "Pattern category", value: "Core DE", hint: "Medallion · SCD2 · slim CI · RLS · rETL", deltaTone: "flat" as const },
  { label: "Execution runtime", value: "Pyodide", hint: "Python in WebAssembly, lazy-loaded", deltaTone: "flat" as const },
  { label: "Lines of demo code", value: "~200", hint: "Pure Python stdlib, runs in browser", deltaTone: "flat" as const },
];

export function PatternsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Patterns · interactive guides"
        title="Data Engineering Patterns — Interactive"
        description="Five core data engineering patterns, each with a Pyodide executable demo. Click 'Run' to see the pattern in action — real Python executing in your browser via WebAssembly. No install, no signup. The same patterns are documented across the platform's 19 pages; this page brings them together as interactive guides."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Play className="h-3 w-3" /> 5 demos</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Pyodide</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* Pattern 1: Medallion Architecture */}
      <SectionCard
        title="Pattern 1: Medallion Architecture (Bronze → Silver → Gold)"
        description="Each layer has one job. Bronze = raw append. Silver = conformed. Gold = dimensional. The rule: you can't skip layers."
        icon={<Boxes className="h-5 w-5" />}
        badge="interactive"
      >
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          The Medallion pattern is the platform's canonical data flow. Bronze is append-only (evidence locker).
          Silver is conformed via idempotent MERGE. Gold is dimensional (star schemas for BI). The rule:
          each layer has exactly one responsibility, and skipping layers is forbidden (enforced by CI lint rules).
          See the <Link href={hrefFor("databricks")} className="text-primary hover:underline">Databricks page</Link> for the full implementation.
        </p>
        <PyodideRunner
          code={`# Medallion Architecture — Bronze -> Silver -> Gold simulation
# Shows how data flows through 3 layers, each with one job

# Bronze: raw ingest (append-only, schema-on-read)
bronze = [
    {"source": "shopify", "order_id": "ord_1", "email": "alice@mdse.io", "status": "ACTIVE", "region": "UK"},
    {"source": "shopify", "order_id": "ord_2", "email": "bob@mdse.io",   "status": "ACTIVE", "region": "EU"},
    {"source": "shopify", "order_id": "ord_3", "email": "carol@mdse.io",  "status": "INACTIVE", "region": None},
    {"source": "shopify", "order_id": "ord_4", "email": "dave@mdse.io",  "status": "ACTIVE", "region": "NA"},
]
print(f"Bronze: {len(bronze)} raw rows (append-only, schema-on-read)")

# Silver: conformed (deduplicate, normalise, hash PII)
import hashlib
silver = []
for r in bronze:
    email_hash = hashlib.md5(r["email"].lower().encode()).hexdigest()
    sk = hashlib.md5(f"{email_hash}|loaded".encode()).hexdigest()[:16]
    silver.append({
        "customer_sk": sk, "order_id": r["order_id"], "email_hash": email_hash,
        "is_active": r["status"] == "ACTIVE", "region_code": r["region"] or "UNKNOWN",
    })
print(f"Silver: {len(silver)} conformed rows (deduped, PII hashed, normalised)")

# Gold: dimensional (star schema for BI)
gold = [
    {"dim": "dim_customer", "rows": sum(1 for s in silver if s["is_active"])},
    {"dim": "fct_orders", "rows": len(silver)},
    {"metric": "active_customers", "value": sum(1 for s in silver if s["is_active"])},
    {"metric": "total_orders", "value": len(silver)},
]
print(f"Gold: {len(gold)} dimensional objects (star schema, BI-ready)")
print()
print("=" * 60)
print("MEDALLION FLOW:")
print("=" * 60)
print(f"  Bronze ({len(bronze)} raw) → Silver ({len(silver)} conformed) → Gold ({len(gold)} dimensional)")
print(f"  PII redacted: email → {silver[0]['email_hash'][:16]}...")
print(f"  Regions normalised: {set(s['region_code'] for s in silver)}")
print(f"  Active customers: {gold[0]['rows']}")
print(f"  Total orders: {gold[1]['rows']}")
print("=" * 60)`}
          buttonLabel="Run Medallion simulation (Pyodide)"
        />
      </SectionCard>

      {/* Pattern 2: SCD2 Snapshots */}
      <SectionCard
        title="Pattern 2: SCD2 — Slowly Changing Dimensions"
        description="When a customer's segment changes, don't overwrite — close the old row (valid_to) and open a new one (valid_from=NULL). Point-in-time correct."
        icon={<GitBranch className="h-5 w-5" />}
        badge="interactive"
      >
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          SCD2 (Slowly Changing Dimension Type 2) is the pattern for tracking attribute changes over time.
          When a customer upgrades from Standard to VIP, you don&apos;t overwrite the old row — you close
          it (set valid_to) and open a new row with the new segment. This makes historical reporting
          point-in-time correct: the order from March sees the March segment, not the current one.
          See the <Link href={hrefFor("dbt")} className="text-primary hover:underline">dbt page</Link> for the full implementation.
        </p>
        <PyodideRunner
          code={`# SCD2 — Slowly Changing Dimensions simulation
# Shows row lifecycle when a customer's segment changes

from datetime import datetime

# Initial customer state (segment=Standard)
customer_v1 = {
    "customer_sk": "sk_001", "customer_id": "cust_1",
    "segment": "Standard", "valid_from": "2026-01-01", "valid_to": None,
}
print("=== Before segment change ===")
print(f"  Row 1: {customer_v1['segment']} | valid_from={customer_v1['valid_from']} | valid_to={customer_v1['valid_to']}")

# Customer upgrades to VIP — DON'T overwrite, CLOSE old row + OPEN new row
change_date = "2026-03-15"
customer_v1_closed = {**customer_v1, "valid_to": change_date}  # close old row
customer_v2 = {
    "customer_sk": "sk_002", "customer_id": "cust_1",
    "segment": "VIP", "valid_from": change_date, "valid_to": None,  # open new row
}
print()
print("=== After segment change (SCD2) ===")
print(f"  Row 1: {customer_v1_closed['segment']} | valid_from={customer_v1_closed['valid_from']} | valid_to={customer_v1_closed['valid_to']}")
print(f"  Row 2: {customer_v2['segment']} | valid_from={customer_v2['valid_from']} | valid_to={customer_v2['valid_to']}")

# Point-in-time query: what was the segment in February?
feb = "2026-02-15"
rows = [customer_v1_closed, customer_v2]
for r in rows:
    if r["valid_from"] <= feb and (r["valid_to"] is None or feb < r["valid_to"]):
        print()
print(f"\\n=== Point-in-time query: segment on {feb} ===")
for r in rows:
    if r["valid_from"] <= feb and (r["valid_to"] is None or feb < r["valid_to"]):
        print(f"  → segment = {r['segment']} (correct: this was before the upgrade)")
        break

# Point-in-time query: what was the segment in April?
apr = "2026-04-01"
print(f"\\n=== Point-in-time query: segment on {apr} ===")
for r in rows:
    if r["valid_from"] <= apr and (r["valid_to"] is None or apr < r["valid_to"]):
        print(f"  → segment = {r['segment']} (correct: this was after the upgrade)")
        break

print()
print("=" * 60)
print("SCD2 RULE: Don't overwrite history. Close it + open a new row.")
print("=" * 60)`}
          buttonLabel="Run SCD2 simulation (Pyodide)"
        />
      </SectionCard>

      {/* Pattern 3: dbt Slim CI */}
      <SectionCard
        title="Pattern 3: dbt Slim CI — State-Aware Model Selection"
        description="Run only changed models + downstream. CI runtime drops from 14m to 4m by comparing the new manifest against the previous one."
        icon={<Layers className="h-5 w-5" />}
        badge="interactive"
      >
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          dbt slim CI compares the current manifest against the previous one (stored in S3).
          It runs <InlineCode>dbt build --select state:modified+</InlineCode> — only changed models
          and their downstream dependencies. The CI runtime drops from 14 minutes (full build)
          to ~4 minutes (changed only). See the <Link href={hrefFor("cicd")} className="text-primary hover:underline">CI/CD page</Link> for the full workflow.
        </p>
        <PyodideRunner
          code={`# dbt Slim CI — state-aware model selection simulation
# Shows which models run when only 'stg_orders' changes

# All dbt models (312 in production; simplified to 8 here)
all_models = [
    {"name": "stg_shopify_orders",  "layer": "staging",      "deps": []},
    {"name": "stg_sfdc_accounts",    "layer": "staging",      "deps": []},
    {"name": "int_customer_conform", "layer": "intermediate", "deps": ["stg_sfdc_accounts"]},
    {"name": "int_orders_enriched",  "layer": "intermediate", "deps": ["stg_shopify_orders", "int_customer_conform"]},
    {"name": "fct_orders",           "layer": "marts",        "deps": ["int_orders_enriched"]},
    {"name": "dim_customer",         "layer": "marts",        "deps": ["int_customer_conform"]},
    {"name": "fct_returns",          "layer": "marts",        "deps": ["stg_shopify_orders"]},
    {"name": "fct_orders_serving",   "layer": "serving",     "deps": ["fct_orders", "dim_customer"]},
]

# Changed model (what the PR modified)
changed = {"stg_shopify_orders"}

# Compute downstream (state:modified+)
def downstream(model_name, all_deps):
    result = {model_name}
    changed_anything = True
    while changed_anything:
        changed_anything = False
        for m in all_deps:
            if m["name"] not in result and any(d in result for d in m["deps"]):
                result.add(m["name"])
                changed_anything = True
    return result

run_set = downstream("stg_shopify_orders", all_models)
skip_set = {m["name"] for m in all_models} - run_set

print("=" * 60)
print("dbt Slim CI — state:modified+ selection")
print("=" * 60)
print(f"\\nChanged model: stg_shopify_orders")
print(f"\\nWILL RUN ({len(run_set)} models):")
for m in sorted(run_set):
    layer = next((mm["layer"] for mm in all_models if mm["name"] == m), "?")
    print(f"  + {m} ({layer})")

print(f"\\nWILL SKIP ({len(skip_set)} models):")
for m in sorted(skip_set):
    layer = next((mm["layer"] for mm in all_models if mm["name"] == m), "?")
    print(f"  - {m} ({layer})")

print(f"\\nFull build: {len(all_models)} models = ~14 min")
print(f"Slim CI:    {len(run_set)} models = ~{max(1, len(run_set) * 14 // len(all_models))} min")
print(f"Saved:      {len(skip_set)} models skipped = ~{len(skip_set) * 14 // len(all_models)} min")
print("=" * 60)`}
          buttonLabel="Run slim CI simulation (Pyodide)"
        />
      </SectionCard>

      {/* Pattern 4: Session-context RLS */}
      <SectionCard
        title="Pattern 4: Session-Context Row-Level Security"
        description="One SECURE VIEW + SESSION_CONTEXT() = 108 views replaced with 1. SSO attributes drive the session context; the view filters rows automatically."
        icon={<ShieldCheck className="h-5 w-5" />}
        badge="interactive"
      >
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          The naive approach: one SECURE VIEW per role per region (108 views for 9 markets × 12 roles).
          The right approach: ONE view + <InlineCode>SESSION_CONTEXT(&apos;ROW_ACCESS_REGION&apos;)</InlineCode>.
          When the user logs in via SSO, their SAML attributes drive the session context.
          See the <Link href={hrefFor("snowflake")} className="text-primary hover:underline">Snowflake page</Link> for the full SQL.
        </p>
        <PyodideRunner
          code={`# Session-Context RLS simulation
# Shows how one view filters rows based on the user's session context

# Synthetic orders table (what a SECURE VIEW would query)
orders = [
    {"order_id": "ord_1", "region": "UK", "total": 42.50},
    {"order_id": "ord_2", "region": "EU", "total": 128.00},
    {"order_id": "ord_3", "region": "UK", "total": 15.99},
    {"order_id": "ord_4", "region": "NA", "total": 999.00},
    {"order_id": "ord_5", "region": "EU", "total": 67.30},
    {"order_id": "ord_6", "region": "UK", "total": 230.00},
]

# Simulate the SECURE VIEW with SESSION_CONTEXT
def secure_view(orders, session_region):
    \"\"\"One view, filters by session context. Replaces 108 hand-coded views.\"\"\"
    return [o for o in orders if o["region"] == session_region]

# Test: UK user logs in via SSO (session_region = "UK")
print("=" * 60)
print("Session-Context RLS — One view, infinite regions")
print("=" * 60)

for region in ["UK", "EU", "NA"]:
    result = secure_view(orders, region)
    total = sum(o["total"] for o in result)
    print(f"\\nUser with session_region={region}:")
    print(f"  Sees {len(result)} orders, total = £{total:.2f}")
    for o in result:
        print(f"    {o['order_id']} | {o['region']} | £{o['total']:.2f}")

print(f"\\nTotal orders in base table: {len(orders)}")
print(f"Views needed (naive approach): 9 regions x 12 roles = 108 views")
print(f"Views needed (session context): 1 view")
print(f"Reduction: 99.1%")
print("=" * 60)`}
          buttonLabel="Run RLS simulation (Pyodide)"
        />
      </SectionCard>

      {/* Pattern 5: Reverse-ETL */}
      <SectionCard
        title="Pattern 5: Reverse-ETL via SQL Models"
        description="Define the audience as a SQL model in Snowflake. Hightouch syncs it to Salesforce/Klaviyo/Meta. One definition, many destinations, zero drift."
        icon={<ArrowLeftRight className="h-5 w-5" />}
        badge="interactive"
      >
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          Reverse-ETL pushes governed data OUT of the warehouse into business tools (CRM, CDP, ads).
          The audience is defined as a SQL model — versioned in Git, PII-masked, audit-logged.
          The same definition feeds Tableau (BI) and Hightouch (activation) — no metric drift.
          See the <Link href={hrefFor("fivetran-hightouch")} className="text-primary hover:underline">Fivetran &amp; Hightouch page</Link> for the full implementation.
        </p>
        <PyodideRunner
          code={`# Reverse-ETL — SQL model audience + sync simulation
# Shows how one SQL definition feeds multiple destinations

# Synthetic customer data (what the SQL model would query)
customers = [
    {"customer_id": "cust_1", "ltv": 5200, "segment": "VIP",     "region": "UK", "email_hash": "a1b2c3..."},
    {"customer_id": "cust_2", "ltv": 850,  "segment": "Loyal",   "region": "EU", "email_hash": "d4e5f6..."},
    {"customer_id": "cust_3", "ltv": 1500, "segment": "VIP",    "region": "UK", "email_hash": "g7h8i9..."},
    {"customer_id": "cust_4", "ltv": 200,  "segment": "Active",  "region": "NA", "email_hash": "j0k1l2..."},
    {"customer_id": "cust_5", "ltv": 3200, "segment": "VIP",    "region": "EU", "email_hash": "m3n4o5..."},
]

# SQL model: top 5% by LTV (the "VIP audience")
sorted_by_ltv = sorted(customers, key=lambda c: c["ltv"], reverse=True)
threshold = sorted_by_ltv[0]["ltv"] * 0.95  # top 5%
vip_audience = [c for c in customers if c["ltv"] >= threshold]

print("=" * 60)
print("Reverse-ETL — One SQL model, multiple destinations")
print("=" * 60)
print(f"\\nSQL model: SELECT * FROM customers WHERE ltv >= {threshold:.0f}")
print(f"Audience size: {len(vip_audience)} customers")

# Sync to Salesforce (account team outreach)
sf_sync = [{"salesforce_account_id": c["customer_id"], "vip_label": c["segment"], "ltv": c["ltv"]} for c in vip_audience]
print(f"\\n→ Synced to Salesforce: {len(sf_sync)} records")
for r in sf_sync:
    print(f"    {r['salesforce_account_id']} | {r['vip_label']} | £{r['ltv']}")

# Sync to Klaviyo (email retargeting) — PII masked
klaviyo_sync = [{"email_hash": c["email_hash"], "segment": c["segment"]} for c in vip_audience if c["region"] == "UK"]
print(f"\\n→ Synced to Klaviyo (UK only, PII masked): {len(klaviyo_sync)} records")
for r in klaviyo_sync:
    print(f"    {r['email_hash']} | {r['segment']}")

# Sync to Meta Ads (lookalike seeding)
meta_sync = [{"customer_id": c["customer_id"], "region": c["region"]} for c in vip_audience]
print(f"\\n→ Synced to Meta Ads (lookalike seeding): {len(meta_sync)} records")

print(f"\\nOne SQL definition → {len(sf_sync) + len(klaviyo_sync) + len(meta_sync)} total syncs across 3 destinations")
print(f"PII never leaves warehouse — email_hash only (not raw email)")
print(f"Audit log: every sync recorded with timestamp + record count")
print("=" * 60)`}
          buttonLabel="Run reverse-ETL simulation (Pyodide)"
        />
      </SectionCard>

      {/* Insight */}
      <SectionCard
        title="My deeper thought: patterns are the platform's API"
        description="These 5 patterns are the reusable abstractions that make the platform defensible — not the technology choices, but the patterns those choices enable."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Technologies change — Snowflake today, BigQuery tomorrow, DuckDB next year. But the patterns
            (Medallion, SCD2, slim CI, session RLS, reverse-ETL) are durable. They&apos;re the API of
            the platform — the reusable abstractions that survive technology churn.
          </p>
          <p>
            <strong className="text-foreground/80">The platform&apos;s value isn&apos;t in which tools it uses — it&apos;s in which patterns it has standardised.</strong>
            A team that has internalised these 5 patterns can swap engines (Snowflake → BigQuery → DuckDB)
            without rewriting their data models. The patterns are engine-agnostic; the implementations
            are engine-specific. This separation is what makes the platform defensible.
          </p>
          <p>
            The interactive demos on this page make that abstraction concrete. Click <strong>Run</strong> on
            any pattern — see the logic execute. The same logic runs in production on Spark, Flink, or
            Snowflake. The pattern is the constant; the engine is the variable.
          </p>
        </div>
      </SectionCard>

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">
          → Knowledge Hub (ADRs + pattern library)
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("databricks")} className="text-sm text-primary hover:underline">
          → Databricks (Medallion implementation)
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("arrow")} className="text-sm text-primary hover:underline">
          → Apache Arrow (ADR-017: Flight protocol)
        </Link>
      </div>
    </div>
  );
}
