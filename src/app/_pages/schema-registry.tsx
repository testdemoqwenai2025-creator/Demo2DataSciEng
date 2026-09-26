"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { SCHEMA_REGISTRY_EXAMPLES } from "../_components/_dataset_examples5";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  ShieldCheck, Layers, Database, Atom, GitBranch, History,
  Activity, FileText, Network, Sparkles, Cpu, TrendingUp,
  Server, Cloud, Boxes,
} from "lucide-react";

// ============================================================
// Code snippets
// ============================================================

const AVRO_SCHEMA_DEF = `-- ============================================================
-- Avro schema — record + fields with optional defaults
-- Schema Registry enforces BACKWARD_TRANSITIVE on register
-- ============================================================

// orders-value-v1.avsc — original Avro schema (6 fields)
{
  "type": "record",
  "name": "Order",
  "namespace": "com.moderndatascieng",
  "doc": "Production orders event (CDC from MySQL orders_fct)",
  "fields": [
    {"name": "order_id",     "type": "long",    "doc": "PK from MySQL"},
    {"name": "customer_id",  "type": "long"},
    {"name": "amount_usd",   "type": "double",  "default": 0.0},
    {"name": "currency",     "type": "string",  "default": "USD"},
    {"name": "order_ts",     "type": "long",    "doc": "epoch millis"},
    {"name": "status",       "type": {
      "type": "enum",
      "name": "OrderStatus",
      "symbols": ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"]
    }}
  ]
}

// orders-value-v2.avsc — add optional field with default (BACKWARD compatible)
// Schema Registry accepts this — new readers tolerate the field's absence
// in old data (default value filled in automatically).
{
  "type": "record",
  "name": "Order",
  "namespace": "com.moderndatascieng",
  "fields": [
    {"name": "order_id",     "type": "long"},
    {"name": "customer_id",  "type": "long"},
    {"name": "amount_usd",   "type": "double",  "default": 0.0},
    {"name": "currency",     "type": "string",  "default": "USD"},
    {"name": "order_ts",     "type": "long"},
    {"name": "status",       "type": {...}},
    // NEW: optional field, default null — backward compatible
    {"name": "discount_code", "type": ["null", "string"], "default": null}
  ]
}

// orders-value-v3.avsc — rename via aliases (FORWARD compatible)
// Old consumers using field name 'ship_ctry' can still read v3 events
// because the alias bridges the rename.
{
  "type": "record",
  "name": "Order",
  "namespace": "com.moderndatascieng",
  "fields": [
    // ... all v2 fields preserved ...
    {"name": "discount_code", "type": ["null", "string"], "default": null},
    // RENAME: 'ship_ctry' -> 'ship_country' (alias bridges the rename)
    {"name": "ship_country", "type": "string", "default": "UNKNOWN",
     "aliases": ["ship_ctry"]}
  ]
}

// Subject strategies (where the schema gets registered):
//   TopicNameStrategy:        "<topic>-value", "<topic>-key"
//   RecordNameStrategy:       "<record-name>" (e.g., "com.moderndatascieng.Order")
//   TopicRecordNameStrategy:  hybrid (record name in topic-value subject)`;

const SCHEMA_REGISTRY_REST = `# ============================================================
# Schema Registry REST API — register, check, fetch schemas
# Default port: 8081. Backed by Kafka internal topic (_schemas).
# ============================================================

# 1. Register a new schema (auto-creates subject if first version)
curl -X POST http://schema-registry:8081/subjects/orders-value/versions \\
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \\
  -d '{
    "schema": "{\\"type\\":\\"record\\",\\"name\\":\\"Order\\",\\"fields\\\":[...]}",
    "schemaType": "AVRO"
  }'

# Response: { "id": 42 }   -- the schema ID prepended to every Avro message

# 2. Check compatibility BEFORE registering (saves a failed register)
curl -X POST \\
  http://schema-registry:8081/compatibility/subjects/orders-value/versions/latest \\
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \\
  -d '{
    "schema": "{...\\"fields\\":[..., {\\"name\\":\\"discount\\",\\"default\\":0.0}]}",
    "schemaType": "AVRO"
  }'

# Response: {"is_compatible": true, "messages": []}
# If false: messages explain why (e.g., "new field 'discount' has no default")

# 3. Set per-subject compatibility (BACKWARD_TRANSITIVE = default for Avro)
curl -X PUT http://schema-registry:8081/config/orders-value \\
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \\
  -d '{"compatibility": "BACKWARD_TRANSITIVE"}'

# Compatibility levels (most to least strict):
#   NONE                — no checking (DEV only!)
#   BACKWARD            — new reads old (most common)
#   BACKWARD_TRANSITIVE — new reads ALL old versions
#   FORWARD             — old reads new
#   FORWARD_TRANSITIVE  — old reads ALL new versions
#   FULL                — backward + forward
#   FULL_TRANSITIVE     — backward + forward across all versions

# 4. List all subjects (every topic-key + topic-value has one)
curl http://schema-registry:8081/subjects
# ["orders-key", "orders-value", "trades-key", "trades-value", ...]

# 5. List versions of a subject
curl http://schema-registry:8081/subjects/orders-value/versions
# [1, 2, 3, 4]   -- 4 backward-compatible versions

# 6. Fetch a specific version (or "latest")
curl http://schema-registry:8081/subjects/orders-value/versions/3
# Returns the full Avro schema JSON for v3

# 7. Fetch by schema ID (used by consumers — ID is in every Avro message)
curl http://schema-registry:8081/schemas/42
# Returns {"schema": "...", "schemaType": "AVRO", "id": 42}

# 8. Soft-delete a version (use ?permanent=true for hard-delete)
curl -X DELETE http://schema-registry:8081/subjects/orders-value/versions/3
# Returns the deleted version number — soft-deleted, still fetchable by ID

# 9. Global config (fallback when no subject-level config set)
curl http://schema-registry:8081/config
# {"compatibilityLevel": "BACKWARD_TRANSITIVE"}`;

