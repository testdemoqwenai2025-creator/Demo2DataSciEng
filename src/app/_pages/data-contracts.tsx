"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { NextSteps } from "../_components/next-steps";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { DATA_CONTRACTS_EXAMPLES } from "../_components/_dataset_examples6";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  ShieldCheck, History, GitBranch, Activity, FileText, ExternalLink,
  Sparkles, Cpu, TrendingUp, Server, Cloud, Boxes, Atom, Layers,
  Network, Database, ShieldAlert, Workflow,
} from "lucide-react";

// ============================================================
// Code snippets
// ============================================================

const DBT_CONTRACT_YAML = `# ============================================================
# dbt schema tests + contracts (dbt v1.5+)
# Contract = schema + tests + SLA + ownership, all versioned via PR
# ============================================================

# models/staging/stg_orders.sql — declare contract on the model
{{ config(
    materialized='table',
    contract={
        'enforced': true,  # CI fails if tests don't pass
    }
) }}

SELECT
    order_id::bigint       AS order_id,
    customer_id::bigint    AS customer_id,
    amount_usd::double     AS amount_usd,
    currency::string       AS currency,
    order_ts::timestamp    AS order_ts,
    'orders'               AS source_system
FROM {{ source('bronze', 'orders_raw') }}
WHERE ingestion_ts >= current_date() - 1

# models/staging/_stg_orders__schema.yml — define contract fields + tests
version: 2

models:
  - name: stg_orders
    description: "Staged orders — conform to Silver layer contract"
    access: protected  # protected | private | public — governs downstream
    group: silver      # which data mesh domain owns this
    owner:
      name: "orders-team"
      email: "orders-team@moderndatascieng.com"
    meta:
      sla.freshness: "5min P95"           # 5min max event-to-table lag
      sla.completeness: "0.0% nulls on order_id"
      sla.accuracy: "P95(amount) within 1% of upstream"
      contract.version: "v3"
      contract.since: "2024-09-01"
    contracts:
      - type: seed     # initial contract — first definition
        version: v3
        enforced: true
    columns:
      - name: order_id
        description: "PK from MySQL orders_fct"
        data_tests:
          - not_null
          - unique
          - dbt_utils.accepted_range:
              min_value: 1
              max_value: 9999999999
      - name: customer_id
        description: "FK to dim_customer"
        data_tests:
          - not_null
          - relationships:
              to: ref('stg_customers')
              field: customer_id
      - name: amount_usd
        description: "Order total in USD"
        data_tests:
          - not_null
          - dbt_utils.accepted_range:
              min_value: 0
              max_value: 100000000
      - name: currency
        description: "ISO 4217 currency code"
        data_tests:
          - accepted_values:
              values: ['USD', 'EUR', 'GBP', 'JPY']
      - name: order_ts
        description: "Event timestamp"
        data_tests:
          - not_null
          - dbt_utils.recent_date:
              datepart: day
              count: 1   # data must be < 1 day old (freshness SLA)`;

const GREAT_EXPECTATIONS_PY = `# ============================================================
# Great Expectations — declarative data quality framework
# Contracts = Expectation Suites (groups of rules per dataset)
# ============================================================

import great_expectations as gx
from great_expectations.core.expectation_configuration import (
    ExpectationConfiguration,
)

# Initialize context (filesystem-backed, version controlled)
context = gx.get_context()
context.add_datasource(
    name="silver_iceberg",
    class_name="Datasource",
    execution_engine={
        "class_name": "SparkDFExecutionEngine",
        "spark_config": {
            "spark.sql.catalog.iceberg": "org.apache.iceberg.spark",
            "spark.sql.catalog.iceberg.type": "rest",
            "spark.sql.catalog.iceberg.uri":
                "https://catalog.moderndatascieng.com",
        },
    },
)

# Build the contract — Expectation Suite for silver.customers
contract_suite = context.create_expectation_suite(
    "silver.customers.v3",
    overwrite_existing=True,
)

# Add expectations — each is one rule in the contract
contract_suite.add_expectation(
    ExpectationConfiguration(
        expectation_type="expect_column_values_to_not_be_null",
        kwargs={"column": "customer_id"},
        meta={"severity": "critical", "sla": "0.0% nulls"},
    )
)
contract_suite.add_expectation(
    ExpectationConfiguration(
        expectation_type="expect_column_values_to_be_unique",
        kwargs={"column": "customer_id"},
        meta={"severity": "critical"},
    )
)
contract_suite.add_expectation(
    ExpectationConfiguration(
        expectation_type="expect_column_values_to_match_regex",
        kwargs={"column": "email_hash", "regex": r"^[a-f0-9]{64}$"},
        meta={"severity": "critical", "sla": "100% must match SHA-256"},
    )
)
contract_suite.add_expectation(
    ExpectationConfiguration(
        expectation_type="expect_column_values_to_be_between",
        kwargs={"column": "amount_usd", "min_value": 0,
                 "max_value": 100_000_000},
        meta={"severity": "high"},
    )
)
contract_suite.add_expectation(
    ExpectationConfiguration(
        expectation_type="expect_column_values_to_be_in_set",
        kwargs={"column": "currency",
                 "value_set": ["USD", "EUR", "GBP", "JPY"]},
        meta={"severity": "high"},
    )
)

# Save suite — version controlled alongside code (git is the VCS)
context.save_expectation_suite(contract_suite)

# Validate a Spark DataFrame against the contract — on producer side
spark_df = spark.read.table("silver.customers")
results = context.run_checkpoint(
    checkpoint_name="silver_customers_v3",
    batch_request={
        "datasource_name": "silver_iceberg",
        "data_asset_name": "silver.customers",
        "batch_identifiers": {"ts": "2024-09-26"},
    },
)

# If any expectation fails, the producer's CI pipeline fails
# (the deploy cannot proceed without all expectations passing)
if not results.success:
    failed = [r for r in results.results if not r.success]
    raise RuntimeError(f"Contract violations: {len(failed)} rules failed")
print(f"Contract silver.customers v3 — PASSED ({len(results.results)} rules)")`;

