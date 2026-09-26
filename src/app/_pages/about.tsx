"use client";

import Link from "next/link";
import { SectionCard, PageHeader } from "../_components/section-card";
import { hrefFor } from "../_lib/router";
import { COMPANY } from "../_data/synthetic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Info,
  ShieldCheck,
  Mail,
  Github,
  FileText,
  Scale,
  Users,
  Database,
  Boxes,
  GitBranch,
  Workflow,
  BarChart3,
  ArrowLeftRight,
  GitMerge,
  Network,
  Lock,
  ExternalLink,
} from "lucide-react";

const PUBLIC_REPO_URL = "https://github.com/testdemoqwenai2025-creator/DemoAppDataSci";
const PRIVATE_REPO_URL = "https://github.com/testdemoqwenai2025-creator/AppDataSci-Advanced";
const CONTACT_EMAIL = "testdemoqwenai2025@gmail.com";

const GDPR_RIGHTS = [
  { right: "Right of access (Art. 15)", implementation: "Unity Catalogue audit log + access reviews" },
  { right: "Right to rectification (Art. 16)", implementation: "dbt snapshot history + MERGE on business key" },
  { right: "Right to erasure (Art. 17)", implementation: "Delta DELETE + VACUUM + downstream dbt re-run" },
  { right: "Right to data portability (Art. 20)", implementation: "Snowflake secure sharing + Parquet export" },
  { right: "Right to object (Art. 21)", implementation: "Opt-out registry synced from Zendesk → Hightouch" },
  { right: "Right to restrict processing (Art. 18)", implementation: "RLS policy + Immuta masking toggle" },
];

const PRINCIPLES = [
  { title: "Single source of truth", desc: "Every metric is defined once in dbt + MetricFlow — dashboards read the same canonical SQL as Hightouch syncs.", icon: Database },
  { title: "Layered & idempotent", desc: "Bronze→Silver→Gold. Bronze is append-only, Silver is conformed via MERGE, Gold is dimensional. Re-runs never corrupt history.", icon: Boxes },
  { title: "Governance as code", desc: "Unity Catalogue grants, PII tags, RLS policies, DQ rules and CI pipelines are all Terraform/YAML — no manual changes.", icon: ShieldCheck },
  { title: "Cost-aware FinOps", desc: "Multi-cluster autoscale, auto-suspend, Z-ORDER, cluster pools — drove 19% cost-per-TB reduction YoY.", icon: Workflow },
];

const STACK = [
  { name: "Snowflake", icon: Database, page: "snowflake" as const },
  { name: "Databricks + Delta", icon: Boxes, page: "databricks" as const },
  { name: "dbt + semantic layer", icon: GitBranch, page: "dbt" as const },
  { name: "Tableau", icon: BarChart3, page: "tableau" as const },
  { name: "Fivetran + Hightouch", icon: ArrowLeftRight, page: "fivetran-hightouch" as const },
  { name: "Airflow + Dagster", icon: Workflow, page: "orchestration" as const },
  { name: "Unity Catalogue", icon: ShieldCheck, page: "governance" as const },
  { name: "Git + GitHub Actions", icon: GitMerge, page: "cicd" as const },
  { name: "Reference architecture", icon: Network, page: "architecture" as const },
];

