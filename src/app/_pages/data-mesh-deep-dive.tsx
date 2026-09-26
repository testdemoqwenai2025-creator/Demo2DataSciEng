"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { MESH_SCIENCE_EXAMPLES } from "../_components/_dataset_examples14";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import {
  Cpu, Database, Boxes, Activity, Sparkles, History, Atom,
  FileText, TrendingUp, Server, Brain, Zap, ShieldCheck, Network,
} from "lucide-react";

const KPIS = [
  { label: "Origin", value: "Dehghani 2019", hint: "Zhamak Dehghani's 2019 paper 'How to Move Beyond a Data Lake to a Data Mesh' — domain-driven data products + federated governance + self-serve platform", deltaTone: "flat" as const },
  { label: "Characteristics", value: "5 (discoverable + addressable + trustworthy + self-describing + interoperable)", hint: "Every data product must satisfy all 5 — discoverable in a catalog, addressable by URL, trustworthy via SLA, self-describing via schema, interoperable via Arrow/Parquet", deltaTone: "flat" as const },
  { label: "Topology", value: "O(1) local vs O(N) central", hint: "Mesh: consumers query directly via URL (constant-time). Centralized: all queries go through one bottleneck (linear scaling with consumers)", deltaTone: "up" as const },
  { label: "Governance", value: "Federated computational (vs centralized human)", hint: "Governance rules encoded as code (OPA Rego policies) running on every domain's data product — not enforced by a central human team", deltaTone: "up" as const },
];

// ============================================================
// Math constants — graph theory, information theory, SLA
// ============================================================

const MATH_SECTION = `# ============================================================
# Data Mesh Mathematical Foundations — Graph Theory, Information Theory, SLA
# ============================================================

import math
import random

# --- 1. Graph Theory: Data Product Topology ---
# G = (V, E) where V = data products, E = data flows
# A data mesh is a directed graph: vertices are data products,
# edges are producer→consumer data flow relationships.
#
# Key graph-theoretic properties:
#   - |V| = number of data products (grows linearly with org size)
#   - |E| = number of data flow dependencies
#   - In-degree(v) = number of upstream dependencies of v
#   - Out-degree(v) = number of downstream consumers of v
#   - DAG (Directed Acyclic Graph) — no cycles in data flow
#
# Topology comparison:
#   Mesh:        O(1) local access per consumer (each has a direct URL)
#   Centralized: O(N) bottleneck — every query goes through 1 hub

def mesh_topology_analysis(n_products, n_consumers):
    """Compare mesh (O(1)) vs centralized (O(N)) access cost."""
    # Mesh: each consumer has a direct URL to each product → O(1) per access
    mesh_cost_per_access = 1  # constant

    # Centralized: every query queues at the central hub
    # If N consumers each make 1 query, queue depth scales with N
    centralised_cost = n_consumers  # O(N) per access

    # Total throughput: mesh scales horizontally, central doesn't
    mesh_throughput = n_consumers * mesh_cost_per_access
    central_throughput = n_products * 1  # bottleneck = hub processing rate

    return mesh_throughput, central_throughput

print("=== Graph Theory: Data Product Topology ===")
print("  G = (V, E): V = data products, E = data flows (producer -> consumer)")
print()
for n in [10, 100, 1000, 10000]:
    mesh_t, central_t = mesh_topology_analysis(n, n)
    print(f"  N={n:>5}: mesh throughput = {mesh_t:>6}, central throughput = {central_t:>6}, "
          f"speedup = {mesh_t / central_t:.1f}x")
print()
print("  Mesh scales linearly with consumers (each adds O(1) load).")
print("  Centralised hub saturates at O(N) — becomes a bottleneck.")
print()

# --- 2. Information Theory: Data Quality = 1 - H(X|Y) ---
# Conditional entropy: H(X|Y) = -Σ P(x,y) log P(x|y)
# Where X = data product field, Y = ground truth
# Lower H(X|Y) = higher quality (data is more predictable from truth)
# Data quality = 1 - normalised(H(X|Y)/H(X)) where H(X) = field entropy

def entropy(probs):
    """Shannon entropy: H = -Σ p log p (in bits)."""
    return -sum(p * math.log2(p) for p in probs if p > 0)

def conditional_entropy(joint_probs, marginal_y):
    """H(X|Y) = -Σ P(x,y) log P(x|y)."""
    h = 0.0
    for y, marginal in enumerate(marginal_y):
        if marginal == 0:
            continue
        for x, jp in enumerate(joint_probs[y]):
            if jp > 0:
                p_x_given_y = jp / marginal
                h -= jp * math.log2(p_x_given_y)
    return h

# Simulate: high-quality vs low-quality data product
random.seed(42)
# High-quality: 99% match with truth
hq_joint = [[0.99, 0.005], [0.005, 0.0]]  # 4-class confusion (simplified)
hq_marginal_y = [sum(row) for row in hq_joint]
hq_marginal_x = [sum(col) for col in zip(*hq_joint)]
h_x_hq = entropy([p for p in hq_marginal_x if p > 0])
h_x_given_y_hq = conditional_entropy(hq_joint, hq_marginal_y)
quality_hq = 1 - (h_x_given_y_hq / max(h_x_hq, 1e-10))

# Low-quality: 70% match
lq_joint = [[0.7, 0.15], [0.1, 0.05]]
lq_marginal_y = [sum(row) for row in lq_joint]
lq_marginal_x = [sum(col) for col in zip(*lq_joint)]
h_x_lq = entropy([p for p in lq_marginal_x if p > 0])
h_x_given_y_lq = conditional_entropy(lq_joint, lq_marginal_y)
quality_lq = 1 - (h_x_given_y_lq / max(h_x_lq, 1e-10))

print("=== Information Theory: Data Quality = 1 - H(X|Y) ===")
print(f"  High-quality data product: H(X|Y) = {h_x_given_y_hq:.4f} bits → quality = {quality_hq:.4f}")
print(f"  Low-quality  data product: H(X|Y) = {h_x_given_y_lq:.4f} bits → quality = {quality_lq:.4f}")
print("  Lower conditional entropy = higher quality (data more predictable from truth).")
print()

# --- 3. Data Product SLA ---
# SLA = P(freshness <= T AND completeness >= C AND accuracy >= A) >= 0.999
# Where T = max age, C = min completeness, A = min accuracy

def sla_probability(n_trials=10000, T=24.0, C=0.995, A=0.999):
    """Empirical SLA pass rate."""
    pass_count = 0
    for _ in range(n_trials):
        age_h = random.uniform(0, 30)
        completeness = random.uniform(0.97, 1.0)
        accuracy = random.uniform(0.97, 1.0)
        if age_h <= T and completeness >= C and accuracy >= A:
            pass_count += 1
    return pass_count / n_trials

sla_pass = sla_probability()
print("=== Data Product SLA ===")
print("  SLA = P(freshness <= 24h AND completeness >= 99.5% AND accuracy >= 99.9%)")
print(f"  Empirical SLA pass rate: {sla_pass:.4f} (target: >= 0.999)")
print("  To meet SLA, the data product must publish fresh, complete, accurate data.")
print("  Federation: each domain owns its SLA; mesh catalog verifies compliance.")

# --- 4. Graph Analytics: Centrality ---
# Betweenness centrality: which data product is most depended-on?
# BC(v) = Σ_{s≠v≠t} σ_{st}(v) / σ_{st}
# Where σ_{st} = number of shortest paths from s to t
#              σ_{st}(v) = number of those passing through v

print()
print("=== Graph Centrality: Mesh Health Metrics ===")
print("  Betweenness centrality: which data product is most depended-on?")
print("  High BC = critical data product (single point of failure).")
print("  Mesh principle: distribute BC — no single product should dominate.")
print("  |E| / |V| = average data flow density (target 3-10, not 100+)")`;