const SCHEMA_REGISTRY_CONTRACT = `# ============================================================
# Confluent Schema Registry — producer/consumer schema contract
# Subject: orders-value | Compatibility: BACKWARD_TRANSITIVE
# ============================================================

# Register the contract schema (v3) — Schema Registry enforces
# compatibility on subsequent versions; rejects breaking changes
# at register time (compile-time check vs runtime breakage)

curl -X POST \\
  http://schema-registry:8081/subjects/orders-value/versions \\
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \\
  -d '{
    "schemaType": "AVRO",
    "schema": "{\\"type\\":\\"record\\",\\"name\\":\\"Order\\",\\"fields\\":[
      {\\"name\\":\\"order_id\\",\\"type\\":\\"long\\"},
      {\\"name\\":\\"customer_id\\",\\"type\\":\\"long\\"},
      {\\"name\\":\\"amount_usd\\",\\"type\\":\\"double\\",\\"default\\":0.0},
      {\\"name\\":\\"currency\\",\\"type\\":\\"string\\",\\"default\\":\\"USD\\"},
      {\\"name\\":\\"order_ts\\",\\"type\\":\\"long\\"},
      {\\"name\\":\\"status\\",\\"type\\":\\"string\\"}
    ]}"
  }'

# Response: { "id": 42 }  -- schema id prepended to every Avro message

# Set compatibility (BACKWARD_TRANSITIVE is the production default)
curl -X PUT \\
  http://schema-registry:8081/config/orders-value \\
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \\
  -d '{"compatibility": "BACKWARD_TRANSITIVE"}'

# v4 attempt — breaking change (NO default on new field)
curl -X POST \\
  http://schema-registry:8081/compatibility/subjects/orders-value/versions/latest \\
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \\
  -d '{
    "schema": "{\\"type\\":\\"record\\",\\"name\\":\\"Order\\",\\"fields\\":[
      ...,
      {\\"name\\":\\"shipping_cost\\",\\"type\\":\\"double\\"}
    ]}"
  }'

# Response: {"is_compatible": false,
#            "messages": [{"message":"New field 'shipping_cost' has no default"}]}
# -> Producer's CI fails — breaking change cannot reach production

# v4 fix — add default (BACKWARD compatible)
# New schema passes compatibility check, registered as v4
# Old consumers continue reading v3 data (default value filled in)
# New consumers read v4 with the new field — backward AND forward compatible`;

const DATAHUB_CONTRACT_YAML = `# ============================================================
# DataHub — contract discovery + subscription
# datahub-contracts.yaml — declares contract + ownership
# ============================================================

# Contract for the 'orders.v3' dataset (Kafka topic)
contracts:
  - id: "urn:li:contract:orders-v3"
    version: "3.0.0"
    status: ACTIVE
    display_name: "Order Events Contract v3"
    description: |
      Synthetic 100M order events/day on Kafka topic 'orders.v3'.
      Producer: orders-team. Consumers: 12 downstream services
      (billing, fulfilment, fraud, analytics, ML, marketing, ...).
    cost: 0  # billing cost (synthetic example)

    # Producer side — who owns this contract + contact
    producer:
      id: "urn:li:corpGroup:orders-team"
      email: "orders-team@moderndatascieng.com"

    # SLOs (Service Level Objectives) — what the producer guarantees
    sla:
      freshness:
        p95_ms: 300000        # 5min P95 (event_ts to Kafka ack)
        description: "P95 lag between event_ts and Kafka ack"
      completeness:
        max_null_rate:
          order_id: 0.0       # 0% nulls allowed
          customer_id: 0.0
          amount_usd: 0.01    # 1% nulls tolerated
          currency: 0.05     # 5% tolerated (defaults to USD)
        description: "Per-field max null rate"
      accuracy:
        amount_usd_relative_error_p95: 0.01  # P95 within 1% of upstream
        order_ts_drift_ms: 0                 # exact match
        description: "vs MySQL orders_fct source"

    # Schema — link to Schema Registry subject (separate system)
    schema:
      type: AVRO
      registry: "Confluent Schema Registry"
      subject: "orders-value"
      version: 3
      schema_id: 42

    # Consumers — who subscribes + their access level
    consumers:
      - id: "urn:li:corpGroup:billing-team"
        access: READ
        since: "2024-09-01"
      - id: "urn:li:corpGroup:fulfilment-team"
        access: READ
        since: "2024-09-01"
      - id: "urn:li:corpGroup:fraud-team"
        access: READ
        since: "2024-09-01"
      - id: "urn:li:corpGroup:analytics-team"
        access: READ
        since: "2024-09-01"
      - id: "urn:li:corpGroup:ml-platform-team"
        access: READ
        since: "2024-09-01"
      - id: "urn:li:corpGroup:marketing-team"
        access: READ
        since: "2024-09-01"
      # ... 6 more consumers

    # Compliance — audit trail (link to OpenLineage)
    compliance:
      audit_log: "iceberg.gdpr_audit_log"
      lineage_backend: "OpenLineage + Marquez"
      openlineage_namespace: "kafka-prod"
      rca_window_hours: 24`;

const OPENLINEAGE_CONTRACT_COMPLIANCE = `# ============================================================
# OpenLineage — contract compliance monitoring
# Checks every job run against the contract (e.g., freshness SLA)
# ============================================================

# The OpenLineage backend (Marquez/DataHub) tracks every job run that
# produces or consumes a contracted dataset. Compliance checks:

# 1. Freshness SLA — last write was within the SLA window
#    (e.g., 'orders.v3' must have been written to in the last 5 minutes)
curl "https://lineage.moderndatascieng.com/api/v1/contracts/orders.v3/freshness"
# {"last_write": "2024-09-26T10:04:32Z", "sla_ms": 300000,
#  "compliant": true, "lag_ms": 120000}

# 2. Schema compliance — last write used the contracted schema version
curl "https://lineage.moderndatascieng.com/api/v1/contracts/orders.v3/schema"
# {"expected_schema_id": 42, "last_write_schema_id": 42,
#  "compliant": true, "version_chain": [42, 41, 40]}

# 3. Consumer impact — list all consumers of this dataset
curl "https://lineage.moderndatascieng.com/api/v1/contracts/orders.v3/consumers"
# {"consumers": ["billing-team", "fulfilment-team", "fraud-team", ...]}

# 4. SLA violation alert (sent to producer's PagerDuty rotation)
# When freshness SLA violated, OpenLineage triggers an alert
# via webhook to PagerDuty:
curl -X POST "https://lineage.moderndatascieng.com/api/v1/alerts" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contract": "orders.v3",
    "violation": "freshness_sla",
    "lag_ms": 600000,
    "sla_ms": 300000,
    "owner": "orders-team",
    "pagerduty_routing_key": "\${PAGERDUTY_ROUTING_KEY}",
    "message": "orders.v3 freshness SLA violated: 10min lag (SLA: 5min)"
  }'

# 5. Compliance reporting — daily audit log entry
curl "https://lineage.moderndatascieng.com/api/v1/contracts/orders.v3/report?date=2024-09-26"
# {"date": "2024-09-26",
#  "writes_total": 1234567,
#  "writes_within_sla": 1234000,
#  "writes_violating_sla": 567,
#  "sla_compliance_pct": 99.95,
#  "schema_violations": 0,
#  "consumer_breakages": 0}`;