export function AboutPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="About & compliance"
        title="About this reference platform"
        description={`The ${COMPANY.name} Data Platform is a synthetic reference implementation — every number, schema, pipeline and dashboard is hypothetical. It exists to illustrate how a modern, governed, single-source-of-truth data platform is built and operated.`}
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Info className="h-3 w-3" /> Synthetic</Badge>
            <Badge variant="outline" className="gap-1.5"><ShieldCheck className="h-3 w-3" /> GDPR</Badge>
          </div>
        }
      />

      {/* Mission */}
      <SectionCard
        title="Mission & audience"
        description="Why this platform exists and who it serves."
        icon={<Info className="h-5 w-5" />}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="text-sm text-muted-foreground leading-relaxed">
            The platform exists to give every analyst, data scientist and decision-maker at {COMPANY.name} a single,
            trusted, governed place to find data and metrics — without juggling spreadsheets, dashboard copies, or
            shadow pipelines. It is built and maintained by the Data Platform engineering team in partnership with
            data scientists, analysts, architects and business stakeholders across nine markets.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            The reference architecture is shared publicly via the DemoAppDataSci repository so that interested
            parties can preview the platform, design and code without signing an NDA. Modifications and the full
            advanced configuration live in the private AppDataSci-Advanced repository, where the team iterates
            on changes before they are mirrored back to the public preview.
          </p>
        </div>
      </SectionCard>

      {/* Synthetic data disclaimer */}
      <SectionCard
        title="Synthetic data disclaimer"
        icon={<FileText className="h-5 w-5" />}
        badge="Important"
        badgeVariant="destructive"
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">All numbers, schemas, pipelines, dashboards and business names
            in this platform are synthetic and hypothetical.</strong> Any resemblance to real companies, persons,
            products or events is coincidental.
          </p>
          <p>
            The fictional retailer &ldquo;{COMPANY.name}&rdquo; exists only to provide realistic context. No real
            personal data, transaction data, or commercial data is processed, stored, transmitted or visualised
            anywhere in this reference implementation.
          </p>
          <p>
            If you would like to validate any figure shown here against a real business, please contact the team
            using the contact details below — the synthetic numbers are illustrative only.
          </p>
        </div>
      </SectionCard>

      {/* Principles */}
      <SectionCard
        title="Design principles"
        description="The four principles that drive every architectural decision on the platform."
        icon={<Scale className="h-5 w-5" />}
      >
        <div className="grid md:grid-cols-2 gap-4">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="rounded-md border border-border/60 p-4 bg-muted/20">
              <div className="flex items-center gap-2 mb-2">
                <p.icon className="h-4 w-4 text-primary" />
                <p className="font-semibold text-sm">{p.title}</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Stack */}
      <SectionCard
        title="Technology stack — every page is one click away"
        description="Click any tile below to deep-dive into the corresponding layer of the platform."
        icon={<Boxes className="h-5 w-5" />}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {STACK.map((s) => (
            <Link
              key={s.name}
              href={hrefFor(s.page)}
              className="group flex items-center gap-3 rounded-md border border-border/60 p-3 hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <s.icon className="h-5 w-5 text-primary/80 group-hover:text-primary" />
              <span className="text-sm font-medium">{s.name}</span>
              <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </SectionCard>

      {/* GDPR */}
      <SectionCard
        title="GDPR compliance — how the platform operationalises each data-subject right"
        description="EU Regulation 2016/679 (General Data Protection Regulation) is implemented as engineering controls, not just policies."
        icon={<ShieldCheck className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">GDPR right</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Engineering implementation</th>
              </tr>
            </thead>
            <tbody>
              {GDPR_RIGHTS.map((g) => (
                <tr key={g.right} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-2.5 font-medium align-top">{g.right}</td>
                  <td className="px-4 py-2.5 text-muted-foreground align-top font-mono text-xs">{g.implementation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-muted/20 border-t border-border/40 text-xs text-muted-foreground">
          <p className="flex items-start gap-2">
            <Lock className="h-3.5 w-3.5 mt-0.5 text-primary/70 shrink-0" />
            <span>
              All PII columns are tagged in Unity Catalogue, surfaced through <code className="font-mono">_masked</code> views
              with role-based redaction, and access is audited end-to-end. Data subject requests (DSARs) are
              acknowledged within 72 hours and fulfilled within 30 days, in line with GDPR Art. 12.
            </span>
          </p>
        </div>
      </SectionCard>

      {/* Repositories */}
      <SectionCard
        title="Repositories & preview workflow"
        description="The platform is split across a public preview repository (no NDA required) and a private advanced repository where the team iterates on changes."
        icon={<Github className="h-5 w-5" />}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-md border border-border/60 p-4 bg-muted/20">
            <div className="flex items-center gap-2 mb-2">
              <Github className="h-4 w-4" />
              <p className="font-semibold text-sm">DemoAppDataSci</p>
              <Badge variant="outline" className="ml-auto text-[10px]">Public</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Public preview mirror — anyone can browse without signing an NDA. Updated automatically on every
              push to the private advanced repo.
            </p>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <a href={PUBLIC_REPO_URL} target="_blank" rel="noopener noreferrer">
                <Github className="h-3.5 w-3.5" />
                View public repo
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
          <div className="rounded-md border border-border/60 p-4 bg-muted/20">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-primary" />
              <p className="font-semibold text-sm">AppDataSci-Advanced</p>
              <Badge variant="outline" className="ml-auto text-[10px]">Private</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Private advanced repository — the source of truth for ongoing development. Changes here are mirrored
              to the public preview repo via a GitHub Actions sync workflow.
            </p>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <a href={PRIVATE_REPO_URL} target="_blank" rel="noopener noreferrer">
                <Github className="h-3.5 w-3.5" />
                View private repo
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
        <div className="mt-4 rounded-md border border-dashed border-border/60 p-3 bg-muted/10">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Sync workflow:</strong> The private repo is the upstream. On every
            push to <code className="font-mono">main</code> on <code className="font-mono">AppDataSci-Advanced</code>,
            a GitHub Actions workflow pushes the same commit to <code className="font-mono">DemoAppDataSci</code>.
            The public mirror therefore always reflects the latest state of the advanced repo, with no manual
            intervention. Previewers can clone or browse <code className="font-mono">DemoAppDataSci</code> freely;
            contributors commit to <code className="font-mono">AppDataSci-Advanced</code>.
          </p>
        </div>
      </SectionCard>

      {/* Contact */}
      <SectionCard
        title="Contact"
        description="For questions, contributions, security disclosures or GDPR data-subject requests."
        icon={<Mail className="h-5 w-5" />}
      >
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-md border border-border/60 p-4">
            <Mail className="h-4 w-4 text-primary mb-2" />
            <p className="text-xs text-muted-foreground mb-1">General enquiries / DSARs</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-sm font-mono hover:text-primary transition-colors break-all"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
          <div className="rounded-md border border-border/60 p-4">
            <Github className="h-4 w-4 text-primary mb-2" />
            <p className="text-xs text-muted-foreground mb-1">GitHub user</p>
            <a
              href="https://github.com/testdemoqwenai2025-creator"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono hover:text-primary transition-colors"
            >
              @testdemoqwenai2025-creator
            </a>
          </div>
          <div className="rounded-md border border-border/60 p-4">
            <Users className="h-4 w-4 text-primary mb-2" />
            <p className="text-xs text-muted-foreground mb-1">Team</p>
            <p className="text-sm">ModernDataSciEng Platform Engineering</p>
            <p className="text-[11px] text-muted-foreground">Synthetic reference team · {COMPANY.fiscalYear}</p>
          </div>
        </div>
      </SectionCard>


      <DeeperThoughtSection pageTitle="About & Compliance">
        <DeeperThought title="About & Compliance IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about About & Compliance is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. About & Compliance connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where About & Compliance sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (About & Compliance) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
        <Link href={hrefFor("home")} className="text-sm text-primary hover:underline">
          → Return to overview
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("architecture")} className="text-sm text-primary hover:underline">
          → View the architecture
        </Link>
      </div>
    </div>
  );
}