const PROTOBUF_SCHEMA_DEF = `// ============================================================
// Protobuf schema — field-tag-based wire format
// Compatibility governed by TAG NUMBERS, not field names
// ============================================================

syntax = "proto3";
package com.moderndatascieng.trades;
option java_package = "com.moderndatascieng.trades.proto";
option java_multiple_files = true;

// v1 — original trade message (tags 1-3)
message Trade {
  reserved 1 to 19;   // reserve low tags for future primary keys
  reserved 20 to 99;  // reserve mid tags for future fields

  int64 trade_id    = 100;  // start at 100 to leave room for future low tags
  int64 account_id  = 101;
  double notional_usd = 102;
}

// v2 — add field with NEW tag (always backward compatible)
// Old readers ignore unknown tags silently (Protobuf spec)
message Trade {
  reserved 1 to 19;
  reserved 20 to 99;

  int64 trade_id    = 100;
  int64 account_id  = 101;
  double notional_usd = 102;
  string ticker     = 103;  // NEW tag — old readers ignore unknown tags
}

// v3 — remove field, RESERVE its tag (PREVENT reuse)
// Without 'reserved', a future field could reuse tag 102 — old events
// would then deserialize the new field with OLD data (silent corruption!)
message Trade {
  reserved 1 to 19;
  reserved 20 to 99;
  reserved 102;             // tag 102 deleted — must reserve
  reserved "notional_usd";  // also reserve the field name

  int64 trade_id    = 100;
  int64 account_id  = 101;
  string ticker     = 103;
  int64 qty         = 104;  // NEW tag — backward compatible
}

// Field type changes (DANGEROUS):
//   - wire-compatible: int32 -> int64 (same wire type) — usually OK
//   - wire-incompatible: int32 -> string — REJECTED by Schema Registry
//   - field rename without alias: REJECTED (would break old readers)

// Protobuf compatibility rules (Confluent Schema Registry):
//   - Adding a field with a NEW tag: always OK
//   - Removing a field: must 'reserve' the tag
//   - Changing field type: depends on wire-compatibility
//   - Renaming a field: must keep the same tag (name is just a comment)
//   - Changing tag number: NEVER OK (would change wire format)`;

const ICEBERG_SCHEMA_EVOLUTION = `-- ============================================================
-- Iceberg schema evolution — column-ID stability
-- Renames/adds/drops don't rewrite data files (metadata-only)
-- ============================================================

-- Iceberg assigns each column a stable INTEGER ID at create time.
-- The column NAME can change; the ID is the truth.

-- 1. Create an Iceberg table (column IDs 1, 2, 3, 4, 5, 6)
CREATE TABLE iceberg.orders_fct (
  order_id        BIGINT,        -- column ID 1
  customer_id     BIGINT,        -- column ID 2
  amount_usd      DECIMAL(18,4), -- column ID 3
  currency        STRING,        -- column ID 4
  order_ts        TIMESTAMP,    -- column ID 5
  status          STRING         -- column ID 6
) USING iceberg
PARTITIONED BY (days(order_ts))
TBLPROPERTIES ('format-version' = '2');

-- 2. Rename a column (METADATA-ONLY — no file rewrite)
-- Old Parquet files still have column ID 4 = 'currency';
-- Iceberg remaps 'currency' -> 'curr_code' on read.
ALTER TABLE iceberg.orders_fct RENAME COLUMN currency TO curr_code;

-- 3. Add a column with default (METADATA-ONLY)
-- Old Parquet files don't have this column — Iceberg fills with default.
ALTER TABLE iceberg.orders_fct ADD COLUMN discount_code STRING AFTER curr_code;

-- 4. Drop a column (METADATA-ONLY — soft delete, NOT hard delete)
-- The column is marked removed in metadata.json;
-- old Parquet files still have the column (Iceberg ignores it on read).
ALTER TABLE iceberg.orders_fct DROP COLUMN status;

-- 5. Promote a type (wider, not narrower — e.g., int -> bigint)
-- This requires file rewrite if narrower; wider is OK (cast on read).
ALTER TABLE iceberg.orders_fct ALTER COLUMN amount_usd TYPE DECIMAL(20, 4);

-- 6. Schema history (inspect all versions of the table schema)
SELECT * FROM iceberg.orders_fct.history;
-- Each schema change creates a new metadata.json version (current pointer atomic)

-- 7. Compaction (separate concern from schema evolution)
-- Run periodically to merge small files into target-file-size files
CALL iceberg.system.rewrite_data_files(
  'moderndatascieng', 'warehouse', 'orders_fct',
  table_options => MAP(
    ARRAY['target-file-size-bytes', 'min-input-files'],
    ARRAY['536870912', '5']   -- 512MB target, min 5 input files
  )
);`;

const GLUE_SCHEMA_REGISTRY = `# ============================================================
# AWS Glue Schema Registry — AWS-native alternative to Confluent
# IAM-authenticated, no separate REST service required (uses AWS APIs)
# ============================================================

# 1. Create a registry (container for schemas)
aws glue create-registry \\
  --registry-name moderndatascieng-prod

# 2. Create a schema (Avro, JSON, or Protobuf)
aws glue create-schema \\
  --registry-id RegistryName=moderndatascieng-prod \\
  --schema-name orders-value \\
  --data-format AVRO \\
  --compatibility BACKWARD \\
  --schema-definition file://orders-value-v1.avsc

# Response: {"SchemaArn": "arn:aws:glue:us-east-1:123:registry/...",
#            "SchemaId": "...", "VersionNumber": 1}

# 3. Register a new version (compatibility-checked by Glue)
aws glue register-schema-version \\
  --schema-id SchemaName=orders-value,RegistryName=moderndatascieng-prod \\
  --schema-definition file://orders-value-v2.avsc

# Response: {"VersionNumber": 2, "Status": "CREATE_IN_PROGRESS"}
# If incompatible: Status=FAILURE, error message in metadata

# 4. List versions + fetch a specific version
aws glue list-schema-versions \\
  --schema-id SchemaName=orders-value,RegistryName=moderndatascieng-prod

aws glue get-schema-version \\
  --schema-id SchemaName=orders-value,RegistryName=moderndatascieng-prod \\
  --schema-version-number Latest

# 5. Configure Kafka Connect to use Glue Schema Registry
# (avro-data-format and AWS serializer)
# In connect-distributed.properties:
key.converter=com.amazonaws.services.schemaregistry.kafkaconnect.AWSAvroConverter
value.converter=com.amazonaws.services.schemaregistry.kafkaconnect.AWSAvroConverter
key.converter.region=us-east-1
value.converter.region=us-east-1
key.converter.registryName=moderndatascieng-prod
value.converter.registryName=moderndatascieng-prod

# 6. IAM policy for producers/consumers (uses Sigv4, not credentials)
{
  "Version": "2012-10-17",
  "Statement": [
    {"Effect": "Allow",
     "Action": ["glue:GetSchemaVersion", "glue:GetSchemaVersions"],
     "Resource": "arn:aws:glue:us-east-1:123:registry/moderndatascieng-prod/*"},
    {"Effect": "Allow",
     "Action": ["glue:PutSchemaVersionMetadata", "glue:RegisterSchemaVersion"],
     "Resource": "arn:aws:glue:us-east-1:123:registry/moderndatascieng-prod/*"}
  ]
}

# Differences vs Confluent:
#   - Glue uses AWS IAM auth (no separate PAT/secret to manage)
#   - Glue is multi-tenant (one registry per AWS account)
#   - Glue supports Avro/JSON/Protobuf (same as Confluent)
#   - Glue is cheaper at low scale (no per-node REST service to run)`;