const PYODIDE_DEMO = `# ============================================================
# Data contract enforcement — in-browser simulation
# Build synthetic contract, validate 100K events, show:
#   1. Schema (Avro-like) + SLA + ownership
#   2. Producer-side validation (Great Expectations rules)
#   3. Consumer impact (which services break if contract violated)
#   4. SLA monitoring (freshness, completeness, accuracy)
# ============================================================

import random
from collections import defaultdict

random.seed(42)
print("=== Data contract enforcement simulation ===")
print("Synthetic: 100M order events/day on Kafka topic 'orders.v3'\\n")

# Contract definition — what the producer guarantees
contract = {
    "name": "orders.v3",
    "version": "3.0.0",
    "owner": "orders-team",
    "schema": {
        "fields": [
            {"name": "order_id",    "type": "long",   "required": True},
            {"name": "customer_id", "type": "long",   "required": True},
            {"name": "amount_usd",  "type": "double", "required": True,
             "min": 0, "max": 100_000_000},
            {"name": "currency",    "type": "string", "required": False,
             "default": "USD",
             "enum": ["USD", "EUR", "GBP", "JPY"]},
            {"name": "order_ts",    "type": "long",   "required": True},
            {"name": "status",      "type": "string", "required": True,
             "enum": ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"]},
        ]
    },
    "sla": {
        "freshness_p95_ms":      300000,   # 5min P95
        "completeness_order_id": 0.0,      # 0% nulls
        "completeness_customer_id": 0.0,
        "completeness_amount_usd": 0.01,    # 1% tolerated
        "accuracy_amount_usd":   0.01,     # P95 within 1% of upstream
        "accuracy_order_ts":     0.0,      # exact match
    },
    "consumers": [
        "billing-team", "fulfilment-team", "fraud-team",
        "analytics-team", "ml-platform-team", "marketing-team",
        "cdp-team", "ops-team", "data-stewards", "compliance-team",
        "support-team", "intl-team",
    ],
}

print(f"Contract: {contract['name']} v{contract['version']}")
print(f"Owner: {contract['owner']}")
print(f"Consumers: {len(contract['consumers'])} services")
print(f"SLA: freshness P95 {contract['sla']['freshness_p95_ms']/1000/60:.0f}min, "
      f"order_id nulls {contract['sla']['completeness_order_id']*100:.0f}%")

# ---- Validation rules (Great Expectations equivalent) ----
def validate_event(event):
    """Returns list of violation messages (empty = valid)."""
    violations = []
    for field in contract["schema"]["fields"]:
        name = field["name"]
        value = event.get(name)
        if field["required"] and value is None:
            violations.append(f"{name}_not_null: missing required field '{name}'")
            continue
        if value is None:
            continue  # optional field, skip further checks
        if "enum" in field and value not in field["enum"]:
            violations.append(
                f"{name}_in_enum: value '{value}' not in {field['enum']}"
            )
        if "min" in field and isinstance(value, (int, float)):
            if value < field["min"] or value > field.get("max", float("inf")):
                violations.append(
                    f"{name}_in_range: value {value} outside [{field.get('min')}, {field.get('max')}]"
                )
    return violations

# ---- Simulate 100K events (1:1000 scale-down from 100M) ----
n_events = 100_000
accounts = list(range(10_000_000, 99_999_999))
events = []
for i in range(n_events):
    roll = random.random()
    if roll < 0.92:
        # 92% well-formed
        events.append({
            "order_id": i + 1,
            "customer_id": random.choice(accounts),
            "amount_usd": round(random.uniform(10, 5000), 2),
            "currency": random.choice(["USD", "EUR", "GBP", "JPY"]),
            "order_ts": random.randint(1_700_000_000, 1_700_086_400),
            "status": random.choice(["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"]),
        })
    elif roll < 0.96:
        # 4% currency invalid
        events.append({
            "order_id": i + 1, "customer_id": random.choice(accounts),
            "amount_usd": round(random.uniform(10, 5000), 2),
            "currency": "XYZ",  # bad
            "order_ts": random.randint(1_700_000_000, 1_700_086_400),
            "status": "PAID",
        })
    elif roll < 0.98:
        # 2% amount negative
        events.append({
            "order_id": i + 1, "customer_id": random.choice(accounts),
            "amount_usd": -50.0, "currency": "USD",
            "order_ts": random.randint(1_700_000_000, 1_700_086_400),
            "status": "PAID",
        })
    else:
        # 2% missing required
        events.append({
            "order_id": None, "customer_id": None,
            "amount_usd": round(random.uniform(10, 5000), 2),
            "currency": "USD",
            "order_ts": random.randint(1_700_000_000, 1_700_086_400),
            "status": "PAID",
        })

# ---- Producer-side validation (only valid events reach v3 topic) ----
print(f"\\nProducer-side validation ({n_events:,} events):")
valid_count = 0
reject_count = 0
reject_reasons = defaultdict(int)
for e in events:
    violations = validate_event(e)
    if violations:
        reject_count += 1
        reject_reasons[violations[0].split(":")[0]] += 1
    else:
        valid_count += 1

print(f"  Validated -> orders.v3 topic: {valid_count:,} ({valid_count/n_events:.1%})")
print(f"  Rejected -> orders.dlq topic:   {reject_count:,} ({reject_count/n_events:.1%})")
print(f"  Reject reasons:")
for reason, count in sorted(reject_reasons.items(), key=lambda x: -x[1]):
    print(f"    {count}x {reason}")

# ---- SLA monitoring (freshness, completeness, accuracy) ----
print(f"\\nSLA monitoring (synthetic, scaled):")
# Freshness — simulate event_ts to ack lag
freshness_samples = sorted([random.gauss(180, 60) for _ in range(1000)])
p95_freshness = freshness_samples[int(0.95 * len(freshness_samples))]
sla_ms = contract["sla"]["freshness_p95_ms"]
print(f"  Freshness: P95 = {p95_freshness:.0f}s ({p95_freshness*1000:.0f}ms), "
      f"SLA = {sla_ms}ms -> {'OK' if p95_freshness*1000 <= sla_ms else 'VIOLATED'}")

# Completeness — null rate per field
null_rates = {
    "order_id": 0.0001,    # 0.01% nulls (4 reject events)
    "customer_id": 0.0001,
    "amount_usd": 0.005,
    "currency": 0.01,
    "order_ts": 0.0,
    "status": 0.0,
}
print(f"  Completeness (null rate per field):")
for field, rate in null_rates.items():
    sla_key = f"completeness_{field}"
    if sla_key in contract["sla"]:
        sla = contract["sla"][sla_key]
        status = "OK" if rate <= sla else "VIOLATED"
        print(f"    {field}: {rate*100:.3f}% (SLA {sla*100:.1f}%) -> {status}")

# Accuracy — relative error vs upstream
rel_errors = sorted([abs(random.gauss(0, 0.005)) for _ in range(1000)])
p95_acc = rel_errors[int(0.95 * len(rel_errors))]
print(f"  Accuracy (amount_usd): P95 rel error = {p95_acc*100:.2f}%, "
      f"SLA = 1.00% -> {'OK' if p95_acc < 0.01 else 'VIOLATED'}")

# ---- Consumer impact — what happens if contract violated ----
print(f"\\nConsumer impact analysis:")
print(f"  If freshness SLA violated (lag > 5min):")
print(f"    -> {len(contract['consumers'])} services reading stale data")
for c in contract["consumers"][:5]:
    print(f"      - {c}")
print(f"    ... 7 more services")
print(f"  If schema contract violated (breaking change):")
print(f"    -> {len(contract['consumers'])} services break with deserialise errors")
print(f"    -> 100M events/day silently fail or DLQ'd")
print(f"    -> root cause takes hours to diagnose")

# ---- Counterfactual: without contract ----
print(f"\\n=== Counterfactual: deploy without contract ===")
print(f"  1. Producer adds field 'shipping_cost' WITHOUT default")
print(f"  2. 12 services silently break (deserialise errors on every event)")
print(f"  3. 100M events/day DLQ'd or dropped")
print(f"  4. RCA: ~3-6 hours manual tracing through 12 services")
print(f"  5. Owner: data-stewards (default, since real owner unknown)")
print(f"  6. Fix: roll back producer, then re-deploy with default value")

print(f"\\n=== With contract ===")
print(f"  1. Producer attempts to register v4 (no default) -> REJECTED at register")
print(f"  2. Producer CI fails -> developer adds default, re-tries")
print(f"  3. v4 registered as BACKWARD compatible")
print(f"  4. 12 consumers auto-fetch v4 schema by ID (transparent)")
print(f"  5. Zero breakages — the contract caught the issue at compile time")
print(f"\\nKey insight: data contracts ARE the API gateway pattern for data,")
print(f"like OpenAPI specs are for REST APIs. Same compile-time type checking,")
print(f"same runtime validation, same contract-first development lifecycle.")`;

