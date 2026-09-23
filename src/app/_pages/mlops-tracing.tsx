"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import {
  Activity, Layers, Zap, TrendingUp, Terminal, Brain,
  Cpu, Network, ShieldCheck,
} from "lucide-react";

const KPIS = [
  { label: "Span shape", value: "(trace_id, span_id, parent_id, t, dur, attrs)", hint: "OTLP wire format — 1 span = 1 unit of work", deltaTone: "flat" as const },
  { label: "Trace", value: "DAG of spans", hint: "Tree (mostly) sharing trace_id — parent_id forms edges", deltaTone: "flat" as const },
  { label: "Critical path", value: "O(V+E)", hint: "Topo sort + DP — longest path through span DAG", deltaTone: "flat" as const },
  { label: "SLO", value: "P99(trace_duration) < T", hint: "99% of traces complete within T seconds", deltaTone: "flat" as const },
];

// ============================================================
// Animated Trace DAG with critical path
// ============================================================
function TraceDagAnimation() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setStep((s) => (s + 1) % 5), 1200);
    return () => clearInterval(interval);
  }, []);

  // Trace: ingest → validate → train (DDP) → evaluate → deploy
  // Spans have IDs, parents, durations
  const spans = [
    { id: "root",    parent: null,    label: "root",    dur: 1450, x: 50,  y: 30,  level: 0 },
    { id: "ingest",  parent: "root",  label: "ingest",  dur: 200,  x: 150, y: 100, level: 1 },
    { id: "validate",parent: "ingest",label: "validate",dur: 80,   x: 150, y: 170, level: 2 },
    { id: "train",   parent: "root",  label: "train",   dur: 1100, x: 270, y: 100, level: 1 },
    { id: "ddp0",    parent: "train", label: "DDP-rank0",dur: 950,x: 220, y: 170, level: 2 },
    { id: "ddp1",    parent: "train", label: "DDP-rank1",dur: 950,x: 270, y: 170, level: 2 },
    { id: "ar0",     parent: "ddp0",  label: "AllReduce", dur: 280, x: 200, y: 240, level: 3 },
    { id: "ar1",     parent: "ddp1",  label: "AllReduce", dur: 280, x: 280, y: 240, level: 3 },
    { id: "eval",    parent: "root",  label: "evaluate", dur: 130,  x: 360, y: 100, level: 1 },
    { id: "deploy",  parent: "eval",  label: "deploy",  dur: 100,  x: 360, y: 170, level: 2 },
  ];
  // Critical path: root → train → ddp0 → ar0 (longest-duration path)
  const criticalPath = new Set(["root", "train", "ddp0", "ar0"]);

  const phases = [
    "1. Spans emitted",
    "2. Build span DAG",
    "3. Topo sort",
    "4. DP: longest path",
    "5. Critical path",
  ];

  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <style>{`
        .td-3d { perspective: 700px; }
        .td-stage { transform: rotateX(12deg); transform-style: preserve-3d; }
      `}</style>
      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        Trace DAG + critical path
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">{phases[step]}</span>
      </p>
      <div className="td-3d">
        <div className="td-stage">
          <svg width="450" height="290" viewBox="0 0 450 290">
            {/* Edges (parent → child) */}
            {spans.filter(s => s.parent).map((s) => {
              const parent = spans.find(p => p.id === s.parent)!;
              const isOnCritical = step >= 4 && criticalPath.has(s.id) && criticalPath.has(s.parent!);
              return (
                <motion.line
                  key={`e-${s.id}`}
                  x1={parent.x + 25} y1={parent.y + 10}
                  x2={s.x + 25} y2={s.y - 10}
                  stroke={isOnCritical ? "var(--primary)" : "var(--border)"}
                  strokeWidth={isOnCritical ? 2.5 : 1}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: step >= 1 ? (isOnCritical ? 1 : 0.5) : 0,
                    strokeDasharray: step >= 3 && isOnCritical ? "0" : (step >= 1 ? "4 2" : "0"),
                  }}
                />
              );
            })}
            {/* Spans as nodes */}
            {spans.map((s) => {
              const isOnCritical = step >= 4 && criticalPath.has(s.id);
              const showDuration = step >= 2;
              return (
                <motion.g key={s.id}>
                  <motion.rect
                    x={s.x} y={s.y}
                    width={50} height={20}
                    rx={4}
                    fill={isOnCritical ? "var(--primary)" : "var(--muted)"}
                    animate={{
                      scale: step === 0 ? 0 : (isOnCritical ? 1.05 : 1),
                      opacity: 1,
                    }}
                    transition={{ duration: 0.4 }}
                  />
                  <text
                    x={s.x + 25}
                    y={s.y + 13}
                    textAnchor="middle"
                    fontSize={9}
                    fill={isOnCritical ? "var(--primary-foreground)" : "var(--muted-foreground)"}
                    fontWeight={isOnCritical ? "bold" : "normal"}
                  >
                    {s.label}
                  </text>
                  {showDuration && (
                    <motion.text
                      x={s.x + 25}
                      y={s.y + 32}
                      textAnchor="middle"
                      fontSize={8}
                      fill="var(--muted-foreground)"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      {s.dur}ms
                    </motion.text>
                  )}
                </motion.g>
              );
            })}
          </svg>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
        <div className="rounded-md border border-border/60 p-2.5">
          <p className="font-semibold mb-1">Critical path</p>
          <p className="text-muted-foreground text-[11px]">
            root (1450) → train (1100) → ddp0 (950) → AllReduce (280) = <span className="font-mono font-bold">1450ms total</span>.
            Train dominates — this is the SLI to optimise.
          </p>
        </div>
        <div className="rounded-md border border-border/60 p-2.5">
          <p className="font-semibold mb-1">Optimisation target</p>
          <p className="text-muted-foreground text-[11px]">
            ddp0 AllReduce is 280ms out of 950ms train (29%). Moving it off the critical path
            (overlap with backward) saves up to 280ms.
          </p>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-3">
        Critical path = longest-duration path through span DAG. Computed via topo sort + DP: dist[v] = max(dist[u] + dur[v])
        for all edges (u→v). Reveals which spans to optimise for end-to-end latency.
      </p>
    </div>
  );
}