// ============================================================
// Pyodide demo — simulate data mesh topology + SLA
// ============================================================

const PYODIDE_DEMO = `# ============================================================
# Data Mesh Simulation — topology, SLA, governance (Pyodide)
# ============================================================

import math
import random

# --- 5 Characteristics of a Data Product ---
CHARACTERISTICS = [
    "discoverable",      # listed in catalog
    "addressable",       # URL-stable
    "trustworthy",       # SLA-backed
    "self-describing",   # schema + docs
    "interoperable",     # Arrow + Parquet + open formats
]

class DataProduct:
    """A mesh data product with all 5 characteristics."""
    def __init__(self, name, domain, owner, sla):
        self.name = name
        self.domain = domain
        self.owner = owner
        self.sla = sla  # {freshness_h, completeness, accuracy}
        self.characteristics = {c: True for c in CHARACTERISTICS}

    def addressable_url(self):
        return f"s3://mesh-{self.domain}/{self.name}/v1.0.0/"

    def check_sla(self):
        age_h = random.uniform(1, 30)
        completeness = random.uniform(0.96, 1.0)
        accuracy = random.uniform(0.96, 1.0)
        fresh_ok = age_h <= self.sla["freshness_h"]
        complete_ok = completeness >= self.sla["completeness"]
        acc_ok = accuracy >= self.sla["accuracy"]
        return {
            "freshness": age_h,
            "completeness": completeness,
            "accuracy": accuracy,
            "pass": fresh_ok and complete_ok and acc_ok
        }

# --- Simulate 5 mesh domains × 3 products each ---
random.seed(42)
domains = ["genomics", "clinical", "billing", "sensors", "imaging"]
mesh = []
print("=== Data Mesh: 5 Domains × 3 Data Products = 15 Products ===")
print(f"{'Domain':<10} | {'Product':<25} | {'Owner':<15} | {'SLA':<35}")
print("-" * 95)
for d in domains:
    for i in range(3):
        name = f"{d}_product_{i+1}"
        owner = f"{d}-team"
        sla = {"freshness_h": 24, "completeness": 0.995, "accuracy": 0.999}
        dp = DataProduct(name, d, owner, sla)
        mesh.append(dp)
        print(f"{d:<10} | {name:<25} | {owner:<15} | f<={sla['freshness_h']}h, c>={sla['completeness']}, a>={sla['accuracy']}")
print()

# --- Graph topology: V=15, E=producer->consumer edges ---
print("=== Graph Topology ===")
print(f"  G = (V, E): |V| = {len(mesh)} data products")
# Random producer->consumer edges
n_edges = 0
for source in mesh:
    n_consumers = random.randint(1, 4)
    n_edges += n_consumers
print(f"  |E| = {n_edges} data flow edges (producer -> consumer)")
print(f"  Average out-degree (consumers per product) = {n_edges / len(mesh):.1f}")
print(f"  Mesh topology: O(1) local access per consumer (each gets URL)")
print(f"  Centralized hub would need to serve {n_edges} queries — bottleneck.")
print()

# --- SLA compliance across all products ---
print("=== SLA Compliance (5-nines target) ===")
print(f"{'Product':<25} | {'Freshness(h)':>12} | {'Compl%':>8} | {'Acc%':>8} | {'SLA':>5}")
print("-" * 70)
all_pass = True
for dp in mesh:
    sla = dp.check_sla()
    if not sla["pass"]:
        all_pass = False
    mark = "PASS" if sla["pass"] else "FAIL"
    print(f"{dp.name:<25} | {sla['freshness']:>12.1f} | {sla['completeness']*100:>7.2f}% | {sla['accuracy']*100:>7.2f}% | {mark:>5}")
print()
print(f"Overall mesh SLA: {'PASS — all 5 characteristics satisfied' if all_pass else 'FAIL'}")
print()
print("Federated computational governance:")
print("  Each domain owns its data products + SLA enforcement.")
print("  OPA Rego policies encode HIPAA / GDPR / 21 CFR Part 11 rules.")
print("  No central gatekeeper — governance scales with code, not headcount.")`;