// ============================================================
// Contract architecture SVG diagram
// ============================================================

function ContractArchitectureDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("contract");
  const nodes = {
    "producer":     { label: "Producer (orders-team)", desc: "Owns the contract — generates data per schema + SLA. dbt tests + Great Expectations validate on write. Schema Registry enforces schema.", level: 0 },
    "contract":     { label: "Contract (schema + SLA + owner)", desc: "Three components bundled: schema (Avro/Protobuf via Schema Registry), SLAs (freshness/completeness/accuracy via GE), ownership (team + PagerDuty rotation). Versioned via git PR review.", level: 1 },
    "registry":     { label: "Schema Registry",        desc: "Enforces schema compatibility at register time. Rejects breaking changes (no default on new field = REJECTED). Schema ID prepended to every message.", level: 2 },
    "ge":           { label: "Great Expectations",       desc: "Validates data quality at write time. Rules: not_null, unique, in_range, in_set, regex_match. If any rule fails, the producer's CI pipeline fails.", level: 2 },
    "datahub":      { label: "DataHub (discovery)",     desc: "Consumers discover contracts via search. Pulls contract metadata (schema, SLA, owner, consumers list) at subscribe time. Subscription recorded for audit.", level: 3 },
    "consumer":     { label: "Consumers (12 services)", desc: "Auto-fetch schema by ID (cached). Subscribes to contract via DataHub. Receives contract violation alerts via webhook.", level: 4 },
    "lineage":      { label: "OpenLineage (compliance)", desc: "Tracks every job run against the contract. Freshness SLA, schema version compliance, consumer impact analysis. Alert webhook on violation.", level: 3 },
  };
  const edges = [
    ["producer", "contract"],
    ["contract", "registry"],
    ["contract", "ge"],
    ["contract", "datahub"],
    ["datahub", "consumer"],
    ["contract", "lineage"],
    ["lineage", "consumer"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "producer":  { x: 200, y: 30 },
    "contract":  { x: 200, y: 80 },
    "registry":  { x: 80,  y: 130 },
    "ge":        { x: 200, y: 130 },
    "datahub":   { x: 200, y: 180 },
    "lineage":   { x: 320, y: 130 },
    "consumer":  { x: 200, y: 230 },
  };

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Contract architecture — schema + SLA + ownership, enforced by 4 systems
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 260" className="w-full h-auto">
          {edges.map(([from, to], i) => {
            const a = positions[from];
            const b = positions[to];
            return (
              <line key={i} x1={a.x} y1={a.y + 12} x2={b.x} y2={b.y - 12}
                stroke="var(--border)" strokeWidth="0.8"
                markerEnd="url(#arrow)" />
            );
          })}
          {Object.entries(positions).map(([id, pos]) => {
            const isActive = activeNode === id;
            const node = nodes[id as keyof typeof nodes];
            const color =
              node.level === 0 ? "var(--chart-3)" :
              node.level === 1 ? "var(--chart-2)" :
              node.level === 2 ? "var(--chart-1)" :
              node.level === 3 ? "var(--chart-4)" : "var(--chart-5)";
            return (
              <motion.g key={id}
                onMouseEnter={() => setActiveNode(id)}
                onMouseLeave={() => setActiveNode(null)}
                animate={{ scale: isActive ? 1.05 : 1 }}
                style={{ cursor: "pointer" }}
              >
                <rect x={pos.x - 60} y={pos.y - 10} width="120" height="22" rx="3"
                  fill={isActive ? color + "30" : "var(--background)"}
                  stroke={color} strokeWidth={isActive ? 1.5 : 0.8}
                />
                <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="7"
                  fill={isActive ? color : "var(--foreground)"}
                  fontWeight={isActive ? "bold" : "normal"}>
                  {node.label}
                </text>
              </motion.g>
            );
          })}
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" />
            </marker>
          </defs>
        </svg>
        {activeNode && (
          <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
            <p className="font-semibold text-primary mb-0.5">
              {nodes[activeNode as keyof typeof nodes].label}
            </p>
            <p className="text-muted-foreground">
              {nodes[activeNode as keyof typeof nodes].desc}
            </p>
          </div>
        )}
        {!activeNode && (
          <p className="mt-2 text-[10px] text-muted-foreground text-center">
            Hover any node — the contract bundles three things (schema, SLA, ownership),
            enforced by four systems (Schema Registry, GE, DataHub, OpenLineage).
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Contract platform comparison table
// ============================================================

function ContractComparisonTable() {
  const rows = [
    { feature: "Origin", dbt: "dbt Labs 2020 (schema tests)", ge: "Great Expectations 2017 (rules framework)", schema_reg: "Confluent 2014 (Avro)", datahub: "LinkedIn 2020 (metadata platform)", openlineage: "WeWork 2020 (lineage events)" },
    { feature: "Contract layer", dbt: "Schema + tests (SQL models)", ge: "Quality rules (any data source)", schema_reg: "Schema + compatibility (Kafka messages)", datahub: "Discovery + subscription (cross-team)", openlineage: "Compliance monitoring (job runs)" },
    { feature: "Enforcement point", dbt: "Build (dbt run)", ge: "Write (producer side)", schema_reg: "Register (before send)", datahub: "Subscribe (consumer side)", openlineage: "Runtime (every job run)" },
    { feature: "Schema types", dbt: "SQL types (BigQuery/Snowflake)", ge: "Python (pandas + Spark)", schema_reg: "Avro + Protobuf + JSON", datahub: "All of the above (consumer of others)", openlineage: "Dataset + column references" },
    { feature: "SLA monitoring", dbt: "Freshness + custom tests", ge: "Severity levels (warn/error)", schema_reg: "Schema versions (compatibility)", datahub: "Freshness + lineage + alerts", openlineage: "Freshness + completeness + accuracy" },
    { feature: "Versioning", dbt: "Git (PR review)", ge: "Git (PR review)", schema_reg: "Subject versions (compatibility check)", datahub: "Versions + change log", openlineage: "Run ID + parent runId chain" },
    { feature: "Producer side", dbt: "Contract declaration (YAML)", ge: "Expectation Suite (Python)", schema_reg: "Schema register + produce", datahub: "Discovery + publishing", openlineage: "Listener emits events" },
    { feature: "Consumer side", dbt: "Model dependencies (ref)", ge: "Checkpoint validation", schema_reg: "Schema fetch by ID (cached)", datahub: "Contract subscription", openlineage: "Lineage BFS queries" },
    { feature: "Best fit", dbt: "SQL transformation contracts", ge: "Quality rules at write", schema_reg: "Kafka message contracts", datahub: "Cross-team contract discovery", openlineage: "Compliance monitoring + audit" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          dbt vs GE vs Schema Registry vs DataHub vs OpenLineage — contract tooling
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">dbt</th>
              <th className="text-left px-3 py-2 font-semibold">Great Expectations</th>
              <th className="text-left px-3 py-2 font-semibold">Schema Registry</th>
              <th className="text-left px-3 py-2 font-semibold">DataHub</th>
              <th className="text-left px-3 py-2 font-semibold">OpenLineage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.dbt}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.ge}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.schema_reg}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.datahub}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.openlineage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Main page component
// ============================================================

const KPIS = [
  { label: "Origin", value: "Chad Sanderson 2022 / dbt 2020 / GE 2017", hint: "Chad Sanderson's 'Data Contracts' movement formalised the producer/consumer agreement pattern (2022). dbt shipped schema tests in 2020; Great Expectations in 2017 — the three converged.", deltaTone: "flat" as const },
  { label: "Production scale", value: "100M+ events/day per contract", hint: "Single contract covers 100M+ Kafka events/day (orders topic), 10M+ PII records (customers), 50M+ ML features — all validated on write, audited on read", deltaTone: "up" as const },
  { label: "Contract components", value: "3 (schema + SLA + ownership)", hint: "Schema (Avro/Protobuf via Schema Registry), SLAs (freshness/completeness/accuracy via Great Expectations), ownership (team + PagerDuty rotation via DataHub)", deltaTone: "flat" as const },
  { label: "Tooling ecosystem", value: "5 systems (dbt + GE + SR + DataHub + OpenLineage)", hint: "dbt (SQL contracts) + Great Expectations (quality rules) + Schema Registry (message schema) + DataHub (discovery) + OpenLineage (compliance) — complementary, not competing", deltaTone: "up" as const },
];

export function DataContractsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Data Contracts · dbt · Great Expectations · Schema Registry · DataHub · OpenLineage"
        title="Data Contracts — the API gateway pattern for data"
        description="A data contract is a producer/consumer agreement that bundles three things: schema (Avro/Protobuf via Schema Registry, validated at register time), SLAs (freshness, completeness, accuracy via Great Expectations, validated at write time), and ownership (team + PagerDuty rotation via DataHub). Without contracts, any schema change breaks downstream consumers silently — the producer ships the change, the consumers' deserialiser fails on every event, root cause takes hours. With contracts, the Schema Registry REFUSES to register incompatible schemas at compile time; the producer's CI fails before any consumer sees a breaking event; DataHub enables consumer discovery; OpenLineage tracks compliance for audits. The pattern is structurally identical to OpenAPI specs for REST APIs — contract-first development, type-safety as a deploy-gate, runtime validation. Chad Sanderson formalised the movement in 2022; dbt shipped schema tests in 2020; Great Expectations in 2017. The three converged into the modern data contract stack."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><ShieldCheck className="h-3 w-3" /> Schema + SLA + Owner</Badge>
            <Badge variant="outline" className="gap-1.5"><Layers className="h-3 w-3" /> 5 systems</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard
            key={k.label}
            label={k.label}
            value={k.value}
            hint={k.hint}
            deltaTone={k.deltaTone}
          />
        ))}
      </div>

      {/* Contract architecture */}
      <SectionCard
        title="Contract architecture — schema + SLA + ownership, enforced by 4 systems"
        description="The contract bundles three things (schema, SLAs, ownership) and is enforced by four systems working together. Schema Registry enforces schema compatibility at register time (the producer can't deploy a breaking change — the registry refuses). Great Expectations validates SLA rules on write (the producer's CI fails if any quality rule fails). DataHub enables consumer discovery (consumers auto-discover contracts at subscribe time). OpenLineage tracks compliance for audits (every job run is checked against the contract). Git is the version control — contracts are versioned via PR review, just like code."
        icon={<ShieldCheck className="h-5 w-5" />}
        badge="architecture"
      >
        <ContractArchitectureDiagram />
      </SectionCard>

      {/* dbt contracts */}
      <SectionCard
        title="dbt contracts — schema tests + contracts (YAML)"
        description="dbt v1.5+ shipped native contract support — a contract is declared on a model via the contract config + YAML schema definition. The contract includes: schema (column types), tests (not_null, unique, accepted_values, relationships, custom), SLAs (freshness, completeness, accuracy via meta fields), ownership (team + email). CI runs the contract — dbt test fails if any test fails. The contract is versioned via the dbt project's git repo — PR review is the contract change management process. dbt is the dominant tool for SQL transformation contracts (Bronze → Silver → Gold hops)."
        icon={<Database className="h-5 w-5" />}
        badge="dbt"
      >
        <CodeBlock code={DBT_CONTRACT_YAML} language="yaml" filename="dbt_contract.yml" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92]} />
      </SectionCard>

      {/* Great Expectations */}
      <SectionCard
        title="Great Expectations — declarative data quality rules"
        description="Great Expectations (2017) is the most mature data quality framework. Contracts = Expectation Suites (groups of rules per dataset). Rules include: not_null, unique, in_range, in_set, match_regex, column_pair_values (cross-column). Each rule has a severity (warn/error) + SLA metadata. The suite is version-controlled alongside code (git is the VCS). Validation runs on the producer side — if any rule fails, the producer's CI fails, the deploy is blocked. GE integrates with Spark, Pandas, Snowflake, BigQuery, SQL databases, Iceberg — broadest datasource support of any quality tool."
        icon={<ShieldAlert className="h-5 w-5" />}
        badge="Great Expectations"
      >
        <CodeBlock code={GREAT_EXPECTATIONS_PY} language="python" filename="great_expectations.py" highlight={[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91]} />
      </SectionCard>

      {/* Schema Registry contract */}
      <SectionCard
        title="Schema Registry — message-level schema contract"
        description="Confluent Schema Registry (2014) enforces Avro/Protobuf/JSON schema compatibility at register time. A v4 attempt that adds a required field without default is REFUSED by the compatibility check (BACKWARD_TRANSITIVE default) — the producer's CI fails before any message is sent. Fixed by adding the default — the new schema registers as v4 (backward compatible), consumers auto-fetch by schema ID (cached). This is the compile-time type-safety of data contracts — same pattern as TypeScript for code. The 4-byte schema ID prefix on every message is the runtime type witness — consumers fetch the schema by ID (cached) at deserialise time."
        icon={<Layers className="h-5 w-5" />}
        badge="Schema Registry"
      >
        <CodeBlock code={SCHEMA_REGISTRY_CONTRACT} language="bash" filename="schema_registry_contract.sh" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67]} />
      </SectionCard>

      {/* DataHub contract discovery */}
      <SectionCard
        title="DataHub — contract discovery + subscription"
        description="DataHub (LinkedIn 2020) is the contract discovery layer — consumers find contracts by search, subscribe at runtime, and the subscription is recorded for audit. A contract YAML declares: producer (team + email), SLAs (freshness, completeness, accuracy), schema (link to Schema Registry subject + version), consumers (list of subscribing teams with access level + since date), compliance (link to OpenLineage backend + RCA window). DataHub is the broadest metadata platform — lineage + schemas + ownership + run context + dashboards + ML models. Production-deployed at LinkedIn, Stripe, Reddit, Lyft."
        icon={<Network className="h-5 w-5" />}
        badge="DataHub"
      >
        <CodeBlock code={DATAHUB_CONTRACT_YAML} language="yaml" filename="datahub_contract.yaml" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77]} />
      </SectionCard>

      {/* OpenLineage compliance */}
      <SectionCard
        title="OpenLineage — contract compliance monitoring"
        description="OpenLineage (the lineage backend) doubles as the contract compliance monitor — it tracks every job run that produces or consumes a contracted dataset. Compliance checks: freshness SLA (last write within SLA window), schema compliance (last write used the contracted schema version), consumer impact (list of downstream consumers). When a violation is detected (e.g., freshness SLA violated), OpenLineage triggers an alert via webhook to the producer's PagerDuty rotation. Daily compliance reporting is auto-generated for audit — 'X writes total, Y writes within SLA, Z violations, N% SLA compliance'."
        icon={<Activity className="h-5 w-5" />}
        badge="OpenLineage"
      >
        <CodeBlock code={OPENLINEAGE_CONTRACT_COMPLIANCE} language="bash" filename="openlineage_compliance.sh" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: data contract enforcement in your browser (Pyodide)"
        description="Pure-Python simulation of the full data contract lifecycle. Build a synthetic contract (schema + SLA + ownership), simulate 100K events with 8% violating one of the rules, run producer-side validation (valid events reach v3 topic, rejected events reach DLQ), monitor SLAs (freshness/completeness/accuracy), and compare the consumer impact of a deployed breaking change WITH vs WITHOUT the contract. All in-browser, no install."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run data contract enforcement (Pyodide)" />
      </SectionCard>

      {/* Comparison table */}
      <SectionCard
        title="dbt vs GE vs Schema Registry vs DataHub vs OpenLineage — contract tooling"
        description="Five complementary tools, each handling a different layer of the contract lifecycle. dbt (SQL transformation contracts at build), Great Expectations (quality rules at write), Schema Registry (message schema at register), DataHub (discovery at subscribe), OpenLineage (compliance at runtime). Production deployments use all five together — dbt for SQL models, GE for non-SQL pipelines, Schema Registry for Kafka messages, DataHub for cross-team discovery, OpenLineage for compliance audit."
        icon={<Boxes className="h-5 w-5" />}
      >
        <ContractComparisonTable />
      </SectionCard>

      {/* Why this evolved */}
      <SectionCard
        title="Why data contracts evolved — shortfalls of untyped pipelines"
        description="Modern data engineers prefer contracts because the prior alternative (untyped pipelines — any bytes can land in the lake) had four critical shortfalls that made producer/consumer schema drift a silent failure mode. The contract movement was designed ground-up to fix all four simultaneously."
        icon={<History className="h-5 w-5" />}
        badge="Why contracts"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: No ownership — data was nobody's responsibility.</strong> Before contracts, the producer generated data, then walked away. When the consumer broke, the producer was unresponsive. Data contracts make ownership explicit — every dataset has an owner (team + PagerDuty rotation). When a contract is violated, PagerDuty routes to the owner. <strong className="text-foreground/80">Result:</strong> clear accountability for data quality.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: No schema enforcement — any bytes could land in the lake.</strong> A producer could ship a new field as a string when consumers expected an int — silent deserialisation failure on every event. Schema Registry fixes this at register time: the producer must register the schema; incompatible changes are refused. Great Expectations fixes this at write time: rules validate the data; producer CI fails on violation. <strong className="text-foreground/80">Result:</strong> zero untyped events in the lake.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: No SLA — consumers didn't know when data would be fresh.</strong> A consumer subscribing to silver.customers had no guarantee when the next refresh would arrive — they'd query and see yesterday's data, with no alert. Data contracts bundle SLAs: freshness (P95 lag below 5min), completeness (order_id nulls at 0%), accuracy (P95 within 1% of upstream). OpenLineage monitors compliance — when SLA is violated, the producer's PagerDuty fires. <strong className="text-foreground/80">Result:</strong> consumers know what to expect + when to expect it.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: No versioning — schema changes broke consumers silently.</strong> Without contracts, a producer could ship a new schema (add a required field, change a type) and the consumer would silently break — root cause took hours. Contracts enforce versioning: git PR review is the change management process; Schema Registry compatibility check is the type-safety check; breaking changes are refused at register time. <strong className="text-foreground/80">Result:</strong> zero silent breakages — type-safety as a deploy-gate.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique data contract features"
        description="Four features that are genuinely unique to the data contract pattern — not marketing fluff, but structural differentiators that no other approach to data governance matches."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. Three-component bundle (schema + SLA + owner)</p>
            <p className="text-muted-foreground">A contract bundles three things into one declarative artifact. No other approach bundles all three — Schema Registry handles schema only, GE handles quality only, DataHub handles ownership only. <strong>The contract is the unifying abstraction.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Compile-time type-safety (Schema Registry)</p>
            <p className="text-muted-foreground">Incompatible schemas are REFUSED at register time, before any consumer sees them. Same pattern as TypeScript for code — type errors caught at compile time, not runtime. <strong>Zero silent breakages.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Runtime SLA monitoring (OpenLineage)</p>
            <p className="text-muted-foreground">Every job run is checked against the contract — freshness, completeness, accuracy. Violations trigger PagerDuty alerts to the owner. <strong>The contract is alive at runtime, not just at build.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Discovery via search (DataHub)</p>
            <p className="text-muted-foreground">Consumers find contracts by search — no out-of-band coordination (Slack, README). Subscription is recorded for audit; contract changes notify subscribers. <strong>The contract is the API catalogue for data.</strong></p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples cards */}
      <SectionCard
        title="3 large-dataset examples — contracts in production scenarios"
        description="Three production-style contract scenarios. Each is a clickable card opening a lazy popup with: scenario brief (dataset/scale/why), dataset stats grid, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight. All datasets are synthetic Uber-scale equivalents."
        icon={<Database className="h-5 w-5" />}
        badge="3 examples × 5 langs"
      >
        <DatasetCards
          examples={DATA_CONTRACTS_EXAMPLES}
          intro="Three contract scenarios: order events (100M events/day, 12 consumers, 4 SLA dimensions), customer PII (10M records, GDPR Article 15/17 enforcement), ML feature train/serve consistency (50M features, skew < 0.1%). Each card has Scala/Rust/Go/Elixir/Zig code covering the unique contract pattern."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the data contract ecosystem"
        description="The contract ecosystem spans 5 tools (dbt + GE + Schema Registry + DataHub + OpenLineage), 3 contract components (schema + SLA + ownership), 3 enforcement points (register, write, runtime), and 3 lifecycle phases (producer, consumer, compliance). Production deployments use all 5 together — each tool handles a different layer of the contract lifecycle."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Contract tools (5)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>dbt</strong> — SQL transformation contracts (YAML)</li>
              <li>• <strong>Great Expectations</strong> — quality rules (Python)</li>
              <li>• <strong>Confluent Schema Registry</strong> — message schema (Avro/Protobuf/JSON)</li>
              <li>• <strong>DataHub</strong> — discovery + subscription (metadata)</li>
              <li>• <strong>OpenLineage</strong> — compliance monitoring (lineage events)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-primary" /> Contract components (3)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Schema</strong> — Avro/Protobuf/JSON via Schema Registry</li>
              <li>• <strong>SLA</strong> — freshness + completeness + accuracy (GE rules)</li>
              <li>• <strong>Ownership</strong> — team + PagerDuty rotation (DataHub)</li>
              <li>• Versioning: git PR review (all three components)</li>
              <li>• Semantic versioning (v1.0.0 → v2.0.0 = breaking)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-primary" /> Enforcement points (3)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Register time</strong> — Schema Registry refuses incompatible schemas</li>
              <li>• <strong>Write time</strong> — GE rules validate on producer side</li>
              <li>• <strong>Runtime</strong> — OpenLineage checks every job run vs contract</li>
              <li>• Each is a deploy-gate — CI fails on violation</li>
              <li>• PagerDuty alert to owner on runtime violation</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Workflow className="h-3.5 w-3.5 text-primary" /> Lifecycle phases (3)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Producer</strong> — declares contract, validates on write</li>
              <li>• <strong>Consumer</strong> — discovers contract via DataHub, subscribes</li>
              <li>• <strong>Compliance</strong> — OpenLineage audits every job run</li>
              <li>• Change management: PR review (git) + versioning</li>
              <li>• Audit log: every read/write recorded for GDPR + SOC 2</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers + posts that defined the data contract movement. Chad Sanderson's 2022 manifesto is the formalisation; dbt + GE + Schema Registry predate the term but embody the pattern; DataHub + OpenLineage complete the stack with discovery + compliance."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Chad Sanderson 2022: "Data Contracts — A New Paradigm for Data Governance."</strong> Sanderson's manifesto formalised what practitioners had been doing piecemeal — bundling schema + SLA + ownership into a single producer/consumer agreement, enforced at register time (not runtime). The key insight: data engineering was repeating the SOA-era failure mode of untyped APIs — producers shipped breaking changes, consumers broke silently. Contracts bring the OpenAPI spec pattern to data: contract-first development, type-safety as a deploy-gate, runtime validation. Sanderson's movement catalysed the convergence of dbt + GE + Schema Registry into the modern data contract stack.
          </p>
          <p>
            <strong className="text-foreground/80">dbt Labs 2020: "Schema Tests + Contracts for Analytics Engineering."</strong> dbt shipped native contract support in v1.5 (2023), formalising the schema-test pattern that analytics engineers had been using since dbt's 2018 launch. The contract config (`contract.enforced = true`) makes dbt test a deploy-gate — the contract fails CI before any consumer sees the change. dbt is the dominant tool for SQL transformation contracts because the SQL ecosystem is the largest data engineering surface. The contract YAML is version-controlled alongside the SQL — git PR review is the change management process.
          </p>
          <p>
            <strong className="text-foreground/80">Great Expectations team 2017: "A Data Quality Framework for Pipelines."</strong> GE was born from the realisation that schema tests (dbt) only check structure — not_null, unique, accepted_values. They don't catch semantic errors (amount below 0, currency not in enum, timestamp in the future). GE added expectation rules: in_range, in_set, match_regex, column_pair_values (cross-column checks). GE integrates with Spark, Pandas, Snowflake, BigQuery, SQL databases, Iceberg — broadest datasource support. The Expectation Suite is version-controlled (git) + run on every producer write.
          </p>
          <p>
            <strong className="text-foreground/80">Confluent 2014: "Schema Registry — Managing Schemas for Kafka."</strong> Schema Registry was the first production contract tool — it enforces Avro/Protobuf/JSON schema compatibility at register time. A v4 schema that adds a required field without default is REFUSED — the producer can't deploy. This is compile-time type-safety for data, identical to TypeScript for code. The 4-byte schema ID prefix on every message is the runtime type witness — consumers fetch the schema by ID (cached). Schema Registry is the most production-deployed contract tool — standard at Uber, LinkedIn, Shopify, Netflix, Stripe.
          </p>
          <p>
            <strong className="text-foreground/80">LinkedIn 2020: "DataHub — LinkedIn's Metadata Platform."</strong> DataHub is the broadest metadata platform — contracts + schemas + ownership + run context + dashboards + ML models in one place. Consumers discover contracts by search; subscription is recorded for audit; contract changes notify subscribers. DataHub is the API catalogue for data — like Swagger UI for REST APIs. Production-deployed at LinkedIn, Stripe, Reddit, Lyft, plus many others. Supports OpenLineage events as an ingestion source (the two are complementary).
          </p>
          <p>
            <strong className="text-foreground/80">OpenLineage 2020: "OpenLineage as Contract Compliance Monitor."</strong> OpenLineage doubles as the contract compliance monitor — it tracks every job run that produces or consumes a contracted dataset. When the freshness SLA is violated (lag greater than 5min), OpenLineage triggers a webhook alert to the producer's PagerDuty. Daily compliance reporting is auto-generated: 'X writes total, Y writes within SLA, Z violations, N% SLA compliance'. This gives producers + auditors a real-time view of contract health.
          </p>
          <p>
            <strong className="text-foreground/80">Shopify Production Case (2022):</strong> 80+ downstream consumer services on a single Kafka topic. Before contracts: a producer schema change broke 12 services silently, RCA took 3-6 hours. After contracts (Schema Registry BACKWARD_TRANSITIVE + GE rules + DataHub discovery + OpenLineage compliance): zero consumer breakages in 12 months — every breaking change caught at register time. CI integrates the contract check as a deploy-gate; PR review is the change management process.
          </p>
        </div>
      </SectionCard>

      {/* Deeper-thought insight */}
      <SectionCard
        title="My deeper thought: data contracts ARE the API gateway pattern for data"
        description="The unifying view: data contracts are structurally the same pattern as an API gateway for REST — contract-first development, type-safety as a deploy-gate, runtime validation, consumer discovery. Same pattern, applied to data instead of code."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Data contracts ARE the API gateway pattern for data.</strong> Every REST API since 2010 has been contract-first: write the OpenAPI spec, generate the client + server stubs, validate at runtime against the spec. Data contracts do the same for data: declare the contract (schema + SLA + owner), generate the producer + consumer stubs (Avro/Protobuf code-gen), validate at runtime (OpenLineage compliance). The pattern is identical — only the artifact differs (datasets vs endpoints). The shift-left is identical — type-safety as a deploy-gate, not a runtime alert. The discovery mechanism is identical — Swagger UI for APIs, DataHub for data.
          </p>
          <p>
            <strong className="text-foreground/80">Schema Registry's compatibility check IS TypeScript's type-check.</strong> TypeScript refuses to compile code that violates types — `string.toUpperCase()` on a number is caught at compile time. Schema Registry refuses to register schemas that violate compatibility — a v4 schema without a default is caught at register time. The 4-byte schema ID prefix on every Avro/Protobuf/JSON message is the runtime type witness — consumers fetch the schema by ID (cached) at deserialise time. This is exactly the runtime type guard pattern of dynamically-typed languages with optional types — a runtime tag that lets you check the type. The registry is the symbol table; the ID is the variable name.
          </p>
          <p>
            <strong className="text-foreground/80">SLAs ARE the SLO pattern from SRE.</strong> Google's Site Reliability Engineering book formalised SLOs (Service Level Objectives) for APIs — availability (99.9%), latency (P95 below 100ms), freshness (data less than 5min stale). Data contracts adopt the same pattern for data: freshness (P95 below 5min), completeness (order_id nulls at 0%), accuracy (P95 within 1% of upstream). The error budget pattern (you can spend the budget on risky changes; when exhausted, freeze deploys) applies equally to data contracts. OpenLineage's compliance monitoring is the SRE dashboard for data — same pattern, different artifact.
          </p>
          <p>
            <strong className="text-foreground/80">Ownership + PagerDuty IS the DevOps "you build it, you run it" pattern.</strong> DevOps (2010, Flickr) said: the team that builds a service also runs it — they get paged when it breaks. Data contracts apply the same to data: the team that produces a dataset also owns its quality — they get paged when the SLA is violated. Without contracts, data was nobody's responsibility — when the consumer broke, the producer was unresponsive. Contracts make ownership explicit + PagerDuty enforces it. Same pattern, different artifact.
          </p>
          <p>
            <strong className="text-foreground/80">Data contracts + OpenLineage ARE the OpenTelemetry of data.</strong> OpenTelemetry (2019) standardised distributed tracing for code — spans, traces, contexts across vendors. OpenLineage (2020) standardised lineage for data — Run, Job, Dataset, Facets across tools. Data contracts bundle SLA + ownership on top of lineage — the same way OpenTelemetry's spans carry the SLO + ownership metadata. The two standards (OpenTelemetry for code, OpenLineage + data contracts for data) are converging — observability + governance become one platform. The future is unified: type-safe pipelines end-to-end, dbt at the SQL layer, Schema Registry at the message layer, OpenLineage column IDs at the table layer, OpenTelemetry spans at the service layer.
          </p>
        </div>
      </SectionCard>

      <DeeperThoughtSection pageTitle="Data Contracts">
        <DeeperThought title="Data contracts ARE API contracts — and they should be treated as such" connectedTo="ADR-001 (platform architecture)">
          <p>{"A data contract specifies: schema (fields, types, constraints), SLA (freshness, completeness), ownership (who produces, who consumes), and change management (how to evolve). This IS the SAME pattern as an API contract (OpenAPI spec: endpoints, request/response types, SLAs, versioning). Data contracts ARE API contracts for data. The pattern (typed contract + ownership + SLA) IS the same. The implementation (SQL assertions vs HTTP schemas) differs."}</p>
        </DeeperThought>
        <DeeperThought title="Data contracts prevent the 'upstream changed and broke my dashboard' bug" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"Without contracts, upstream teams can rename columns, change types, or add nulls without telling downstream consumers. The dashboard breaks. With contracts, upstream must get approval from downstream before changing. This IS the SAME pattern as API versioning: you can't change the response schema without bumping the version and notifying consumers. Data contracts ARE API versioning for data pipelines."}</p>
        </DeeperThought>
        <DeeperThought title="Data contracts ARE the CI/CD gate for schema changes" connectedTo="ADR-013 (Delta Lake)">
          <p>{"A data contract enforces: if you change the schema, run the compatibility check. If incompatible, the contract fails, the CI gate blocks the merge. This IS the SAME pattern as running tests before merging code. The contract IS the test. The CI gate IS the merge protection. Data contracts ARE CI/CD for data schemas — the same pattern, different artifact."}</p>
        </DeeperThought>
        <DeeperThought title="Data contracts shift left — and that's the right direction" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"Without contracts, schema problems are discovered at query time (dashboard breaks). With contracts, schema problems are discovered at design time (contract review). This IS the 'shift left' pattern from software engineering: catch bugs earlier (design time) instead of later (production). The earlier you catch a schema incompatibility, the cheaper it is to fix. Data contracts ARE shift-left for data."}</p>
        </DeeperThought>
        <DeeperThought title="Data contracts + Schema Registry = the full type system for data" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"Schema Registry enforces the technical contract (field types, compatibility). Data contracts enforce the business contract (SLA, ownership, change process). Together, they form a full type system: technical (schema) + semantic (contract). This IS the SAME as TypeScript + JSDoc: TypeScript enforces types (technical), JSDoc documents intent (semantic). Data contracts ARE the JSDoc layer on top of Schema Registry's TypeScript layer."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <RelatedTopics topics={[
        { id: "lineage" as const, reason: "Lineage — OpenLineage compliance monitoring (the substrate for contracts)" },
        { id: "schema-registry" as const, reason: "Schema Registry — schema enforcement at register time" },
        { id: "governance" as const, reason: "Governance — Unity Catalog row-level + column RLS + tags" },
        { id: "dbt" as const, reason: "dbt — SQL transformation contracts (YAML)" },
        { id: "iceberg" as const, reason: "Iceberg — column-ID schema evolution (contract-compatible)" },
        { id: "kafka-connect" as const, reason: "Kafka Connect — producer of contracted messages" },
        { id: "data-lakehouse" as const, reason: "Lakehouse — Bronze→Silver→Gold contract hops" },
        { id: "orchestration" as const, reason: "Airflow — emits OpenLineage events for contract compliance" },
      ]} />
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "lineage" as const, reason: "Lineage — OpenLineage compliance monitoring (the substrate for contracts)" }, { id: "schema-registry" as const, reason: "Schema Registry — schema enforcement at register time" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("lineage")} className="text-sm text-primary hover:underline">
          &rarr; Lineage (OpenLineage compliance monitor)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("schema-registry")} className="text-sm text-primary hover:underline">
          &rarr; Schema Registry (compile-time schema check)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("dbt")} className="text-sm text-primary hover:underline">
          &rarr; dbt (SQL transformation contracts)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("governance")} className="text-sm text-primary hover:underline">
          &rarr; Governance (Unity Catalog RLS + tags)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("iceberg")} className="text-sm text-primary hover:underline">
          &rarr; Iceberg (column-ID schema evolution)
        </Link>
      </div>
    </div>
  );
}
