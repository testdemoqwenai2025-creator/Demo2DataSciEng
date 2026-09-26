"use client";

import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Network, Layers, ShieldCheck, Server, Cloud,
  TrendingUp, Boxes, GitBranch, ArrowRight,
} from "lucide-react";

const KPIS = [
  { label: "Data Mesh principles", value: "4", hint: "Domain ownership · Data as product · Federated governance · Self-serve platform", deltaTone: "flat" as const },
  { label: "Data product SLAs", value: "3", hint: "Freshness · Accuracy · Completeness", deltaTone: "flat" as const },
  { label: "Platform position", value: "Hybrid", hint: "Domain-driven internally, not full mesh", deltaTone: "flat" as const },
  { label: "Governance model", value: "Federated", hint: "Unity Catalogue + OpenLineage cross-domain", deltaTone: "flat" as const },
];

const PRINCIPLES = [
  {
    title: "1. Domain-oriented ownership",
    desc: "Each business domain (commerce, marketing, supply chain, finance) owns its data products end-to-end — from ingestion to serving. No central data team bottleneck.",
    when: "Organisations with mature domains that can own data",
    when_not: "Small teams (< 20 engineers) — a central team is simpler",
    icon: Network,
  },
  {
    title: "2. Data as a product",
    desc: "Each dataset is treated as a product with SLAs (freshness, accuracy, completeness), a product owner, versioning, and discoverability (catalogue entry).",
    when: "When data consumers (analysts, scientists) need trustworthy, documented data",
    when_not: "Internal-only scratch data that never leaves the team",
    icon: Boxes,
  },
  {
    title: "3. Federated computational governance",
    desc: "Global policies (PII, lineage, naming) enforced centrally; domain-specific rules (which columns to expose, which transforms) owned by each domain. Unity Catalogue + OpenLineage enable this.",
    when: "When multiple domains share infrastructure but need autonomy",
    when_not: "Single-team organisations (no federation needed)",
    icon: ShieldCheck,
  },
  {
    title: "4. Self-serve platform infrastructure",
    desc: "The platform team provides the infra (storage, compute, orchestration, governance, CI/CD) as a self-service product. Domains build data products on top without infra tickets.",
    when: "When the platform is mature enough to be self-service (our platform IS this)",
    when_not: "Early-stage — the platform itself is still being built",
    icon: Server,
  },
];

const DATA_PRODUCT_DEMO = `# Data Product — definition + SLA simulation
# Shows how a data product is defined with SLAs + discoverability

data_products = [
    {
        "name": "sales_daily_revenue",
        "domain": "commerce",
        "owner": "commerce-data-team",
        "sla_freshness": "1 hour",
        "sla_accuracy": "99.9%",
        "sla_completeness": "100%",
        "schema": {"order_date": "date", "revenue_gbp": "decimal", "region": "string"},
        "consumers": ["finance", "marketing", "executive"],
        "version": "2.1.0",
        "discoverable": True,
    },
    {
        "name": "customer_segments_vip",
        "domain": "marketing",
        "owner": "marketing-data-team",
        "sla_freshness": "15 min",
        "sla_accuracy": "98.0%",
        "sla_completeness": "99.5%",
        "schema": {"customer_id": "string", "segment": "string", "ltv": "decimal"},
        "consumers": ["salesforce", "klaviyo", "meta_ads"],
        "version": "1.3.0",
        "discoverable": True,
    },
    {
        "name": "inventory_health",
        "domain": "supply_chain",
        "owner": "sc-data-team",
        "sla_freshness": "4 hours",
        "sla_accuracy": "99.5%",
        "sla_completeness": "100%",
        "schema": {"sku": "string", "stock_level": "int", "reorder_point": "int"},
        "consumers": ["procurement", "store_ops"],
        "version": "1.0.0",
        "discoverable": True,
    },
]

print("=" * 70)
print("DATA PRODUCT CATALOGUE — 3 products across 3 domains")
print("=" * 70)

for dp in data_products:
    print(f"\\n  {dp['name']} v{dp['version']}")
    print(f"    Domain:    {dp['domain']}")
    print(f"    Owner:     {dp['owner']}")
    print(f"    SLA:       freshness={dp['sla_freshness']}, accuracy={dp['sla_accuracy']}, completeness={dp['sla_completeness']}")
    print(f"    Schema:    {dp['schema']}")
    print(f"    Consumers: {', '.join(dp['consumers'])}")
    print(f"    Status:    {'✓ Discoverable' if dp['discoverable'] else '✗ Hidden'}")

print(f"\\n{'=' * 70}")
print("GOVERNANCE: Federated — global policies enforced centrally,")
print("domain-specific rules owned by each domain team.")
print(f"{'=' * 70}")
print(f"\\nTotal products: {len(data_products)}")
print(f"Total consumers: {sum(len(dp['consumers']) for dp in data_products)}")
print(f"Domains: {len(set(dp['domain'] for dp in data_products))}")`;