const TRACE_DEMO = `# Distributed Tracing — span DAG, critical path, SLO (Pyodide)
# Implements: trace reconstruction, topo sort, critical path, p99 SLO check

import math, random

# ============================================================
# Span model — OTLP wire format (simplified)
# ============================================================
# span = {
#     trace_id, span_id, parent_span_id,
#     name, start_time_ns, end_time_ns,
#     attributes: {service, http.method, ml.framework, ...},
#     status: OK / ERROR
# }

# ============================================================
# Build span DAG from a list of spans
# ============================================================

def build_span_graph(spans):
    "Build adjacency list from parent->child edges."
    graph = {s["span_id"]: [] for s in spans}
    span_by_id = {s["span_id"]: s for s in spans}
    for s in spans:
        if s["parent_span_id"]:
            graph[s["parent_span_id"]].append(s["span_id"])
    return graph, span_by_id

def topo_sort(graph):
    "Kahn's algorithm: O(V+E). Returns nodes in dependency order."
    in_degree = {n: 0 for n in graph}
    for u in graph:
        for v in graph[u]:
            in_degree[v] += 1
    queue = [n for n in in_degree if in_degree[n] == 0]
    order = []
    while queue:
        u = queue.pop(0)
        order.append(u)
        for v in graph[u]:
            in_degree[v] -= 1
            if in_degree[v] == 0:
                queue.append(v)
    return order

def critical_path(spans):
    """
    Longest-duration path through span DAG.
    DP: dist[v] = dist[u] + dur[v] for edge (u->v).
    Track parent for path reconstruction.
    """
    graph, span_by_id = build_span_graph(spans)
    order = topo_sort(graph)
    dist = {n: 0 for n in graph}
    parent = {n: None for n in graph}
    for v in order:
        for u in graph:
            if v in graph[u]:
                # edge u -> v: relax
                if dist[u] + span_by_id[v]["duration_ms"] > dist[v]:
                    dist[v] = dist[u] + span_by_id[v]["duration_ms"]
                    parent[v] = u
    # Find max-distance node
    end_node = max(dist, key=dist.get)
    # Reconstruct path
    path = []
    n = end_node
    while n is not None:
        path.append(n)
        n = parent[n]
    path.reverse()
    return path, dist[end_node]

# ============================================================
# Demo trace: data pipeline → ML training → deploy
# ============================================================
trace_id = "abc123"
spans = [
    {"trace_id": trace_id, "span_id": "root",     "parent_span_id": None,    "name": "pipeline.root",     "duration_ms": 1450},
    {"trace_id": trace_id, "span_id": "ingest",   "parent_span_id": "root",  "name": "data.ingest",       "duration_ms": 200},
    {"trace_id": trace_id, "span_id": "validate", "parent_span_id": "ingest","name": "data.validate",     "duration_ms": 80},
    {"trace_id": trace_id, "span_id": "train",    "parent_span_id": "root",  "name": "ml.train",          "duration_ms": 1100},
    {"trace_id": trace_id, "span_id": "ddp0",     "parent_span_id": "train", "name": "ml.train.rank0",    "duration_ms": 950},
    {"trace_id": trace_id, "span_id": "ddp1",     "parent_span_id": "train", "name": "ml.train.rank1",    "duration_ms": 950},
    {"trace_id": trace_id, "span_id": "ar0",      "parent_span_id": "ddp0",  "name": "ml.allreduce.r0",   "duration_ms": 280},
    {"trace_id": trace_id, "span_id": "ar1",      "parent_span_id": "ddp1",  "name": "ml.allreduce.r1",   "duration_ms": 280},
    {"trace_id": trace_id, "span_id": "eval",     "parent_span_id": "root",  "name": "ml.evaluate",       "duration_ms": 130},
    {"trace_id": trace_id, "span_id": "deploy",   "parent_span_id": "eval",  "name": "ml.deploy",         "duration_ms": 100},
]

print("=" * 60)
print("Distributed Tracing — Critical Path Analysis")
print("=" * 60)

path, total_dur = critical_path(spans)
print(f"\\nTrace: {trace_id} ({len(spans)} spans)")
print(f"Critical path ({len(path)} spans): {' → '.join(path)}")
print(f"Critical path duration: {total_dur} ms")

# Span breakdown
print(f"\\nSpan durations:")
for s in spans:
    is_critical = s["span_id"] in path
    pct = (s["duration_ms"] / total_dur) * 100
    marker = " *" if is_critical else "  "
    print(f"  {marker}{s['name']:30s} {s['duration_ms']:5d} ms  ({pct:5.1f}% of trace)")

# ============================================================
# SLO check: 99% of traces should complete within 2000ms
# ============================================================
slo_target_ms = 2000
slo_status = "PASS" if total_dur < slo_target_ms else "FAIL"
burn_rate = total_dur / slo_target_ms
print(f"\\n{'=' * 60}")
print(f"SLO check (target: p99 < {slo_target_ms}ms)")
print(f"  This trace: {total_dur}ms → {slo_status}")
print(f"  Error budget burn rate: {burn_rate:.2f}x (1.0 = budget-neutral)")
print(f"  If burn > 1.0 sustained: SLO violated → page SRE")

# ============================================================
# Percentile simulation — multiple traces
# ============================================================
print(f"\\n{'=' * 60}")
print(f"Trace duration distribution (1000 simulated traces):")
random.seed(42)
durations = []
for _ in range(1000):
    # Random trace: pick a critical path length with some noise
    base = 1450
    noise = random.gauss(0, 200)  # +/- 200ms variation
    # Occasionally a slow trace (AllReduce takes longer)
    if random.random() < 0.05:
        noise += 800  # 5% of traces have +800ms (network blip)
    durations.append(max(500, base + noise))

durations.sort()
p50 = durations[500]
p95 = durations[950]
p99 = durations[990]
p999 = durations[999]

print(f"  p50:  {p50:.0f} ms")
print(f"  p95:  {p95:.0f} ms")
print(f"  p99:  {p99:.0f} ms  ← SLO threshold (target: <2000ms)")
print(f"  p999: {p999:.0f} ms  ← alert threshold")
print(f"\\n  SLO: {p99:.0f} < 2000 = {'PASS' if p99 < 2000 else 'FAIL'}")
print(f"  Burn rate: {p99 / 2000:.2f}x")

print(f"\\n{'=' * 60}")
print("KEY MATH:")
print("  - Critical path = longest path in span DAG")
print("  - Computed via Kahn's topo sort + DP relaxation: O(V+E)")
print("  - SLO: P99(trace_duration) < T  → 99% of traces complete within T")
print("  - Burn rate = observed_p99 / target  → >1.0 = SLO violation")
print("  - Error budget: (1 - 1/SLO_target) of requests can fail per quarter")
print("=" * 60)`;