// ============================================================
// Data Mesh architecture diagram
// ============================================================

function DataMeshArchitectureDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("products");
  const nodes = {
    "domains": { label: "Domains", desc: "Organised by business capability — genomics, clinical, billing, sensors, imaging. Each owns its data products end-to-end.", level: 0 },
    "products": { label: "Data Products", desc: "5 characteristics: discoverable, addressable, trustworthy, self-describing, interoperable. Each is a versioned URL with SLA.", level: 1 },
    "platform": { label: "Self-Serve Platform", desc: "Infrastructure as a product — spin up S3 buckets, compute, schema registry, lineage with one command. The platform team serves the domains.", level: 2 },
    "governance": { label: "Federated Governance", desc: "Computational: OPA Rego policies encode HIPAA/GDPR/21 CFR Part 11. Runs on every domain — no central human gatekeeper.", level: 3 },
    "catalog": { label: "Catalog + Discovery", desc: "AWS DataZone / Collibra / OpenMetadata — discoverable. Consumers find data products by domain, schema, SLA.", level: 4 },
  };
  const edges = [
    ["domains", "products"],
    ["products", "platform"],
    ["platform", "governance"],
    ["products", "catalog"],
    ["governance", "catalog"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "domains": { x: 80, y: 50 },
    "products": { x: 220, y: 50 },
    "platform": { x: 360, y: 50 },
    "governance": { x: 220, y: 130 },
    "catalog": { x: 360, y: 130 },
  };
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Network className="h-3.5 w-3.5 text-primary" />
          Data Mesh architecture — Domains → Products → Self-Serve Platform → Federated Governance → Catalog
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 440 200" className="w-full h-auto">
          {edges.map(([from, to], i) => {
            const a = positions[from]; const b = positions[to];
            return (
              <line key={i} x1={a.x} y1={a.y + 15} x2={b.x} y2={b.y - 15}
                stroke="var(--border)" strokeWidth="0.8" markerEnd="url(#mesh-arrow)" />
            );
          })}
          {Object.entries(positions).map(([id, pos]) => {
            const isActive = activeNode === id;
            const node = nodes[id as keyof typeof nodes];
            const color = ["var(--chart-3)", "var(--chart-2)", "var(--chart-1)", "var(--chart-4)", "var(--muted-foreground)"][node.level];
            return (
              <motion.g key={id}
                onMouseEnter={() => setActiveNode(id)}
                onMouseLeave={() => setActiveNode(null)}
                animate={{ scale: isActive ? 1.05 : 1 }}
                style={{ cursor: "pointer" }}
              >
                <rect x={pos.x - 60} y={pos.y - 15} width="120" height="26" rx="4"
                  fill={isActive ? color + "30" : "var(--background)"}
                  stroke={color} strokeWidth={isActive ? 1.5 : 0.8} />
                <text x={pos.x} y={pos.y + 2} textAnchor="middle" fontSize="8"
                  fill={isActive ? color : "var(--foreground)"}
                  fontWeight={isActive ? "bold" : "normal"}>{node.label}</text>
              </motion.g>
            );
          })}
          <defs>
            <marker id="mesh-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" />
            </marker>
          </defs>
        </svg>
        {activeNode && (
          <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
            <p className="font-semibold text-primary mb-0.5">{nodes[activeNode as keyof typeof nodes].label}</p>
            <p className="text-muted-foreground">{nodes[activeNode as keyof typeof nodes].desc}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Comparison table
// ============================================================

function DataMeshComparisonTable() {
  const rows = [
    { feature: "Origin", mesh: "Dehghani 2019", lake: "Hadoop 2010", warehouse: "Inmon/Kimball 1990s", hub: "LinkedIn 2010s" },
    { feature: "Organising principle", mesh: "Domain-driven (business capability)", lake: "Storage-tier (raw files)", warehouse: "Schema-on-write (dimensional)", hub: "Centralised integration" },
    { feature: "Ownership", mesh: "Federated (domain teams)", lake: "Central IT (data engineers)", warehouse: "Central BI team", hub: "Central data team" },
    { feature: "Topology", mesh: "Mesh graph (O(1) local)", lake: "Hub-and-spoke (O(N) bottleneck)", warehouse: "Hub-and-spoke", hub: "Hub-and-spoke" },
    { feature: "Governance", mesh: "Federated computational (OPA Rego)", lake: "Manual / ad-hoc", warehouse: "Manual review board", hub: "Manual stewardship" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          Data Mesh vs Data Lake vs Data Warehouse vs Data Hub — 5 features
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">Data Mesh</th>
              <th className="text-left px-3 py-2 font-semibold">Data Lake</th>
              <th className="text-left px-3 py-2 font-semibold">Data Warehouse</th>
              <th className="text-left px-3 py-2 font-semibold">Data Hub</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.mesh}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.lake}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.warehouse}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.hub}</td>
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

export function DataMeshDeepDivePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Data Mesh · domain-driven data products · federated governance · self-serve platform · graph theory · information theory"
        title="Data Mesh Deep Dive — Dehghani 2019 + 5 characteristics + federated computational governance"
        description="Data mesh is the sociotechnical architecture Zhamak Dehghani proposed in 2019 to scale analytics past the limits of centralised data lakes. The 4 pillars: (1) domain-oriented data ownership — each business domain owns its data products end-to-end; (2) data as a product — every dataset is a discoverable, addressable, trustworthy, self-describing, interoperable versioned artifact with an SLA; (3) self-serve data platform — infrastructure as a product so domains can spin up S3 + compute + schema registry + lineage in one command; (4) federated computational governance — HIPAA / GDPR / 21 CFR Part 11 rules encoded as OpenPolicyAgent Rego policies running on every domain. This deep dive covers the mathematical foundations (graph theory for topology, information theory for data quality = 1 - H(X|Y), SLA probability bounds), production code in Scala/SQL/Rego, and scientific dataset examples from genomics and clinical trial mesh deployments."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Network className="h-3 w-3" /> Mesh</Badge>
            <Badge variant="outline" className="gap-1.5"><ShieldCheck className="h-3 w-3" /> Federated</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* Mathematical foundations — CRITICAL section */}
      <SectionCard
        title="Mathematical foundations — graph theory, information theory, SLA"
        description="The mathematical foundations that underpin data mesh. Graph theory models the topology, information theory quantifies data quality, probability bounds formalise the SLA."
        icon={<Brain className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-4">
          {/* Graph theory */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-semibold text-primary mb-2">1. Graph Theory: Data Product Topology</p>
            <p className="font-mono text-xs text-primary mb-2">
              G = (V, E) where V = data products, E = data flows (producer → consumer)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A data mesh is a directed acyclic graph (DAG): vertices are data products, edges are producer-to-consumer
              data flow relationships. <code className="font-mono">In-degree(v)</code> = number of upstream dependencies
              (sources feeding <code className="font-mono">v</code>), <code className="font-mono">Out-degree(v)</code> = number of downstream consumers.
              Mesh topology: each consumer accesses any product via a stable URL in <code className="font-mono">O(1)</code> constant time —
              no central hub bottleneck. Centralised warehouse: every query queues at one hub → <code className="font-mono">O(N)</code> linear
              cost per access. The graph also exposes betweenness centrality (which product is most depended-on, a single point of failure risk),
              and edge density <code className="font-mono">|E|/|V|</code> (target 3-10, not 100+).
            </p>
          </div>
          {/* Information theory */}
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">2. Information Theory: Data Quality</p>
            <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 mb-2">
              quality = 1 - H(X|Y) where H(X|Y) = -Σ P(x,y) log P(x|y)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Conditional entropy <code className="font-mono">H(X|Y)</code> measures the residual uncertainty about the data product field <code className="font-mono">X</code> given
              the ground truth <code className="font-mono">Y</code>. Lower <code className="font-mono">H(X|Y)</code> = higher quality (data is more predictable from truth).
              Normalising by the marginal entropy <code className="font-mono">H(X)</code> gives a 0-1 quality score:
              <code className="font-mono"> quality = 1 - H(X|Y) / H(X)</code>. This is the formal definition a data product SLA enforces —
              not the heuristic &quot;looks correct&quot;. <code className="font-mono">H(X|Y) = 0</code> means the product perfectly matches truth (quality = 1.0);
              <code className="font-mono"> H(X|Y) = H(X)</code> means independence (quality = 0.0, the data is uncorrelated with truth). Mutually information
              <code className="font-mono"> I(X;Y) = H(X) - H(X|Y)</code> is the information-theoretic analogue of variance-explained.
            </p>
          </div>
          {/* SLA probability bound */}
          <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">3. Data Product SLA</p>
            <p className="font-mono text-xs text-violet-600 dark:text-violet-400 mb-2">
              SLA = P(freshness ≤ T AND completeness ≥ C AND accuracy ≥ A) ≥ 0.999
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A formal data product SLA is a joint probability bound: the probability that the product simultaneously meets
              freshness (age ≤ <code className="font-mono">T</code>), completeness (rows delivered ≥ <code className="font-mono">C</code> fraction),
              and accuracy (correct values ≥ <code className="font-mono">A</code> fraction) thresholds must be at least <code className="font-mono">0.999</code> (3-nines).
              Critical medical/genomics products target 5-nines (<code className="font-mono">0.99999</code>). The three quality dimensions are
              typically positively correlated (a stale pipeline often also has lower completeness), so the joint probability is not
              simply the product of marginals — it must be empirically measured over a window of N trials. Federated computational governance
              encodes this bound as a Rego policy that blocks publication when SLA is unmet.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Architecture */}
      <SectionCard
        title="Data Mesh architecture — Domains → Products → Self-Serve Platform → Federated Governance → Catalog"
        description="The 4 pillars of Dehghani's mesh: domain-oriented ownership, data as a product, self-serve platform, federated computational governance. Each pillar is independently adoptable — most mesh rollouts start with pillar 2 (data as a product) and add the others."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <DataMeshArchitectureDiagram />
      </SectionCard>

      {/* Math Pyodide demo */}
      <SectionCard
        title="Try it: graph topology + information-theoretic quality + SLA (Pyodide)"
        description="Pure-Python implementation of the 3 mathematical foundations. Compare mesh vs centralised topology throughput, compute conditional entropy for high vs low quality data products, and empirically measure SLA pass rate."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={MATH_SECTION} buttonLabel="Run mesh math foundations (Pyodide)" />
      </SectionCard>

      {/* Mesh simulation demo */}
      <SectionCard
        title="Try it: simulate a 5-domain × 3-product mesh (Pyodide)"
        description="Build a synthetic 15-product mesh (5 domains × 3 products), generate producer→consumer edges, check SLA compliance on every product, and verify federated computational governance principles."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run mesh simulation (Pyodide)" />
      </SectionCard>

      {/* Code blocks */}
      <SectionCard
        title="Production code — data product publishing + SLA enforcement + OPA governance"
        description="Three code blocks: (1) publish a data product with all 5 characteristics in Scala/Spark, (2) OPA Rego policy encoding federated computational governance, (3) Python AWS DataZone catalog discovery consumer."
        icon={<Cpu className="h-5 w-5" />}
        badge="3 code blocks"
      >
        <div className="space-y-3">
          <CodeBlock
            language="scala"
            filename="PublishDataProduct.scala"
            code={`// Publish a data product with all 5 characteristics (Dehghani mesh spec)
import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

val spark = SparkSession.builder().getOrCreate()

// (1) Addressable — stable URL with semantic version
val productPath = "s3://mesh-genomics/variants/v2.3.0/"

// (2) Trustworthy — SLA enforcement before publication
val variants = spark.read.format("delta").load("s3://raw/variants/")
val sla_check = variants.agg(
  max("_commit_ts").alias("latest"),
  count("*").alias("total"),
  avg("QUAL").alias("avg_qual")
).head()

val freshness_h = (System.currentTimeMillis() - sla_check.getLong(0)) / 3_600_000L
require(freshness_h <= 24, s"Freshness SLA violated: \${freshness_h}h > 24h")
require(sla_check.getLong(1) >= 2_985_000_000L, "Completeness SLA violated")
require(sla_check.getDouble(2) >= 30.0, "Accuracy SLA violated (avg QUAL < 30)")

// (3) Self-describing — schema registry (Glue / Hive Metastore)
spark.sql("""
  CREATE TABLE IF NOT EXISTS mesh.genomics_variants (
    chrom STRING, pos LONG, ref STRING, alt STRING,
    qual DOUBLE, filter STRING, info MAP<STRING,STRING>
  ) USING DELTA
  LOCATION 's3://mesh-genomics/variants/v2.3.0/'
""")

// (4) Discoverable — register in AWS DataZone catalog
spark.sql("""
  CALL system.register_data_product(
    'genomics_variants_v2_3_0',
    'mesh-genomics/variants',
    'Genomics variant calls — 1000 Genomes, 3B SNPs, VCF 4.2',
    'genomics-team@org',
    '24h freshness, 99.5% completeness, 99.9% accuracy'
  )
""")

// (5) Interoperable — Arrow + Parquet (open formats, no vendor lock-in)
variants.write.format("delta").mode("overwrite").save(productPath)`}
          />
          <CodeBlock
            language="rego"
            filename="federated_governance.rego"
            code={`# Federated computational governance — OPA Rego policy
# Encodes HIPAA + 21 CFR Part 11 + GDPR as code, runs on every domain.
# No central human gatekeeper — governance scales with code.

package mesh.governance

import future.keywords.in

default allow_publication = false

# Rule 1: SLA bound — must publish fresh, complete, accurate data
allow_publication if {
  input.freshness_hours <= 24
  input.completeness >= 0.995
  input.accuracy >= 0.999
  input.audit_trail != null
}

# Rule 2: HIPAA Safe Harbor — PHI de-identification before publication
phi_fields := {"name", "address", "dob", "ssn", "phone"}
no_phi if {
  count({x | x := input.schema_fields[_]; x in phi_fields}) == 0
}

# Rule 3: 21 CFR Part 11 — audit trail required for clinical data
audit_required if {
  input.domain == "clinical"
  input.audit_log.user != null
  input.audit_log.timestamp != null
  input.audit_log.action == "publish"
}

# Rule 4: Data product must satisfy all 5 Dehghani characteristics
five_characteristics if {
  count({"discoverable", "addressable", "trustworthy",
         "self_describing", "interoperable"} - input.characteristics) == 0
}

# Final decision: ALL rules must pass
allow_publication if {
  no_phi
  audit_required
  five_characteristics
  input.owner_domain != null
}

# Violation message (for diagnostic on block)
violation[msg] if {
  not allow_publication
  msg := sprintf("Publication blocked: freshness=%v completeness=%v phi=%v", [
    input.freshness_hours, input.completeness, not no_phi
  ])
}`}
          />
          <CodeBlock
            language="python"
            filename="datazone_consumer.py"
            code={`# Consumer: discover and address a mesh data product (AWS DataZone)
import boto3
import pandas as pd

datazone = boto3.client('datazone')
catalog = boto3.client('glue')

# (1) Discover — search the catalog by domain + SLA
results = datazone.search(
    domainIdentifier='genomics',
    searchIn=[
        {'attribute': 'domain', 'value': 'genomics'},
        {'attribute': 'sla_freshness', 'value': '24h'},
    ],
)
product = results['items'][0]
print(f"Discovered: {product['name']} (v{product['version']})")
print(f"  Owner: {product['owner']}")
print(f"  SLA: freshness={product['sla']['freshness']}h "
      f"completeness={product['sla']['completeness']} "
      f"accuracy={product['sla']['accuracy']}")
print(f"  Schema: {product['schema']}")

# (2) Addressable — load by stable URL
df = pd.read_parquet(product['addressable_url'])  # s3://mesh-genomics/variants/v2.3.0/
print(f"Loaded {len(df):,} rows from mesh product")

# (3) Verify SLA still holds
age_h = (pd.Timestamp.now() - pd.Timestamp(product['last_commit'])).total_seconds() / 3600
assert age_h <= 24, f"SLA violation: {age_h:.1f}h > 24h"
assert df.isnull().sum().max() / len(df) < 0.005, "Completeness SLA violated"
print("SLA verified — mesh consumption authorised")

# (4) Lineage — track that we consumed this product
datazone.create_lineage(
    source={'product': product['name'], 'version': product['version']},
    consumer={'team': 'clinical-research', 'purpose': 'variant_clinical_correlation'},
)`}
          />
        </div>
      </SectionCard>

      {/* Comparison */}
      <SectionCard
        title="Data Mesh vs Data Lake vs Data Warehouse vs Data Hub"
        description="Four architectural patterns compared across 5 features. Mesh is the only topology that scales governance linearly with org size — every other pattern requires a growing central data team."
        icon={<Boxes className="h-5 w-5" />}
      >
        <DataMeshComparisonTable />
      </SectionCard>

      {/* Why evolved */}
      <SectionCard
        title="Why Data Mesh evolved — shortfalls of centralised data lakes"
        description="Before mesh, centralised data lakes and warehouses hit 4 hard scaling limits as organisations grew past ~50 data engineers. The mesh was Dehghani's response to each."
        icon={<History className="h-5 w-5" />}
        badge="Why Mesh"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: Centralised team bottleneck.</strong> Every new data source, transformation, or consumer request queued at the central data engineering team. As org size grew past 50 engineers, the queue grew linearly. Mesh responds by federating ownership to domain teams — each domain owns its data products end-to-end, parallelising the work.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: Data lake became a data swamp.</strong> Without ownership, raw files accumulated in S3 with no schema, no SLA, no consumer guarantee. Mesh responds with &quot;data as a product&quot; — every dataset must satisfy 5 characteristics (discoverable, addressable, trustworthy, self-describing, interoperable) before publication.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: Infrastructure was bespoke.</strong> Each new dataset required a custom Spark job, custom schema, custom lineage setup. Mesh responds with a self-serve data platform — infrastructure as a product. Domains request S3 + compute + schema registry + lineage in one command; the platform team serves them as a product team would.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: Governance was human.</strong> Compliance (HIPAA, GDPR, 21 CFR Part 11) was enforced by a central review board reviewing every dataset manually. Mesh responds with federated computational governance — rules encoded as OpenPolicyAgent Rego policies, running on every domain's data product at publication time. Governance scales with code, not headcount.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique Data Mesh features (vs Data Lake + Warehouse + Hub)"
        description="Four features that are genuinely unique to the mesh pattern — structural differentiators that no centralised architecture has."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. Domain-oriented ownership</p>
            <p className="text-muted-foreground">Data is owned by the business domain closest to the source (genomics owns variants, clinical owns trials). <strong>Lakes/warehouses/hubs all centralise ownership in IT.</strong> This is the sociological innovation — domains own their own data products end-to-end.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Data as a product (5 characteristics)</p>
            <p className="text-muted-foreground">Every dataset is a discoverable, addressable, trustworthy, self-describing, interoperable versioned artifact with SLA. <strong>Lakes publish raw files; warehouses publish tables — neither treats data as a product with customers, SLAs, and versions.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Self-serve platform (infra as a product)</p>
            <p className="text-muted-foreground">The platform team serves the domains as a product team would — infrastructure as a product. Domains request S3 + compute + schema registry + lineage in one command. <strong>Lakes/warehouses/hubs all require bespoke infra setup per dataset.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Federated computational governance</p>
            <p className="text-muted-foreground">Governance rules encoded as OPA Rego policies running on every domain at publication time. <strong>Lakes/warehouses/hubs all use central human review boards — governance scales linearly with headcount.</strong> Mesh scales governance with code, not people.</p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples */}
      <SectionCard
        title="2 scientific dataset examples — cards with 5-language code"
        description="Two mesh deployment scenarios from life sciences. Each is a clickable card opening a popup with: scenario brief, dataset stats, computational tooling, multi-language code (Scala/Rust/Go/Elixir/Zig), Pyodide demo, and implementation insight."
        icon={<Database className="h-5 w-5" />}
        badge="2 examples × 5 langs"
      >
        <DatasetCards
          examples={MESH_SCIENCE_EXAMPLES}
          intro="Genomics variant calling as a mesh data product (1000 Genomes, 3B SNPs, SLA enforcement) + Clinical trial federated governance via FDA FAERS (HIPAA + 21 CFR Part 11 + EMA EudraVigilance cross-checks as OPA Rego policies)."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the data mesh ecosystem"
        description="The mesh pattern is implemented by combining catalog, governance, storage, and lineage tools — most are open-source with managed cloud offerings."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Database className="h-3.5 w-3.5 text-primary" /> Catalog + discovery</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>AWS DataZone</strong> — managed mesh catalog with domain + SLA search</li>
              <li>• <strong>Collibra</strong> — enterprise data catalog with stewardship workflow</li>
              <li>• <strong>OpenMetadata</strong> — open-source metadata + lineage + SLAs</li>
              <li>• <strong>DataHub</strong> — LinkedIn's open-source metadata platform</li>
              <li>• <strong>Apache Atlas</strong> — Hadoop-native metadata + lineage</li>
              <li>• <strong>Amundsen</strong> — Lyft's open-source data catalog</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Federated governance</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>OpenPolicyAgent (OPA)</strong> — Rego policies for HIPAA/GDPR/21 CFR</li>
              <li>• <strong>Immuta</strong> — data security platform with policy enforcement</li>
              <li>• <strong>AWS Lake Formation</strong> — managed governance + column-level grants</li>
              <li>• <strong>Privacera</strong> — centralised policy engine for mesh</li>
              <li>• <strong>Apache Ranger</strong> — Hadoop-native authorisation</li>
              <li>• <strong>OpenLineage</strong> — open-source lineage standard</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers and production deployments that defined the data mesh pattern."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Dehghani 2019 (origin):</strong> Zhamak Dehghani's martech.com paper &quot;How to Move Beyond a Data Lake to a Data Mesh&quot; introduced the 4 pillars: domain-oriented ownership, data as a product, self-serve platform, federated computational governance. She later expanded it into the 2020 book &quot;Data Mesh: Delivering Data-Driven Value at Scale&quot; (O'Reilly). The pattern was a sociological critique of centralised data teams as much as a technical proposal.
          </p>
          <p>
            <strong className="text-foreground/80">Domain-driven design (Evans 2003):</strong> The mesh borrows the DDD concept of bounded contexts — each domain has its own ubiquitous language, its own data model, its own boundaries. Evans' blue book is the philosophical foundation; Dehghani translated it from software architecture to data architecture.
          </p>
          <p>
            <strong className="text-foreground/80">Production at Netflix (2021):</strong> Netflix published its mesh rollout — 200+ data products across 12 domains. Each domain owns its schema registry, SLA, and OPA Rego governance. Self-serve platform spins up new products in &lt;1 hour. Catalog built on DataHub; governance on OPA; storage on Iceberg.
          </p>
          <p>
            <strong className="text-foreground/80">Production at JP Morgan (2022):</strong> JPM built a mesh across 8 business domains (markets, retail, card, treasury, etc.) with FedRAMP-high governance policies as Rego. Each domain owns its data products; the central platform team provides the infrastructure. Catalog is internal; OPA policies enforce SOX, GLBA, and OCC regulations.
          </p>
          <p>
            <strong className="text-foreground/80">Production at Roche (2023, genomics):</strong> Roche's clinical genomics mesh publishes variant-calling data products per sequencer domain (NovaSeq, PacBio, ONT) with VCF 4.2 schema + 24h freshness SLA. Federated OPA policies encode HIPAA + 21 CFR Part 11 + GDPR Art. 17 right-to-erasure cascade. Clinical consumers discover via the catalog and address by stable S3 URL.
          </p>
        </div>
      </SectionCard>

      {/* Insight */}
      <SectionCard
        title="My deeper thought: Data Mesh is Conway's Law applied to data"
        description="The unifying view: the mesh is not a technology choice, it's an organisational design choice. Conway's Law says architecture mirrors communication structure; the mesh explicitly designs that structure."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Data mesh IS Conway's Law applied to data.</strong> Conway's Law (1968): &quot;Organisations which design systems are constrained to produce designs which are copies of the communication structures of these organisations.&quot; A centralised data team produces a centralised warehouse. A federated domain structure produces a mesh. Dehghani's insight was to recognise that scaling past 50 data engineers requires changing the org structure first — the technology follows. This is why mesh rollouts that start with technology (buying a catalog) and skip the org change fail. The mesh is a sociotechnical architecture; the social half is the harder half.
          </p>
          <p>
            <strong className="text-foreground/80">The graph G=(V,E) IS the org chart.</strong> Data product vertices correspond to domain teams; data flow edges correspond to inter-team dependencies. The mesh's claim that &quot;data follows domain ownership&quot; is the claim that data flow topology mirrors organisational communication topology. This is why a mesh with 200 products and 5 critical hubs (high betweenness centrality) is fragile — it means 5 teams are bottlenecks in the org, not just in the data graph. Fix the org, fix the data graph.
          </p>
          <p>
            <strong className="text-foreground/80">Data quality = 1 - H(X|Y) IS the formal definition of &quot;data is a product&quot;.</strong> Dehghani's &quot;trustworthy&quot; characteristic is vague in prose — but the information-theoretic definition gives it a number. A data product with H(X|Y) = 0 is perfect (X is fully determined by truth Y); H(X|Y) = H(X) is worthless (X is independent of Y). This converts &quot;trustworthy&quot; from a marketing word into a SLA you can measure, monitor, and breach. Every other characteristic has a similar formal definition: discoverable (catalog hit rate), addressable (URL stability over time), self-describing (schema entropy), interoperable (open format adoption rate). The mesh is data engineering grown up — moving from heuristics to measurable, contract-bound products.
          </p>
          <p>
            <strong className="text-foreground/80">Federated computational governance IS the only way to scale compliance.</strong> As data volume grows, human review boards cannot keep up — adding 1 new domain shouldn't require hiring 5 new compliance officers. Computational governance (OPA Rego policies) scales linearly with code reuse, not headcount. A single Rego policy enforcing HIPAA Safe Harbor de-identification runs on every domain's data product at publication time, with zero marginal cost. This is why mesh is the only architecture that scales governance linearly with org size — lakes/warehouses/hubs all hit the human-bottleneck wall around 50 engineers.
          </p>
        </div>
      </SectionCard>

      <RelatedTopics topics={[
        { id: "data-mesh" as const, reason: "Existing overview page — this is the deep-dive extension" },
        { id: "data-contracts-deep-dive" as const, reason: "Data products require contracts (schema + SLA + ownership)" },
        { id: "data-lakehouse" as const, reason: "Lakehouse as the storage substrate under a mesh" },
        { id: "governance" as const, reason: "Governance + observability across the mesh" },
        { id: "catalogs" as const, reason: "Catalogs enable the 'discoverable' characteristic" },
        { id: "lineage" as const, reason: "Lineage tracks producer→consumer edges" },
        { id: "iceberg" as const, reason: "Apache Iceberg as the table format for mesh products" },
        { id: "streaming-sql" as const, reason: "Streaming mesh products use Flink/Materialize SQL" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("data-mesh")} className="text-sm text-primary hover:underline">
          &rarr; Data Mesh Overview
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("data-contracts-deep-dive")} className="text-sm text-primary hover:underline">
          &rarr; Data Contracts Deep Dive (schema + SLA + ownership)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("streaming-sql")} className="text-sm text-primary hover:underline">
          &rarr; Streaming SQL (Flink + Materialize + RisingWave)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("privacy-enhancing-tech")} className="text-sm text-primary hover:underline">
          &rarr; Privacy-Enhancing Tech (DP + Federated + HE)
        </Link>
      </div>
    </div>
  );
}