export function DataMeshPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Data Mesh · organisational pattern"
        title="Data Mesh — Domain-Oriented Data Products"
        description="Data Mesh is not a technology — it's an organisational pattern. The 4 principles: domain-oriented ownership, data as a product, federated computational governance, and self-serve platform infrastructure. The platform's position: domain-driven internally (each team owns its tables) but not full mesh (the platform team still owns the infra). This is the pragmatic middle ground."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Network className="h-3 w-3" /> 4 principles</Badge>
            <Badge variant="outline" className="gap-1.5"><ShieldCheck className="h-3 w-3" /> Federated</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* The 4 principles */}
      <SectionCard
        title="The 4 principles of Data Mesh"
        description="Zhamak Dehghani's 2019 proposal. Each principle is necessary; none is sufficient alone."
        icon={<Layers className="h-5 w-5" />}
      >
        <div className="grid md:grid-cols-2 gap-4">
          {PRINCIPLES.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="rounded-md border border-border/60 p-4 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">{p.title}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{p.desc}</p>
                <dl className="text-[11px] space-y-1">
                  <div className="flex gap-2">
                    <dt className="text-emerald-600 dark:text-emerald-400 shrink-0">When:</dt>
                    <dd className="text-muted-foreground">{p.when}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-amber-600 dark:text-amber-400 shrink-0">When not:</dt>
                    <dd className="text-muted-foreground">{p.when_not}</dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Insight */}
      <SectionCard
        title="My deeper thought: the platform IS principle #4"
        description="The self-serve platform infrastructure IS what this platform provides. Principles 1-3 are organisational; principle 4 is technical. This platform is the answer to principle 4."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Data Mesh has 4 principles. Principles 1-3 (domain ownership, data as a product, federated governance) are <strong className="text-foreground/80">organisational</strong> — they require the company to restructure teams, assign domain ownership, and adopt a product mindset for data. These are hard, slow, political changes.
          </p>
          <p>
            Principle 4 (self-serve platform infrastructure) is <strong className="text-foreground/80">technical</strong> — it requires a platform that domains can build on without filing infra tickets. This is the principle this platform delivers. The 20 pages, 17 ADRs, 5 lazy lists, 2 bandits, 16 executable demos — they all serve principle 4. A domain team should be able to:
          </p>
          <ul className="ml-4 space-y-1 text-xs">
            <li>• <InlineCode>dbt build --select state:modified+</InlineCode> in CI (slim CI, ADR-006)</li>
            <li>• Open a PR that auto-creates a schema-registry entry (Fivetran drift)</li>
            <li>• Query their domain tables via DuckDB locally (ADR-014)</li>
            <li>• Deploy to production via GitHub Actions (ADR-006 + deploy workflow)</li>
            <li>• See lineage via OpenLineage (ADR-012)</li>
            <li>• Get DQ alerts via Monte Carlo + the agentic triage agent</li>
          </ul>
          <p>
            The platform&apos;s position is <strong className="text-foreground/80">hybrid</strong>: domain-driven internally (each team owns its tables, dbt models, and ADRs) but not full mesh (the platform team owns the infra, the governance policies, and the deploy pipeline). This is the pragmatic middle ground — you get the benefits of domain ownership without the full org restructure.
          </p>
        </div>
      </SectionCard>

      {/* Data product demo */}
      <SectionCard
        title="Try it: Data Product catalogue simulation (Pyodide)"
        description="Simulates 3 data products across 3 domains (commerce, marketing, supply chain). Each has SLAs, schema, consumers, versioning, discoverability."
        icon={<Boxes className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner
          code={DATA_PRODUCT_DEMO}
          buttonLabel="Run data product simulation (Pyodide)"
        />
      </SectionCard>

      {/* When to adopt Data Mesh */}
      <SectionCard
        title="When to adopt Data Mesh — and when NOT to"
        description="Data Mesh is a heavy organisational change. Don't adopt it unless you need it."
        icon={<GitBranch className="h-5 w-5" />}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">✓ Adopt Data Mesh when</p>
            <ul className="text-xs space-y-1.5 text-muted-foreground">
              <li>• 500+ engineers across 5+ domains</li>
              <li>• Central data team is the bottleneck (tickets queue up)</li>
              <li>• Domains have different data needs (can&apos;t share one warehouse model)</li>
              <li>• Data quality is poor because no one owns it</li>
              <li>• The platform is mature enough to be self-serve</li>
            </ul>
          </div>
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-4">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">✗ Don&apos;t adopt when</p>
            <ul className="text-xs space-y-1.5 text-muted-foreground">
              <li>• &lt; 20 data engineers (a central team is simpler)</li>
              <li>• Single domain or monolithic data needs</li>
              <li>• The platform isn&apos;t self-serve yet</li>
              <li>• Leadership expects &ldquo;Data Mesh&rdquo; to fix data quality (it won&apos;t — it&apos;s org, not tech)</li>
              <li>• You don&apos;t have domain teams that can own data products</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Data product definition */}
      <SectionCard
        title="What is a data product?"
        description="A data product is a dataset treated as a product — with an owner, SLAs, versioning, discoverability, and consumers."
        icon={<Boxes className="h-5 w-5" />}
      >
        <CodeBlock
          language="yaml"
          filename="data-product.yaml"
          code={`# Data product definition — versioned in Git, discoverable in catalogue
name: sales_daily_revenue
domain: commerce
owner: commerce-data-team
version: 2.1.0
status: active  # active | deprecated | experimental

# SLAs — the contract with consumers
sla:
  freshness: "1 hour"      # max age of latest row
  accuracy: "99.9%"        # % of rows matching source
  completeness: "100%"     # % of expected rows present

# Schema — the API surface
schema:
  - name: order_date
    type: date
    description: "Calendar date of the order"
  - name: revenue_gbp
    type: decimal(18,2)
    description: "Net revenue in GBP (after discounts, before returns)"
  - name: region_code
    type: string
    description: "ISO 2-letter region code (UK, EU, NA)"

# Consumers — who depends on this
consumers:
  - finance
  - marketing
  - executive

# Lineage — where this comes from (OpenLineage)
lineage:
  upstream: [bronze.shopify_orders, bronze.netsuite_gl]
  downstream: [gold.executive_revenue_dashboard, hightouch.vip_audience]

# Governance — PII + access
governance:
  pii: false
  access: "SELECT granted to REPORTER role"
  rls: "SESSION_CONTEXT('ROW_ACCESS_REGION')"`}
          highlight={[1, 2, 3, 4, 5, 9, 10, 11, 12, 16, 17, 18, 19, 28, 29, 30, 34, 35, 36, 37]}
        />
      </SectionCard>


      <DeeperThoughtSection pageTitle="Data Mesh">
        <DeeperThought title="Data Mesh IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Data Mesh is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Data Mesh connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Data Mesh sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Data Mesh) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
        </DeeperThought>
        <DeeperThought title="The fold pattern respects the reader's attention" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"This page has fold sections (collapsed by default) that reveal deeper content on demand — equation family comparisons, LaTeX derivations, production patterns, expected outputs, and citations. The basic content is visible immediately; the deeper phases are there when the reader is ready. Progressive disclosure isn't just UX — it's epistemological. A reader who wants the summary gets it; a reader who wants the derivation clicks to expand. Both are served by the same page."}</p>
        </DeeperThought>
        <DeeperThought title="The output IS the proof — not just the equation" connectedTo="ADR-034 (ESM-2 + AlphaFold2 adoption)">
          <p>{"Where this page has interactive demos (Pyodide + sliders + charts), the visual output IS the argument. Seeing a chart update as you drag a slider communicates the math in a way no formula can. The brain's pattern-recognition system processes the visual output faster than the verbal/analytical pathway. That's why the platform pairs every equation with a live demo — the output plays to a different level of the brain than the prose."}</p>
        </DeeperThought>
        <DeeperThought title="In a decade, this page will evolve — and that's the point" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"The datasets, libraries, and tools on this page will be updated as technology evolves. The 1000-Genomes Project will become the 10M-Genomes Project. NumPy may be replaced by a WebGPU-native array library. PyTorch may give way to a successor. But the math — SVD, Attention, Poisson, FFT, Bayes, Kalman, GBM — will be the same. The platform is designed for this evolution: the equations are the anchor, the tools are the amplifier, and the fold sections let us update the tools without rewriting the page."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("patterns")} className="text-sm text-primary hover:underline">
          → Data Engineering Patterns
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("governance")} className="text-sm text-primary hover:underline">
          → Governance (federated model)
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">
          → See ADR-018 (Polars as DataFrame library)
        </Link>
      </div>
    </div>
  );
}