const OTLP_PROTOCOL = `┌─────────────────────────────────────────────────────────────────────┐
│  OPENTELEMETRY (OTLP) WIRE PROTOCOL                                      │
│                                                                            │
│  Span (one unit of work):                                                 │
│  ┌──────────────────────────────────────────────────────────────┐         │
│  │ trace_id      : 16 bytes (W3C Trace Context)                  │         │
│  │ span_id       : 8 bytes                                       │         │
│  │ parent_span_id: 8 bytes (or empty for root)                  │         │
│  │ name          : string (e.g. "ml.train.step")                │         │
│  │ start_time    : uint64 nanoseconds since epoch               │         │
│  │ end_time      : uint64 nanoseconds                           │         │
│  │ duration      : end - start (derived)                        │         │
│  │ status        : OK / ERROR / UNSET                            │         │
│  │ attributes    : map<string, Value>                            │         │
│  │   service.name      = "training-worker"                       │         │
│  │   ml.framework      = "pytorch"                               │         │
│  │   ml.model_id       = "llama-7b-lora-v3"                      │         │
│  │   ml.world_size     = 8                                       │         │
│  │   gpus.rank          = 0                                      │         │
│  │   ml.train.step      = 1234                                   │         │
│  │   ml.train.loss      = 0.4532                                 │         │
│  │   ml.allreduce_bytes = 573_000_000                            │         │
│  │ events        : [{name, ts, attrs}, ...]                      │         │
│  │ links         : [other_span_ids related]                      │         │
│  └──────────────────────────────────────────────────────────────┘         │
│                                                                            │
│  Trace (DAG of spans sharing trace_id):                                   │
│  ┌──────────────────────────────────────────────────────────────┐         │
│  │ trace_id: 16 bytes shared by all spans in a trace             │         │
│  │ Spans form a tree (mostly) via parent_span_id edges           │         │
│  │ Distributed across services — propagated via W3C headers     │         │
│  └──────────────────────────────────────────────────────────────┘         │
│                                                                            │
│  Propagation (HTTP/gRPC):                                                 │
│    traceparent: 00-<trace_id>-<span_id>-<flags>                          │
│    Example: traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad...-01│
│                                                                            │
│  Collector pipeline:                                                      │
│    [SDK] → OTLP/gRPC → [Collector] → processors → [Exporters]            │
│                            ├── sampling                                    │
│                            ├── batch (10s / 1024 spans)                   │
│                            ├── tail-based sampling (errors + p99)          │
│                            └── attribute enrichment (add k8s.pod)         │
│                                                                            │
│  Exporters:                                                               │
│    traces  → Tempo (Grafana) / Jaeger / Datadog                            │
│    metrics → Mimir / Prometheus / InfluxDB                                 │
│    logs    → Loki / Elasticsearch / Splunk                                  │
└─────────────────────────────────────────────────────────────────────────────┘`;