// ============================================================
// Pyodide demo — schema compatibility checker in browser
// ============================================================

const PYODIDE_DEMO = `# ============================================================
# Schema Registry compatibility checker — in-browser simulation
# Build synthetic schema versions, walk the compatibility rules,
# show how Schema Registry rejects incompatible changes.
# ============================================================

import random
from collections import defaultdict

# --- Avro schema representation (simplified) ---
class AvroSchema:
    """An Avro record schema. Fields have names + optional defaults."""
    def __init__(self, name, fields):
        self.name = name
        self.fields = fields  # list of dicts: {"name": str, "type": str, "default": optional}

    def field_names(self):
        return {f['name'] for f in self.fields}

    def fields_with_defaults(self):
        return {f['name'] for f in self.fields if 'default' in f}

    def aliases_map(self):
        """Map alias name -> canonical name."""
        m = {}
        for f in self.fields:
            for a in f.get('aliases', []):
                m[a] = f['name']
        return m

    def __repr__(self):
        return f"AvroSchema({self.name}, {len(self.fields)} fields)"


# --- Compatibility rules ---
def is_backward_compatible(old, new):
    """New schema can read OLD data (backward compatibility).
       Rule: every old field is in new OR is removed safely (default exists in new),
       AND every new field has a default (so old data without it parses)."""
    old_set = old.field_names()
    new_set = new.field_names()
    new_aliases = new.aliases_map()

    # Old fields must be in new (or aliased to a new field)
    for name in old_set:
        if name in new_set:
            continue
        if name in new_aliases:
            continue
        # Old field missing from new schema — would silently drop old data
        # BACKWARD_COMPATIBLE allows removal if the field is not required,
        # but is safer to refuse. We refuse for now.
        return False, f"old field '{name}' neither present nor aliased in new schema"

    # New fields (added) must have defaults
    added = new_set - old_set
    new_with_default = new.fields_with_defaults()
    for name in added:
        if name not in new_with_default:
            return False, f"new field '{name}' has no default — old data would fail to parse"
    return True, f"backward compatible: {len(old_set & new_set)} preserved, {len(added)} added (all have defaults)"


def is_forward_compatible(old, new):
    """Old schema can read NEW data (forward compatibility).
       Rule: old reader ignores new fields; old fields can be missing from new
       IF old schema's fields all have defaults."""
    old_set = old.field_names()
    new_set = new.field_names()
    new_aliases = new.aliases_map()

    # Old fields in new (by name or alias) — old reader gets them
    bridged = 0
    missing_in_new = []
    for name in old_set:
        if name in new_set or name in new_aliases:
            bridged += 1
        else:
            missing_in_new.append(name)
    # Old reader can read new data if missing-in-new old fields all have defaults
    old_with_default = old.fields_with_defaults()
    for name in missing_in_new:
        if name not in old_with_default:
            return False, f"old field '{name}' has no default and is missing from new schema — old reader fails"

    new_fields_ignored = len(new_set - old_set - set(new_aliases.values()))
    return True, f"forward compatible: {bridged}/{len(old_set)} old fields reachable, {new_fields_ignored} new ignored by old reader"


# --- Test chain: v1 -> v2 -> v3 ---
v1 = AvroSchema("Order", [
    {"name": "order_id", "type": "long"},
    {"name": "customer_id", "type": "long"},
    {"name": "amount_usd", "type": "double", "default": 0.0},
    {"name": "currency", "type": "string", "default": "USD"},
    {"name": "order_ts", "type": "long"},
    {"name": "status", "type": "string"},
])

# v2: add optional field with default (backward compat)
v2 = AvroSchema("Order", v1.fields + [
    {"name": "discount_code", "type": ["null", "string"], "default": None},
])

# v3: rename via aliases (forward compat — old reader uses alias)
v3 = AvroSchema("Order", v2.fields + [
    {"name": "ship_country", "type": "string", "default": "UNKNOWN",
     "aliases": ["ship_ctry"]},
])

# v4_BAD: add field WITHOUT default (NOT backward compatible)
v4_bad = AvroSchema("Order", v3.fields + [
    {"name": "shipping_cost_usd", "type": "double"},  # NO default — bad!
])


# --- Run the checker ---
print("=== Schema Registry compatibility checker ===\\n")

chains = [
    ("v1", v1, "v2", v2),
    ("v2", v2, "v3", v3),
    ("v1", v1, "v3", v3),  # transitive check (v1 -> v3)
    ("v3", v3, "v4_BAD", v4_bad),
]

for old_n, old_s, new_n, new_s in chains:
    print(f"{old_n} -> {new_n}:")
    bw, bw_msg = is_backward_compatible(old_s, new_s)
    fw, fw_msg = is_forward_compatible(old_s, new_s)
    print(f"  backward? {bw} — {bw_msg}")
    print(f"  forward?  {fw} — {fw_msg}")
    if bw and fw:
        print(f"  => FULLY compatible — Schema Registry ACCEPTS registration\\n")
    else:
        print(f"  => NOT compatible — Schema Registry REFUSES registration\\n")

# --- Consumer impact simulation ---
print("=== Consumer impact simulation ===")
n_consumers = 23
n_events = 100_000_000  # 100M events/day
print(f"Subject: orders-value, {n_consumers} consumers, {n_events:,} events/day")

print(f"\\nScenario A (without Schema Registry):")
print(f"  v4_bad deployed with breaking change")
print(f"  -> {n_consumers} services throw deserialisation errors")
print(f"  -> {n_events:,} events/day silently fail or DLQ'd")
print(f"  -> root cause takes hours to diagnose")

print(f"\\nScenario B (with Schema Registry):")
print(f"  v4_bad register attempt — Schema Registry REFUSES")
print(f"  -> deploy fails at register step (no consumer sees v4_bad)")
print(f"  -> developer fixes (adds default) and re-registers")
print(f"  -> 0 consumer breakages")

print("\\nKey insight: Schema Registry enforces type-safety AT REGISTER TIME,")
print("the same way a compiler enforces type-safety AT COMPILE TIME.")
print("Incompatible schemas cannot reach production.")`;