const PYTORCH_CODE = `import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.trace import Status, StatusCode
import contextlib
import time

# ============================================================
# 1. Initialise OpenTelemetry — once per process
# ============================================================

def setup_telemetry(service_name: str, otlp_endpoint: str = "http://otel-collector:4317"):
    """Configure the OTel SDK to emit spans to a collector.
    
    Wire format: OTLP over gRPC (also supports HTTP).
    Sampling: 10% in production, 100% in staging (env var).
    """
    # Resource identifies this service — every span carries it
    resource = Resource.create({
        SERVICE_NAME: service_name,
        # Kubernetes metadata (auto-detected via env vars)
        "k8s.pod.name": os.environ.get("POD_NAME", "unknown"),
        "k8s.namespace": os.environ.get("POD_NAMESPACE", "default"),
        # Custom attributes for ML context
        "service.version": os.environ.get("IMAGE_TAG", "latest"),
    })
    
    provider = TracerProvider(resource=resource)
    
    # OTLP exporter — sends spans to the collector
    exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
    
    # Batch processor — buffers spans, flushes every 5s or 1024 spans
    processor = BatchSpanProcessor(
        exporter,
        max_queue_size=8192,
        schedule_delay_millis=5000,
        max_export_batch_size=512,
    )
    provider.add_span_processor(processor)
    
    # Set as global tracer provider — every tracer shares it
    trace.set_tracer_provider(provider)
    return trace.get_tracer(service_name)


# ============================================================
# 2. Manual span creation — explicit instrumentation
# ============================================================

tracer = setup_telemetry("training-worker")

def train_step(model, batch, optimizer, step_num):
    """One training step, fully traced.
    
    Creates a parent span (train.step) and child spans for forward,
    backward, optimizer.step, and the AllReduce if DDP/FSDP.
    """
    # context manager: span starts on __enter__, ends on __exit__
    with tracer.start_as_current_span(
        "ml.train.step",
        attributes={
            "ml.framework": "pytorch",
            "ml.train.step": step_num,
            "ml.world_size": dist.get_world_size() if dist.is_initialized() else 1,
            "gpus.rank": dist.get_rank() if dist.is_initialized() else 0,
            "ml.batch_size": batch[0].shape[0],
        },
    ) as step_span:
        t0 = time.perf_counter()
        
        # Child span: forward
        with tracer.start_as_current_span("ml.train.forward") as fwd_span:
            loss = model(batch)
            fwd_span.set_attribute("ml.train.loss", float(loss.item()))
            fwd_span.set_attribute("ml.train.seq_len", batch[0].shape[1])
        
        # Child span: backward
        with tracer.start_as_current_span("ml.train.backward"):
            loss.backward()
            # DDP AllReduce happens INSIDE backward (DDP hooks fire on .grad access)
            # This makes the AllReduce visible as part of the backward span.
        
        # Child span: optimizer step
        with tracer.start_as_current_span("ml.train.optimizer_step"):
            optimizer.step()
            optimizer.zero_grad()
        
        # Record the loss as a span event (timestamped log entry)
        step_span.add_event(
            name="step_complete",
            attributes={
                "ml.train.loss": float(loss.item()),
                "ml.train.lr": optimizer.param_groups[0]["lr"],
                "duration_ms": (time.perf_counter() - t0) * 1000,
            },
        )
        
        # Mark errors (exceptions auto-record via __exit__ but we can be explicit)
        if torch.isnan(loss):
            step_span.set_status(Status(StatusCode.ERROR, "NaN loss detected"))
            step_span.set_attribute("error.type", "nan_loss")


# ============================================================
# 3. Custom AllReduce span (for distributed training)
# ============================================================

@contextlib.contextmanager
def trace_allreduce(tensor_size_bytes: int):
    """Manually wrap NCCL AllReduce in a span.
    
    Default DDP doesn't expose AllReduce as a span — we add it
    by hooking into torch.distributed's _allreduce_base.
    """
    rank = dist.get_rank() if dist.is_initialized() else 0
    with tracer.start_as_current_span(
        "ml.allreduce",
        attributes={
            "gpus.rank": rank,
            "ml.allreduce.bytes": tensor_size_bytes,
            "ml.allreduce.world_size": dist.get_world_size() if dist.is_initialized() else 1,
        },
    ) as ar_span:
        t0 = time.perf_counter()
        yield
        duration_ms = (time.perf_counter() - t0) * 1000
        # Compute achieved bandwidth (algebraic, like the distributed-training page)
        achieved_gbps = (tensor_size_bytes * 2) / (duration_ms / 1000) / 1e9  # 2x for send+recv
        ar_span.set_attribute("ml.allreduce.duration_ms", duration_ms)
        ar_span.set_attribute("ml.allreduce.achieved_gbps", achieved_gbps)


# ============================================================
# 4. Context propagation across services
# ============================================================

def call_data_pipeline(dataset_id: str):
    """HTTP call to the data pipeline service.
    
    Propagates the current trace context via W3C Trace Context headers.
    The downstream service will create child spans under this trace.
    """
    import requests
    from opentelemetry.propagate import inject
    
    headers = {"Content-Type": "application/json"}
    # inject() adds traceparent + tracestate headers from the current context
    inject(headers)
    
    # The data pipeline receives the headers, extracts the context,
    # and any spans it creates become children of THIS service's span.
    with tracer.start_as_current_span("http.client.data_pipeline") as http_span:
        http_span.set_attribute("http.method", "POST")
        http_span.set_attribute("http.url", f"http://data-pipeline/api/v1/datasets/{dataset_id}")
        response = requests.post(
            f"http://data-pipeline/api/v1/datasets/{dataset_id}",
            headers=headers,
            json={"action": "validate"},
        )
        http_span.set_attribute("http.status_code", response.status_code)
        if response.status_code != 200:
            http_span.set_status(Status(StatusCode.ERROR, f"HTTP {response.status_code}"))


# ============================================================
# 5. Critical path computation (post-hoc analysis on stored traces)
# ============================================================

import networkx as nx
from collections import deque

def compute_critical_path(spans: list[dict]) -> tuple[list[str], float]:
    """
    Critical path = longest-duration path through span DAG.
    
    Args:
        spans: list of {span_id, parent_span_id, duration_ms}
    
    Returns:
        (path of span_ids, total_duration_ms)
    
    Algorithm: O(V+E) via Kahn's topo sort + DP relaxation.
    """
    # Build graph
    span_by_id = {s["span_id"]: s for s in spans}
    children = {s["span_id"]: [] for s in spans}
    in_degree = {s["span_id"]: 0 for s in spans}
    for s in spans:
        if s["parent_span_id"] and s["parent_span_id"] in span_by_id:
            children[s["parent_span_id"]].append(s["span_id"])
            in_degree[s["span_id"]] += 1
    
    # Topo sort (Kahn)
    queue = deque([n for n in in_degree if in_degree[n] == 0])
    topo = []
    while queue:
        u = queue.popleft()
        topo.append(u)
        for v in children[u]:
            in_degree[v] -= 1
            if in_degree[v] == 0:
                queue.append(v)
    
    # DP: dist[v] = max(dist[u] + dur[v]) over parents
    dist = {n: 0.0 for n in span_by_id}
    parent = {n: None for n in span_by_id}
    for v in topo:
        for u in span_by_id:
            if v in children.get(u, []):
                candidate = dist[u] + span_by_id[v]["duration_ms"]
                if candidate > dist[v]:
                    dist[v] = candidate
                    parent[v] = u
    
    # Find max-distance node
    end_node = max(dist, key=dist.get)
    
    # Reconstruct path
    path = []
    n = end_node
    while n is not None:
        path.append(n)
        n = parent[n]
    path.reverse()
    return path, dist[end_node]


# ============================================================
# 6. SLO computation (error budget, burn rate)
# ============================================================

def slo_status(observed_p99_ms: float, target_p99_ms: float = 2000) -> dict:
    """
    Compute SLO burn rate and error budget.
    
    SLO: 99% of traces complete within target_p99_ms.
    Burn rate > 1.0 means we're consuming error budget faster than allowed.
    """
    # Burn rate = observed / target
    burn_rate = observed_p99_ms / target_p99_ms
    # Error budget = (1 - SLO_target) = 1% of traces can be slow
    # If burn_rate > 1, we're losing budget faster than it's replenished
    # At burn_rate 2.0, we exhaust a quarter's budget in 1.5 months
    return {
        "observed_p99_ms": observed_p99_ms,
        "target_p99_ms": target_p99_ms,
        "burn_rate": burn_rate,
        "status": "PASS" if burn_rate < 1.0 else "FAIL",
        "alert_threshold": burn_rate > 2.0,  # page SRE if > 2x for 1h
    }


# Sanity check
if __name__ == "__main__":
    # Test the critical path
    spans = [
        {"span_id": "root",     "parent_span_id": None,    "duration_ms": 1450},
        {"span_id": "ingest",   "parent_span_id": "root",  "duration_ms": 200},
        {"span_id": "validate", "parent_span_id": "ingest","duration_ms": 80},
        {"span_id": "train",    "parent_span_id": "root",  "duration_ms": 1100},
        {"span_id": "ddp0",     "parent_span_id": "train", "duration_ms": 950},
        {"span_id": "ar0",      "parent_span_id": "ddp0",  "duration_ms": 280},
        {"span_id": "eval",     "parent_span_id": "root",  "duration_ms": 130},
    ]
    path, total = compute_critical_path(spans)
    print(f"Critical path: {' -> '.join(path)}")
    print(f"Total duration: {total} ms")
    print(f"SLO check: {slo_status(total)}")`;