// ============================================================
// Schema Registry topology SVG diagram
// ============================================================

function SchemaRegistryDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("registry");
  const nodes = {
    "producer":  { label: "Producer (Kafka Connect)", desc: "Serialises Avro/Protobuf/JSON events; fetches schema by ID from registry before sending", level: 0 },
    "registry":  { label: "Schema Registry", desc: "Central REST service (port 8081). Stores schemas in Kafka topic _schemas. Enforces BACKWARD_TRANSITIVE compatibility at register time", level: 1 },
    "kafka":      { label: "Kafka Topic", desc: "Each Avro/Protobuf/JSON message carries a 4-byte schema ID prefix. Consumers fetch schema by ID", level: 2 },
    "consumer":   { label: "Consumer (23 services)", desc: "Fetches schema by ID (cached locally). Deserialises events with guaranteed type-safety", level: 3 },
    "glue":       { label: "AWS Glue Registry", desc: "AWS-native alternative — IAM-authenticated, no separate REST service. Same Avro/Protobuf/JSON support", level: 1 },
    "apicurio":   { label: "Apicurio Registry", desc: "Open-source CNCF alternative — supports Avro/Protobuf/JSON + AsyncAPI + OpenAPI. Pluggable storage (Kafka, Postgres, in-memory)", level: 1 },
  };
  const edges = [
    ["producer", "registry"],
    ["registry", "kafka"],
    ["glue", "kafka"],
    ["apicurio", "kafka"],
    ["kafka", "consumer"],
    ["consumer", "registry"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "producer":  { x: 80,  y: 30 },
    "registry":  { x: 200, y: 90 },
    "glue":      { x: 80,  y: 90 },
    "apicurio":  { x: 320, y: 90 },
    "kafka":     { x: 200, y: 150 },
    "consumer":  { x: 200, y: 210 },
  };

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Schema Registry topology — producer → registry → Kafka → consumer (type-safe end-to-end)
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 240" className="w-full h-auto">
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
              node.level === 2 ? "var(--chart-1)" : "var(--chart-4)";
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
            Hover any node — the registry enforces type-safety at register time (like a compiler).
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Registry comparison table
// ============================================================

function RegistryComparisonTable() {
  const rows = [
    { feature: "Origin", confluent: "Confluent (2014)", glue: "AWS (2019)", apicurio: "Red Hat (2018)", iceberg: "Netflix (2017)" },
    { feature: "Wire format", confluent: "Avro / Protobuf / JSON", glue: "Avro / Protobuf / JSON", apicurio: "Avro / Protobuf / JSON + AsyncAPI + OpenAPI", iceberg: "Native schema in metadata.json" },
    { feature: "Storage backend", confluent: "Kafka topic (_schemas)", glue: "AWS Glue catalog (managed)", apicurio: "Kafka / Postgres / in-memory", iceberg: "metadata.json per table" },
    { feature: "Authentication", confluent: "Basic / mTLS / JWT", glue: "AWS IAM (Sigv4)", apicurio: "Basic / OAuth2 / mTLS", iceberg: "Catalog-level (per-backend)" },
    { feature: "Compatibility modes", confluent: "BACKWARD / FORWARD / FULL + transitive", glue: "BACKWARD / FORWARD / FULL", apicurio: "BACKWARD / FORWARD / FULL + custom", iceberg: "N/A (no version compatibility check)" },
    { feature: "Multi-tenant", confluent: "Yes (separate namespaces)", glue: "Yes (one registry per AWS account)", apicurio: "Yes (groups + artifacts)", iceberg: "No (per-table)" },
    { feature: "Open source", confluent: "Confluent Community License (not pure Apache)", glue: "AWS proprietary", apicurio: "Apache 2.0 (pure open source)", iceberg: "Apache 2.0 (pure open source)" },
    { feature: "Kafka-native", confluent: "Yes (Kafka Connectors built-in)", glue: "Yes (Kafka Connect converters)", apicurio: "Yes (Serdes + Connect converters)", iceberg: "N/A (table-format, not message-format)" },
    { feature: "Schema evolution", confluent: "Versions + compatibility checks", glue: "Versions + compatibility checks", apicurio: "Versions + compatibility checks", iceberg: "Column-ID stable across renames/adds/drops" },
    { feature: "Best fit", confluent: "Multi-format Kafka pipelines", glue: "AWS-native stack", apicurio: "Open-source + API specs", iceberg: "Lake table schemas (column IDs)" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          Confluent vs Glue vs Apicurio vs Iceberg schema — registry alternatives
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">Confluent</th>
              <th className="text-left px-3 py-2 font-semibold">AWS Glue</th>
              <th className="text-left px-3 py-2 font-semibold">Apicurio</th>
              <th className="text-left px-3 py-2 font-semibold">Iceberg</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.confluent}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.glue}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.apicurio}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.iceberg}</td>
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
  { label: "Origin", value: "Confluent 2014 / Avro 2009 / Protobuf 2008", hint: "Schema Registry born from the realisation that producer/consumer schema drift was a silent failure mode in Kafka pipelines", deltaTone: "flat" as const },
  { label: "Formats supported", value: "3 (Avro, Protobuf, JSON Schema)", hint: "Pluggable serialiser architecture — any future format (CBOR, MessagePack) can be added without registry changes", deltaTone: "up" as const },
  { label: "Compatibility modes", value: "7 (BACKWARD to FULL_TRANSITIVE)", hint: "Per-subject configurability — most teams use BACKWARD_TRANSITIVE as default, override to NONE for dev subjects", deltaTone: "flat" as const },
  { label: "Production deployments", value: "100K+ Kafka clusters", hint: "Standard at Uber, LinkedIn, Shopify, Netflix, Stripe, JPMorgan — every Kafka pipeline has a registry", deltaTone: "up" as const },
];