export function MlopsTracingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="MLOps · OpenTelemetry · distributed tracing"
        title="MLOps & Tracing — Unified Observability for Data + ML"
        description="The math behind distributed tracing: span DAGs (each span = (trace_id, span_id, parent_id, t, dur, attrs)), critical-path computation via Kahn's topo sort + DP relaxation (O(V+E)), SLO math (P99 < target, error budget, burn rate). With low-level PyTorch code showing OpenTelemetry instrumentation for ML training (manual spans for forward/backward/AllReduce), W3C Trace Context propagation across services, and the post-hoc critical-path + SLO analysis. Code-oriented, mathematical, scientific."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Activity className="h-3 w-3" /> OTel + spans</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Pyodide</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />)}
      </div>

      {/* Trace DAG animation */}
      <SectionCard title="Trace DAG with critical path — animated" description="A trace is a DAG of spans sharing trace_id, with parent_id forming edges. The critical path is the longest-duration path through this DAG — it identifies which spans dominate end-to-end latency. Animation phases: (1) spans emitted, (2) build DAG via parent_id edges, (3) Kahn's topo sort, (4) DP relaxation dist[v]=max(dist[u]+dur[v]), (5) reconstruct longest path." icon={<Activity className="h-5 w-5" />} badge="3D animation">
        <TraceDagAnimation />
      </SectionCard>

      {/* OTLP wire format */}
      <SectionCard title="The OTLP wire format — what a span actually contains" description="OpenTelemetry Protocol (OTLP) is the CNCF standard wire format. A span is a typed record: trace_id (16B W3C), span_id (8B), parent_span_id (8B), start/end times in nanoseconds, status (OK/ERROR/UNSET), attributes (semantic conventions), events (timestamped logs), links (related spans). Traces propagate via W3C traceparent HTTP/gRPC header." icon={<Network className="h-5 w-5" />}>
        <CodeBlock language="text" filename="otlp_protocol.txt" code={OTLP_PROTOCOL} />
      </SectionCard>

      {/* Critical path math */}
      <SectionCard title="Critical path — the longest-duration path through the span DAG" description="Given a trace (DAG of spans), the critical path is the longest-duration path. It reveals which spans dominate end-to-end latency. Computed in O(V+E) via Kahn's topological sort + DP relaxation. The dist[] table tracks the longest distance to each node; reconstruct by walking parents backward." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">dist[v] = max<sub>u: (u→v) ∈ E</sub>(dist[u] + dur[v])</p>
            <p className="text-[11px] text-muted-foreground mt-1">DP relaxation: for each edge u→v in topo order, relax v's distance with u's distance + v's duration. O(V+E).</p>
          </div>
          <div className="rounded-md border border-border/60 p-3 bg-muted/10">
            <p className="font-mono text-xs text-foreground/90 font-semibold mb-2">Algorithm (Kahn + DP):</p>
            <ol className="text-xs space-y-1 ml-3 list-decimal">
              <li>Build adjacency list from parent_id edges</li>
              <li>Compute in-degree[v] for each node v</li>
              <li>Initialise queue with nodes where in_degree = 0 (roots)</li>
              <li>Pop u from queue; append to topo order; decrement in_degree of u's children; enqueue any that hit 0</li>
              <li>For each v in topo order, relax: dist[v] = max over parents of (dist[parent] + dur[v])</li>
              <li>end_node = argmax(dist); walk parents backward to reconstruct path</li>
            </ol>
            <p className="text-[11px] text-muted-foreground mt-2">Kahn's algorithm is O(V+E) — same complexity as BFS/DFS. For a 1000-span trace, this is microseconds — feasible to compute on every query.</p>
          </div>
          <div className="rounded-md border border-border/60 p-3 bg-muted/10">
            <p className="font-mono text-xs text-foreground/90 font-semibold mb-2">Why this matters for ML:</p>
            <p className="text-xs text-muted-foreground">In a distributed training step (DDP), the critical path usually goes: train → backward → AllReduce. The AllReduce is on the critical path because it's synchronous — every GPU waits for it. Overlapping backward with AllReduce (using torch.cuda.Stream) moves AllReduce off the critical path, saving up to 30% per step. Critical-path analysis is how this is measured in production.</p>
          </div>
        </div>
      </SectionCard>

      {/* SLO math */}
      <SectionCard title="SLO math — percentiles, error budgets, burn rate" description="Service Level Objective (SLO): 99% of traces complete within T ms. The 1% slack is the error budget. Burn rate = observed_p99 / target — if >1.0, we're consuming budget faster than replenished, alerting threshold is typically 2× for 1 hour." icon={<ShieldCheck className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">SLO: P<sub>99</sub>(trace_duration) &lt; T &nbsp;&nbsp;·&nbsp;&nbsp; Burn = observed_p99 / T</p>
            <p className="text-[11px] text-muted-foreground mt-1">P99 = 99th percentile of trace durations. Error budget = (1 - 0.99) × total_traces per quarter.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
              <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">Burn &lt; 1.0</p>
              <p className="text-muted-foreground text-[11px]">Healthy. Error budget replenishes faster than consumed. No alerts.</p>
            </div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5">
              <p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">1.0 ≤ Burn &lt; 2.0</p>
              <p className="text-muted-foreground text-[11px]">At-risk. Slack notification. Trending toward violation if sustained.</p>
            </div>
            <div className="rounded-md border border-rose-500/40 bg-rose-500/5 p-2.5">
              <p className="font-semibold text-sm text-rose-600 dark:text-rose-400 mb-1">Burn ≥ 2.0 (1h)</p>
              <p className="text-muted-foreground text-[11px]">Page SRE. Error budget being consumed 2× faster than allowed. Action required.</p>
            </div>
          </div>
          <div className="rounded-md border border-border/60 p-3 bg-muted/10">
            <p className="font-mono text-xs text-foreground/90 font-semibold mb-2">Error budget arithmetic:</p>
            <p className="font-mono text-xs ml-2">Quarter budget = (1 - 0.99) × total_traces = 0.01 × N</p>
            <p className="font-mono text-xs ml-2">Burn rate × time → budget consumed = burn × elapsed_time</p>
            <p className="font-mono text-xs ml-2">At burn = 2.0 for 1 hour → 2 × 1/2160 of quarter budget consumed (quarter = 2160h)</p>
            <p className="text-[11px] text-muted-foreground mt-2">If budget consumed &gt; 100% before quarter-end → SLO violation → freeze feature releases (Google SRE practice).</p>
          </div>
        </div>
      </SectionCard>

      {/* Pyodide trace demo */}
      <SectionCard title="Try it: Critical path + SLO analysis on a real trace (Pyodide)" description="Builds a span DAG for a data-pipeline + ML-training + deploy trace. Computes the critical path via Kahn's topo sort + DP relaxation. Reports per-span duration as % of trace. Simulates 1000 traces to compute p50/p95/p99/p999 and checks the SLO. Shows burn-rate computation." icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={TRACE_DEMO} buttonLabel="Run trace analysis (Pyodide)" />
      </SectionCard>

      {/* Low-level PyTorch / OTel code */}
      <SectionCard title="Low-level PyTorch + OpenTelemetry — manual spans, propagation, critical path, SLO" description="The actual production code. setup_telemetry() configures the OTel SDK with a Resource (service.name + k8s metadata), OTLPSpanExporter to the collector, BatchSpanProcessor (5s/1024 spans flush). train_step() shows manual span creation with attributes (ml.framework, ml.world_size, gpus.rank, ml.train.loss). trace_allreduce() wraps NCCL AllReduce in a span with bandwidth computation. call_data_pipeline() shows W3C Trace Context propagation via inject(). compute_critical_path() implements Kahn's topo sort + DP. slo_status() computes burn rate." icon={<Cpu className="h-5 w-5" />} badge="low-level">
        <CodeBlock language="python" filename="mlops_tracing.py" highlight={[10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292,293,294,295,296,297,298,299,300,301]} code={PYTORCH_CODE} />
      </SectionCard>

      {/* Architecture diagram */}
      <SectionCard title="The unified observability stack — data + ML under one trace store" description="Before ADR-029: dual stacks (OpenLineage for data, MLflow for ML). After: one OTel pipeline — every service emits spans, the collector samples + batches + enriches, then exports to Tempo (traces), Loki (logs), Mimir (metrics). Grafana queries all three. The model-monitoring page can now trace a degradation back to the specific training run that produced the model, then to the pipeline that produced the training data." icon={<Layers className="h-5 w-5" />}>
        <CodeBlock language="text" filename="observability_arch.txt" code={`┌──────────────────────────────────────────────────────────────────────┐
│  UNIFIED OBSERVABILITY STACK (post ADR-029)                              │
│                                                                            │
│  PRODUCERS (each emits OTel spans):                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │ Airflow / Dagster│  │ Spark / DuckDB   │  │ PyTorch (DDP/FSDP)│       │
│  │ (data pipelines) │  │ (data processing)│  │ (training)       │       │
│  │ OTel auto-instr  │  │ OTel native SDK  │  │ manual spans      │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │ /api/agent-triage│  │ Model serving    │  │ GenAI pipelines  │       │
│  │ (ISR Stage 3)    │  │ (Triton/PyTorch) │  │ (RAG, diffusion) │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
│         │                  │                      │                       │
│         └──── OTLP/gRPC ──┴──────────────────────┘                      │
│                              │                                            │
│                              ▼                                            │
│                  ┌───────────────────────┐                                │
│                  │  OTel Collector        │                                │
│                  │  - receive OTLP       │                                │
│                  │  - batch (5s/1024)     │                                │
│                  │  - tail sampling       │                                │
│                  │    (errors + p99)      │                                │
│                  │  - k8s enrichment      │                                │
│                  └───────────────────────┘                                │
│                              │                                            │
│                              ▼                                            │
│         ┌────────────────────┼────────────────────┐                       │
│         ▼                    ▼                    ▼                       │
│  ┌────────────┐      ┌────────────┐      ┌────────────┐                  │
│  │   Tempo     │      │   Loki     │      │   Mimir    │                  │
│  │   (traces)  │      │   (logs)   │      │  (metrics) │                  │
│  │  30-day ret │      │ 14-day ret │      │ 90-day ret │                  │
│  └────────────┘      └────────────┘      └────────────┘                  │
│         │                    │                    │                       │
│         └────────────────────┼────────────────────┘                      │
│                              │                                            │
│                              ▼                                            │
│                    ┌────────────────┐                                    │
│                    │     Grafana     │                                    │
│                    │  - TraceQL      │                                    │
│                    │  - LogQL        │                                    │
│                    │  - PromQL       │                                    │
│                    │  - Critical path│                                    │
│                    │    plugin       │                                    │
│                    └────────────────┘                                    │
│                                                                            │
│  CORRELATION (the unification value):                                    │
│    model degrades → find training trace → find data pipeline trace        │
│    → find upstream dataset → identify drift source                        │
│                                                                            │
│  ALL OSS — no vendor lock-in (Tempo/Loki/Mimir/Grafana)                  │
└────────────────────────────────────────────────────────────────────────────┘`} />
      </SectionCard>

      {/* Insight */}
      <SectionCard title="My deeper thought: traces ARE distributed backpropagation" description="The structure of a trace (DAG of causal dependencies) is mathematically identical to the computational graph in PyTorch autograd. Critical-path analysis is the dual of backward propagation — both compute the longest path through a DAG, just for different reasons (latency vs gradient)." icon={<TrendingUp className="h-5 w-5" />} badge="Insight">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>The structural isomorphism between an OpenTelemetry trace and a PyTorch computational graph is exact, not metaphorical. <strong className="text-foreground/80">Both are DAGs of typed operations with parent-child edges.</strong> A trace's spans correspond to autograd's nodes; parent_span_id corresponds to the gradient-input edges in autograd. The critical-path algorithm (Kahn topo sort + DP) is the same algorithm used to determine operation ordering in Just-In-Time compilers (TorchDynamo, XLA). The dist[] table that tracks "longest path to this node" in critical-path analysis is the same DP table that tracks "gradient w.r.t. this node" in chain-rule backpropagation. The recurrence dist[v] = max(dist[u] + dur[v]) is the "max" version of autograd's grad[v] = Σ(grad[u] · ∂v/∂u) — both propagate information backward through a DAG.</p>
          <p><strong className="text-foreground/80">This unification explains why distributed tracing and distributed training hit the same fundamental trade-offs.</strong> The DDP AllReduce is on the critical path of a training trace because it's a synchronous barrier — every GPU waits. The analogous operation in autograd is the gradient accumulation across branches of the DAG — every consumer waits for every producer. The "overlap AllReduce with backward" optimisation (use a separate CUDA stream) is the same idea as "fused operations in autograd" (use a custom kernel) — both move work off the critical path. The roofline model (compute-bound vs comm-bound, see the comp-sci page) is the same model whether applied to GPU throughput or trace latency. The mathematics of "where is the bottleneck" is invariant to the substrate.</p>
          <p><strong className="text-foreground/80">This connects ADR-029 (OpenTelemetry) to ADR-028 (FSDP) to ADR-019 (bandit) to ADR-027 (diffusion).</strong> The bandit is a 1-step decision process — a 1-span trace. The LLM generation is a T-step autoregressive process — a chain of T spans. The diffusion reverse process is a T-step stochastic process — a chain of T spans (one per denoising step). The FSDP training loop is an N-step iterative process with per-step sub-traces (forward → AllReduce → backward → optimiser). All four are temporal DAGs, and OpenTelemetry gives a single language to describe all of them. When the model-monitoring page reports "drift detected on model X trained at T", the trace_id from T is the key that joins ML telemetry back to data telemetry back to the pipeline that produced the data. The platform's three loops — data engineering loop, ML training loop, model monitoring loop — become one continuous observability loop. The deeper insight: observability is to operations what autograd is to learning — both make DAGs debuggable by computing their duals.</p>
        </div>
      </SectionCard>

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("distributed-training")} className="text-sm text-primary hover:underline">→ Distributed Training (FSDP — what we trace)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("model-monitoring")} className="text-sm text-primary hover:underline">→ Model Monitoring (the trigger for trace investigation)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("governance")} className="text-sm text-primary hover:underline">→ Governance (OpenLineage → OTel bridge)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("dashboard")} className="text-sm text-primary hover:underline">→ Live Dashboard (where traces surface)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">→ ADR-029 (OpenTelemetry adoption)</Link>
      </div>
    </div>
  );
}