export function SchemaRegistryPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Confluent Schema Registry · Glue · Apicurio · Iceberg schema evolution"
        title="Schema Registry — the type system for the data pipeline"
        description="Schema Registry is to data pipelines what TypeScript is to JavaScript: a type system that catches incompatible changes at compile time (register time), not at runtime. Every Avro/Protobuf/JSON message carries a 4-byte schema ID; producers register before sending; consumers fetch by ID (cached). The registry enforces BACKWARD_TRANSITIVE compatibility by default — new schemas must read all old data — and refuses to register incompatible schemas, forcing developers to fix the schema before any consumer sees a breaking change. Three production-grade registries: Confluent (reference impl, REST API), AWS Glue (IAM-native), Apicurio (CNCF open-source). Iceberg has its own schema evolution built-in (column IDs stable across renames/adds/drops). This is the production type-safety stack at every Kafka-driven lakehouse."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><ShieldCheck className="h-3 w-3" /> Type-safe at register time</Badge>
            <Badge variant="outline" className="gap-1.5"><Layers className="h-3 w-3" /> 3 formats · 4 registries</Badge>
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

      {/* Schema Registry topology */}
      <SectionCard
        title="Schema Registry topology — producer → registry → Kafka → consumer"
        description="The standard topology: producers fetch the schema ID from the registry before sending (cached locally); each Avro/Protobuf/JSON message carries a 4-byte schema ID prefix; consumers fetch the schema by ID (cached) and deserialise with guaranteed type-safety. The registry is backed by a Kafka internal topic (_schemas) — so it's HA via Kafka's replication, no separate DB to manage. Three production alternatives: Confluent (REST API on port 8081), AWS Glue (IAM-native, no separate service), Apicurio (CNCF, pluggable storage)."
        icon={<ShieldCheck className="h-5 w-5" />}
        badge="architecture"
      >
        <SchemaRegistryDiagram />
      </SectionCard>

      {/* Avro schema */}
      <SectionCard
        title="Avro schema — record + fields with optional defaults"
        description="Avro is the most common schema format for Kafka pipelines. Schemas are JSON documents describing records + fields. Compatibility rules: BACKWARD requires new fields to have defaults (old data without them parses with the default value); FORWARD requires removed fields to have had defaults in the old schema (old reader reads new data without those fields, default fills in). Renames require aliases to bridge the old name to the new one — both BACKWARD and FORWARD compatible. Schema Registry validates all of this at register time."
        icon={<Layers className="h-5 w-5" />}
        badge="Avro"
      >
        <CodeBlock code={AVRO_SCHEMA_DEF} language="json" filename="orders-value-v1-to-v3.avsc" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67]} />
      </SectionCard>

      {/* Schema Registry REST API */}
      <SectionCard
        title="Schema Registry REST API — register, check, fetch schemas"
        description="The REST API is the control plane for the registry. Producers register new schemas (auto-versioned per subject); CI/CD pipelines check compatibility BEFORE registering (test_compatibility endpoint); consumers fetch by schema ID at runtime (cached). Per-subject compatibility config (BACKWARD_TRANSITIVE default for Avro). Soft-delete (version still fetchable by ID) vs hard-delete (?permanent=true, removes from Kafka topic). The _schemas Kafka topic is the storage substrate — HA via Kafka replication, no separate DB."
        icon={<Server className="h-5 w-5" />}
        badge="REST API"
      >
        <CodeBlock code={SCHEMA_REGISTRY_REST} language="bash" filename="schema_registry_api.sh" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63]} />
      </SectionCard>

      {/* Protobuf schema */}
      <SectionCard
        title="Protobuf schema — field-tag-based wire format"
        description="Protobuf's wire format encodes fields by TAG NUMBER, not field name. Compatibility is therefore governed by tag stability — field names are just comments on the wire. Adding a field with a NEW tag is always safe (old readers ignore unknown tags). Removing a field REQUIRES reserving its tag — never reuse a deleted tag (would silently corrupt old events). Schema Registry enforces these rules at register time. Best practice: reserve tag ranges (1-19, 20-99) for future use, start real fields at 100 to leave room."
        icon={<Atom className="h-5 w-5" />}
        badge="Protobuf"
      >
        <CodeBlock code={PROTOBUF_SCHEMA_DEF} language="protobuf" filename="trades_v1_to_v3.proto" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52]} />
      </SectionCard>

      {/* Iceberg schema evolution */}
      <SectionCard
        title="Iceberg schema evolution — column-ID stability"
        description="Iceberg tables have their own schema evolution built-in, separate from the message-level Schema Registry. Each column gets a stable INTEGER ID at create time; renames just update metadata.json (column 4 is now called 'curr_code' instead of 'currency'); adds just append ID N+1; drops mark the column removed. Old Parquet files still have the old column name — Iceberg remaps on read using the ID. This is metadata-only — no Parquet file rewrites, zero downtime for downstream consumers."
        icon={<Database className="h-5 w-5" />}
        badge="Iceberg schema"
      >
        <CodeBlock code={ICEBERG_SCHEMA_EVOLUTION} language="sql" filename="iceberg_schema_evolution.sql" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47]} />
      </SectionCard>

      {/* Glue Schema Registry */}
      <SectionCard
        title="AWS Glue Schema Registry — AWS-native alternative"
        description="AWS Glue Schema Registry is the AWS-native alternative to Confluent. Auth is IAM (Sigv4) — no separate PAT/secret to manage. Storage is the Glue catalog (managed, no Kafka topic to provision). Supports Avro/JSON/Protobuf (same as Confluent). Multi-tenant by design — one registry per AWS account, namespaces within. Kafka Connect integrates via the AWS Avro Converter (replaces Confluent's AvroConverter). Cheaper at low scale (no per-node REST service to run); more expensive at high scale (per-API-call pricing)."
        icon={<Cloud className="h-5 w-5" />}
        badge="AWS Glue"
      >
        <CodeBlock code={GLUE_SCHEMA_REGISTRY} language="bash" filename="glue_schema_registry.sh" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: simulate the Schema Registry compatibility checker (Pyodide)"
        description="Pure-Python simulation of the Schema Registry compatibility checker. Build synthetic Avro schema versions v1 → v2 → v3 → v4_BAD. Walk the BACKWARD + FORWARD compatibility rules; see how v4_BAD (new field without default) is REFUSED at register time. Compare consumer impact: without registry, v4_BAD silently breaks 23 services on 100M events/day; with registry, the deploy fails at register time before any consumer sees a breaking event."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run Schema Registry compatibility checker (Pyodide)" />
      </SectionCard>

      {/* Comparison table */}
      <SectionCard
        title="Confluent vs Glue vs Apicurio vs Iceberg — registry alternatives"
        description="Four schema-management alternatives. Confluent is the reference impl + most production-deployed (REST API, multi-tenant via namespaces). AWS Glue is the AWS-native option (IAM auth, no separate service). Apicurio is the pure open-source CNCF option (Apache 2.0 license, supports API specs too). Iceberg has its OWN schema evolution built-in (column IDs) — it doesn't need a separate registry for table schemas (though it still uses one for Kafka messages feeding the table)."
        icon={<Boxes className="h-5 w-5" />}
      >
        <RegistryComparisonTable />
      </SectionCard>

      {/* Why this evolved */}
      <SectionCard
        title="Why Schema Registry evolved — shortfalls of untyped Kafka pipelines"
        description="Modern data engineers prefer Schema Registry because the prior alternative (untyped Kafka) had four critical shortfalls that made producer/consumer schema drift a silent failure mode. Schema Registry was designed ground-up to fix all four simultaneously."
        icon={<History className="h-5 w-5" />}
        badge="Why Schema Registry"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: No schema enforcement in Kafka.</strong> Kafka itself is byte-oriented — any bytes can be sent to a topic, with no schema validation. A producer sending the wrong serialisation format (Avro to a JSON consumer) would fail at deserialise time, on every event, silently. Schema Registry requires registration BEFORE sending; the Avro/Protobuf/JSON converter checks the schema ID is registered, refuses to send unregistered schemas. <strong className="text-foreground/80">Result:</strong> zero untyped events in the topic.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: Avro schemas were scattered (no central registry).</strong> Before Schema Registry, every team kept their Avro schemas in their own repo (.avsc files committed alongside producer/consumer code). Schema drift was inevitable — producer adds a field, forgets to update the consumer's .avsc, silent deserialisation failure. Schema Registry centralises schemas in one service; every consumer fetches by ID at runtime; the latest schema is always used. <strong className="text-foreground/80">Result:</strong> one source of truth, no out-of-band schema sharing.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: No compatibility checking (any change broke consumers).</strong> Without the registry, a developer could add a required field (no default) and deploy — consumers would silently fail at deserialise time, on every event. The breakage wouldn't surface until production traffic hit, often hours later. Schema Registry checks compatibility BEFORE register — if BACKWARD_TRANSITIVE is set, the new schema must read all old data, and the register API REFUSES incompatible schemas. <strong className="text-foreground/80">Result:</strong> deploy-time enforcement — bad schemas never reach production.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: No schema discovery (consumers didn't know the schema).</strong> Before Schema Registry, consumers had to be told out-of-band which schema a topic used (Slack message, README, etc.). When the producer changed the schema, the consumer wasn't notified — silent failure. Schema Registry exposes the schema by ID — every message carries the ID, consumers auto-fetch on first sight (cached). Schema evolution is transparent to consumers (the latest schema is always fetched). <strong className="text-foreground/80">Result:</strong> consumers always use the right schema; no out-of-band coordination.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique Schema Registry features"
        description="Four features that are genuinely unique to the Schema Registry pattern — not marketing fluff, but structural differentiators that no other schema-management approach matches."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. Backward/forward/full compatibility</p>
            <p className="text-muted-foreground">7 configurable compatibility levels (NONE, BACKWARD, BACKWARD_TRANSITIVE, FORWARD, FORWARD_TRANSITIVE, FULL, FULL_TRANSITIVE). Per-subject configurability lets you set strict mode for production topics + lenient for dev subjects.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Three wire formats (Avro / Protobuf / JSON)</p>
            <p className="text-muted-foreground">Same registry, three formats — pluggable serialiser architecture. Avro (binary, evolved), Protobuf (tag-based), JSON Schema (text, permissive). Future formats (CBOR, MessagePack) can be added without registry changes.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Subject-based naming strategies</p>
            <p className="text-muted-foreground">Three subject strategies: TopicNameStrategy (topic-key/topic-value), RecordNameStrategy (per-record), TopicRecordNameStrategy (hybrid). Lets you share a schema across topics OR enforce one-schema-per-topic.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Schema evolution rules (add/remove/rename)</p>
            <p className="text-muted-foreground">Enforced rules: add field with default (backward compat), remove field (forward compat if old had default), rename via aliases (forward compat), change type (wire-compat checks). No other schema tool enforces this at register time.</p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples cards */}
      <SectionCard
        title="3 large-dataset examples — schema evolution across 3 wire formats"
        description="Three production-style schema-evolution scenarios showing Schema Registry in action. Each is a clickable card opening a lazy popup with: scenario brief (dataset/scale/why), dataset stats grid, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight. All datasets are synthetic Uber-scale equivalents."
        icon={<Database className="h-5 w-5" />}
        badge="3 examples × 5 langs"
      >
        <DatasetCards
          examples={SCHEMA_REGISTRY_EXAMPLES}
          intro="Three schema-evolution scenarios: Avro backward+forward compat (100M events), Protobuf field-tag stability (50M events), JSON Schema strict+lenient validation (10M events). Each card has Scala/Rust/Go/Elixir/Zig code covering the unique compatibility characteristic."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the Schema Registry ecosystem"
        description="The Schema Registry ecosystem spans 4 implementations (Confluent, Glue, Apicurio, Iceberg), 3 wire formats (Avro, Protobuf, JSON Schema), and 7 compatibility modes. Production deployments integrate with Kafka Connect (auto-validate at produce time) and CI/CD pipelines (check compatibility before deploy)."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Registries (4)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Confluent Schema Registry</strong> — reference impl, REST API on 8081</li>
              <li>• <strong>AWS Glue Schema Registry</strong> — IAM-native, no separate service</li>
              <li>• <strong>Apicurio Registry</strong> — CNCF, Apache 2.0, pluggable storage</li>
              <li>• <strong>Iceberg schema</strong> — built-in (column IDs, metadata.json)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-primary" /> Wire formats (3)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Avro</strong> — binary, schema embedded in registry (no per-message)</li>
              <li>• <strong>Protobuf</strong> — tag-based, field names are wire-irrelevant</li>
              <li>• <strong>JSON Schema</strong> — text, permissive, no wire-format guarantees</li>
              <li>• Future: CBOR, MessagePack (pluggable)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><GitBranch className="h-3.5 w-3.5 text-primary" /> Compatibility modes (7)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>NONE</strong> — no checking (DEV only)</li>
              <li>• <strong>BACKWARD</strong> — new reads old (most common)</li>
              <li>• <strong>BACKWARD_TRANSITIVE</strong> — new reads ALL old</li>
              <li>• <strong>FORWARD / FORWARD_TRANSITIVE</strong> — old reads new</li>
              <li>• <strong>FULL / FULL_TRANSITIVE</strong> — bidirectional</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-primary" /> Operational tools</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Kafka Connect converters</strong> — auto-validate at produce time</li>
              <li>• <strong>Confluent CLI</strong> — register + check from command line</li>
              <li>• <strong>buf CLI</strong> — Protobuf compatibility check in CI</li>
              <li>• <strong>Maven/Gradle plugins</strong> — register at build time</li>
              <li>• <strong>Apicurio Studio</strong> — UI for schema editing + review</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers + production posts that defined Schema Registry, Avro, and the typed-pipeline movement. The Confluent 2014 Schema Registry paper introduced the centralised schema-management pattern; the Avro 2009 spec defined the wire format; the Protobuf 2008 paper defined the tag-based alternative."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Cutting, Farzaneh, White (2009): "Apache Avro — A Data Serialization System."</strong> Avro was designed as a Hadoop-era alternative to Protocol Buffers and Thrift — schemas embedded in the file header (vs Thrift's separate IDL build step), dynamic typing (vs Protobuf's static code-gen), compact binary wire format. The key innovation: schemas are JSON documents, so they can be introspected at runtime. This made the Schema Registry pattern possible — schemas are first-class data, not build artifacts.
          </p>
          <p>
            <strong className="text-foreground/80">Google 2008: "Protocol Buffers — Google's Data Interchange Format."</strong> Protobuf was designed for Google's internal RPC needs — typed, compact, language-agnostic. The key innovation: fields are encoded by tag NUMBER, not name — so adding a field with a new tag is wire-compatible with old readers (they just ignore unknown tags). This makes Protobuf inherently evolvable, as long as tag numbers are stable. The tradeoff vs Avro: schema is required to deserialise (no embedded schema in messages).
          </p>
          <p>
            <strong className="text-foreground/80">Confluent 2014: "Schema Registry — Managing Schemas for Kafka."</strong> Born from the realisation that without central schema management, producer/consumer schema drift was a silent failure mode — a producer adding a required field broke consumers hours later in production. Schema Registry adds a 4-byte schema ID prefix to every Avro/Protobuf/JSON message; consumers fetch by ID (cached). The compatibility check at register time prevents breaking changes from ever being deployed.
          </p>
          <p>
            <strong className="text-foreground/80">Apicurio 2018 (Red Hat): "Apicurio Registry — Open-Source Schema Registry."</strong> Born as a reaction to Confluent's Community License (not pure Apache) — Apicurio is Apache 2.0, no commercial restrictions. Supports Avro/Protobuf/JSON + AsyncAPI + OpenAPI (one registry for both data schemas AND API specs). Pluggable storage (Kafka, Postgres, in-memory). Now a CNCF Sandbox project.
          </p>
          <p>
            <strong className="text-foreground/80">AWS Glue Schema Registry (2019):</strong> AWS-native schema registry integrated with the Glue catalog. IAM-authenticated (no separate credentials to manage), multi-tenant by AWS account. Supports Avro/JSON/Protobuf. Designed for AWS-native Kafka (MSK) pipelines — the Avro Converter uses AWS Sigv4 auth to fetch schemas. Lower operational overhead at low scale; per-API-call pricing matters at high scale.
          </p>
          <p>
            <strong className="text-foreground/80">Iceberg Schema Evolution (Netflix 2017):</strong> Iceberg's column-ID stability is structurally the same idea as Protobuf's tag numbers — assign each column a stable integer ID at create time; names can change, IDs cannot. This makes renames metadata-only (no Parquet rewrite), adds append-only, drops soft. The Iceberg schema lives in metadata.json (one per table), not in a separate registry service. For Kafka messages feeding the table, you still use Schema Registry — the two systems are complementary, not competing.
          </p>
          <p>
            <strong className="text-foreground/80">Shopify Production Case (2022):</strong> 80+ downstream consumer services reading 100M+ Avro events/day from Kafka. Schema Registry enforced BACKWARD_TRANSITIVE across all subjects — every schema change was checked at register time, breaking changes were REFUSED. Zero consumer breakages in 12 months. CI/CD integration: PR opened → CI runs `schema-compat-check` → CI deploys → registry accepts → consumers auto-fetch by ID.
          </p>
        </div>
      </SectionCard>

      {/* Deeper-thought insight */}
      <SectionCard
        title="My deeper thought: Schema Registry IS the compiler for the data pipeline"
        description="The unifying view: Schema Registry is structurally the same pattern as a programming-language compiler — types are checked before code is allowed to run. The registry checks schemas before producers are allowed to send. Same idea, applied to runtime data."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Schema Registry IS the compiler for the data pipeline.</strong> Every programming language with a type system refuses to compile code that violates types — TypeScript catches `string.toUpperCase()` on a number at compile time, before the code runs. Schema Registry does the same for data: it refuses to register schemas that violate compatibility, before any producer can send. The producer's Avro/Protobuf/JSON converter checks the schema ID is registered before sending (the runtime type check); the registry's compatibility check at register is the compile-time check. This is exactly the TypeScript pattern — type-safe at compile time AND runtime.
          </p>
          <p>
            <strong className="text-foreground/80">Avro's schema-evolution rules ARE the LSP (Liskov Substitution Principle) for data.</strong> LSP says: a subtype can be used wherever its supertype is expected. Avro's BACKWARD compatibility says: a new schema can read old data (new is a subtype of old in some sense). FORWARD compatibility says: an old schema can read new data (old is a subtype of new). FULL compatibility is bidirectional LSP. Schema Registry enforces this at register time — the same way a compiler enforces LSP at compile time. The subject's compatibility level is the "LSP strictness" for that data type.
          </p>
          <p>
            <strong className="text-foreground/80">Protobuf's tag numbers ARE the column IDs (same idea as Iceberg).</strong> Protobuf encodes fields by tag number — field names are wire-irrelevant comments. Iceberg encodes columns by ID — names can change without file rewrites. Both are the same idea: stable integers are the truth, names are presentation. This is exactly the symbol-table pattern of every compiled language — the runtime resolves "ship_country" to column ID 4 (Iceberg) or tag 102 (Protobuf), and the file is read by ID. Same pattern, applied at the message level (Protobuf) and table level (Iceberg).
          </p>
          <p>
            <strong className="text-foreground/80">The schema ID prefix IS the type witness in the message.</strong> Every Avro/Protobuf/JSON message in Kafka carries a 4-byte schema ID prefix — this is the runtime type witness. Consumers fetch the schema by ID and deserialise; the ID guarantees the message conforms to a registered schema. This is exactly the type-witness pattern of dynamically-typed languages with optional types (Python's `typing`, TypeScript's runtime type guards) — a runtime tag that lets you check the type. The registry is the symbol table; the ID is the variable name in the symbol table.
          </p>
          <p>
            <strong className="text-foreground/80">Subject strategies ARE the namespace pattern of programming languages.</strong> TopicNameStrategy (one schema per topic) is like file-scoped variables. RecordNameStrategy (one schema per record type, shared across topics) is like module-scoped types. TopicRecordNameStrategy (hybrid) is like nested modules. The choice of subject strategy is the choice of namespace scoping — same tradeoff as programming-language scoping rules (file vs module vs nested).
          </p>
          <p>
            <strong className="text-foreground/80">Schema Registry IS to data pipelines what dbt is to SQL pipelines.</strong> dbt enforces SQL column contracts + tests at build time (compile-time check). Schema Registry enforces Avro/Protobuf/JSON schema compatibility at register time (compile-time check). Both patterns move type-checking from runtime (where bugs surface in production) to compile time (where bugs surface in CI). Both are the "shift-left testing" pattern applied to data — type-safety as a deploy-gate, not a runtime alert. The future of data engineering is typed pipelines end-to-end: dbt at the SQL layer, Schema Registry at the message layer, Iceberg column IDs at the table layer.
          </p>
        </div>
      </SectionCard>


      <DeeperThoughtSection pageTitle="Schema Registry">
        <DeeperThought title="Schema Registry IS the data contract — and it's the API for data" connectedTo="ADR-001 (platform architecture)">
          <p>{"Schema Registry stores Avro/Protobuf/JSON schemas for Kafka topics. Producers register schemas before writing; consumers fetch schemas before reading. This IS the API for data: the schema IS the interface, the topic IS the endpoint, the message IS the payload. The pattern (schema + endpoint + payload) IS identical to REST (OpenAPI + URL + body). Schema Registry IS OpenAPI for streaming data."}</p>
        </DeeperThought>
        <DeeperThought title="Schema evolution IS backward/forward compatibility — and it's the right design" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"Schema Registry's compatibility modes (BACKWARD, FORWARD, FULL) ARE the rules for evolving schemas without breaking consumers. BACKWARD: new schema can read old data (add field with default). FORWARD: old schema can read new data (ignore extra fields). FULL: both. This IS the SAME pattern as Avro's schema evolution and Protobuf's wire compatibility. The math (partial order on schemas) IS the same. Schema evolution IS version control for data types."}</p>
        </DeeperThought>
        <DeeperThought title="Schema Registry IS the type system for Kafka — and types prevent bugs" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"Without Schema Registry, Kafka messages are untyped byte arrays. Consumers must know the format (is it JSON? Avro? Protobuf?). With Schema Registry, every message has a schema ID → consumers know the type → deserialization is automatic. This IS the SAME upgrade as dynamically-typed → statically-typed languages. Schema Registry IS TypeScript for Kafka — it catches the 'wrong format' bug at ingestion, not at query time."}</p>
        </DeeperThought>
        <DeeperThought title="Confluent's Schema Registry IS the canonical implementation — but it's not the only one" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"Confluent's Schema Registry is the reference implementation. Alternatives: AWS Glue Schema Registry, Apicurio Registry, Google's Protobuf descriptor pool. All implement the SAME pattern: register → validate → fetch → deserialize. The pattern (centralized schema store + producer/consumer validation) IS the same. The implementation (Confluent vs Glue vs Apicurio) changes. The fold absorbs the change."}</p>
        </DeeperThought>
        <DeeperThought title="Schema Registry's compatibility check IS the CI/CD gate for data" connectedTo="ADR-013 (Delta Lake)">
          <p>{"Schema Registry checks compatibility BEFORE registering a new schema. If the new schema is incompatible (e.g., removes a required field without default), registration fails. This IS the SAME pattern as a CI/CD gate: code change → run tests → merge if pass. Schema change → check compatibility → register if pass. Schema Registry IS CI/CD for data schemas."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <RelatedTopics topics={[
        { id: "kafka-connect" as const, reason: "Kafka Connect — uses Schema Registry for Avro/Protobuf/JSON converters" },
        { id: "iceberg" as const, reason: "Iceberg — own schema evolution (column IDs stable across renames)" },
        { id: "data-contracts" as const, reason: "Data contracts — schema enforcement as a deploy-gate" },
        { id: "streaming" as const, reason: "Kafka — the substrate that messages flow through" },
        { id: "delta-lake" as const, reason: "Delta — also has its own schema evolution" },
        { id: "hudi" as const, reason: "Hudi — schema reconciliation across MOR + base files" },
        { id: "data-lakehouse" as const, reason: "Lakehouse — typed storage layer" },
        { id: "cicd" as const, reason: "CI/CD — schema compatibility check in deploy pipeline" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("kafka-connect")} className="text-sm text-primary hover:underline">
          &rarr; Kafka Connect (consumes + produces via Schema Registry)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("iceberg")} className="text-sm text-primary hover:underline">
          &rarr; Iceberg (column-ID schema evolution)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("data-contracts")} className="text-sm text-primary hover:underline">
          &rarr; Data contracts (schema as a deploy-gate)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("streaming")} className="text-sm text-primary hover:underline">
          &rarr; Streaming (Kafka substrate)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("cicd")} className="text-sm text-primary hover:underline">
          &rarr; CI/CD (schema compat check in deploy)
        </Link>
      </div>
    </div>
  );
}
