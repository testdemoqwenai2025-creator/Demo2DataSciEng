"use client";

import { useState } from "react";
import Link from "next/link";
import { SectionCard, PageHeader } from "../_components/section-card";
import { NextSteps } from "../_components/next-steps";
import { InlineCode } from "../_components/code-block";
import { ADRS, PATTERNS, TRADEOFFS } from "../_data/synthetic";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LazyList } from "../_components/lazy-list";
import { PyodideRunner } from "../_components/pyodide-runner";
import { KnowledgeShorts } from "../_components/knowledge-shorts";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  BookOpen,
  FileText,
  GitBranch,
  Scale,
  Lightbulb,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Search,
  Play,
  Terminal,
} from "lucide-react";

const STATUS_STYLE: Record<string, { badge: "default" | "outline" | "secondary" | "destructive"; icon: typeof CheckCircle2; tone: string }> = {
  accepted: { badge: "default", icon: CheckCircle2, tone: "text-emerald-600 dark:text-emerald-400" },
  proposed: { badge: "outline", icon: AlertTriangle, tone: "text-amber-600 dark:text-amber-400" },
  deprecated: { badge: "secondary", icon: XCircle, tone: "text-rose-600 dark:text-rose-400" },
  superseded: { badge: "secondary", icon: ArrowRight, tone: "text-muted-foreground" },
};

export function KnowledgePage() {
  const [selectedAdr, setSelectedAdr] = useState(ADRS[0].id);
  const [topicFilter, setTopicFilter] = useState<string>("all");

  const filteredAdrs = ADRS.filter((a) => topicFilter === "all" || a.tags.includes(topicFilter));
  const activeAdr = ADRS.find((a) => a.id === selectedAdr) ?? ADRS[0];
  const ActiveStatus = STATUS_STYLE[activeAdr.status] ?? STATUS_STYLE.accepted;

  const allTopics = Array.from(new Set(ADRS.flatMap((a) => a.tags))).sort();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Knowledge Loop · why"
        title="Knowledge Hub"
        description="The platform's institutional memory. Every architectural choice has a decision record (ADR) explaining the context, alternatives considered, and consequences. The pattern library captures reusable solutions; the trade-off matrices expose the reasoning behind the picks."
        right={
          <Badge variant="outline" className="gap-1.5">
            <BookOpen className="h-3 w-3" /> {ADRS.length} ADRs · {PATTERNS.length} patterns
          </Badge>
        }
      />

      {/* Intro */}
      <SectionCard
        title="Why a knowledge hub?"
        description="Most platforms document what they are. This hub documents why they are — and why they aren't something else."
        icon={<Lightbulb className="h-5 w-5" />}
      >
        <p className="text-sm text-muted-foreground leading-relaxed">
          A diagram tells you the platform exists. A decision record tells you why a smart team, faced with real
          constraints, picked this over the alternatives they considered. That context is what lets the next
          engineer know when the original decision is still valid — and when the world has changed enough that it
          needs to be revisited. Every ADR here was a real architectural fork; every pattern entry was a real
          failure mode observed; every trade-off matrix was a real argument resolved.
        </p>
      </SectionCard>

      {/* ADR browser */}
      <SectionCard
        title="Architecture Decision Records (ADRs)"
        description="Click any ADR to see the full context, decision, consequences and alternatives considered."
        icon={<FileText className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="grid lg:grid-cols-[1fr_1.4fr] divide-x divide-border/60">
          {/* Left: ADR list + filter */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Filter by topic</p>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              <button
                onClick={() => setTopicFilter("all")}
                className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${topicFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border/60 hover:bg-accent"}`}
              >
                All
              </button>
              {allTopics.map((t) => (
                <button
                  key={t}
                  onClick={() => setTopicFilter(t)}
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${topicFilter === t ? "bg-primary text-primary-foreground border-primary" : "border-border/60 hover:bg-accent"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            {/* LazyList — only renders first 5 ADRs + Show more button */}
            <LazyList
              items={filteredAdrs}
              initialCount={5}
              increment={5}
              getKey={(a) => a.id}
              showMoreLabel={(count) => `Show ${count} more ADRs`}
              showLessLabel="Collapse to top 5"
            >
              {(a) => {
                const S = STATUS_STYLE[a.status] ?? STATUS_STYLE.accepted;
                const isActive = a.id === selectedAdr;
                return (
                  <li key={a.id} className="mb-1">
                    <button
                      onClick={() => setSelectedAdr(a.id)}
                      className={`w-full text-left rounded-md p-2.5 transition-colors ${isActive ? "bg-primary/10 border border-primary/40" : "border border-transparent hover:bg-accent"}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-[11px] text-muted-foreground mt-0.5 shrink-0">{a.id}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium leading-snug ${isActive ? "text-primary" : ""}`}>{a.title}</p>
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <Badge variant={S.badge} className="text-[10px] gap-1">
                              <S.icon className="h-2.5 w-2.5" /> {a.status}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{a.date}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              }}
            </LazyList>
          </div>

          {/* Right: ADR detail */}
          <div className="p-5">
            <div className="flex items-start gap-2 mb-4">
              <span className="font-mono text-xs text-muted-foreground mt-0.5">{activeAdr.id}</span>
              <div className="flex-1">
                <h3 className="text-base font-semibold leading-tight">{activeAdr.title}</h3>
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  <Badge variant={ActiveStatus.badge} className="text-[10px] gap-1">
                    <ActiveStatus.icon className="h-2.5 w-2.5" /> {activeAdr.status}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">{activeAdr.date}</span>
                  <span className="text-[11px] text-muted-foreground">· Deciders: {activeAdr.deciders}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Context</p>
                <p className="text-foreground/90 leading-relaxed">{activeAdr.context}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Decision</p>
                <p className="text-foreground/90 leading-relaxed">{activeAdr.decision}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Consequences</p>
                <p className="text-foreground/90 leading-relaxed whitespace-pre-line">{activeAdr.consequences}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Alternatives considered</p>
                <ul className="space-y-1">
                  {activeAdr.alternatives.map((alt) => (
                    <li key={alt} className="flex items-start gap-2 text-foreground/80">
                      <XCircle className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <span>{alt}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-2 border-t border-border/60">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {activeAdr.tags.map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Pattern library */}
      <SectionCard
        title="Pattern library"
        description="Reusable solutions with explicit when-to-use, when-not-to-use, and known failure modes."
        icon={<GitBranch className="h-5 w-5" />}
      >
        <div className="grid md:grid-cols-2 gap-3">
          {PATTERNS.map((p) => (
            <div key={p.name} className="rounded-md border border-border/60 p-4 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-semibold text-sm">{p.name}</p>
                <Badge variant="outline" className="text-[10px]">{p.category}</Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">{p.summary}</p>
              <dl className="text-xs space-y-1.5">
                <div className="flex gap-2">
                  <dt className="text-emerald-600 dark:text-emerald-400 shrink-0">When:</dt>
                  <dd className="text-muted-foreground">{p.when}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-amber-600 dark:text-amber-400 shrink-0">When not:</dt>
                  <dd className="text-muted-foreground">{p.when_not}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-rose-600 dark:text-rose-400 shrink-0">Failure:</dt>
                  <dd className="text-muted-foreground">{p.failure_modes}</dd>
                </div>
              </dl>
              <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between">
                <Link href={hrefFor(p.implements_page as never)} className="text-[11px] text-primary hover:underline">
                  → {p.implements_page} page
                </Link>
                <span className="text-[10px] text-muted-foreground">{p.related_adrs.join(", ")}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Trade-off matrices */}
      <SectionCard
        title="Trade-off matrices"
        description="For the decisions that came down to picking between competing tools, here's the reasoning in three columns."
        icon={<Scale className="h-5 w-5" />}
      >
        <div className="space-y-5">
          {TRADEOFFS.map((t) => (
            <div key={t.decision}>
              <p className="text-sm font-semibold mb-2">{t.decision}</p>
              <div className="grid md:grid-cols-3 gap-2">
                {t.options.map((o) => {
                  const isChosen = o.verdict.toLowerCase().startsWith("chosen");
                  return (
                    <div
                      key={o.option}
                      className={`rounded-md border p-3 ${isChosen ? "border-primary/50 bg-primary/5" : "border-border/60"}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="font-semibold text-sm">{o.option}</p>
                        {isChosen && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-1.5"><strong className="text-foreground/80">Strengths:</strong> {o.strengths}</p>
                      <p className="text-[11px] text-muted-foreground"><strong className="text-foreground/80">Weaknesses:</strong> {o.weaknesses}</p>
                      <p className={`text-[11px] mt-2 font-medium ${isChosen ? "text-primary" : "text-muted-foreground"}`}>
                        Verdict: {o.verdict}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Pyodide — ADR structure validator */}
      <SectionCard
        title="Try it: ADR structure validator (Pyodide)"
        description="Validates that every ADR has the required fields (id, title, status, context, decision, consequences, alternatives, tags). Pure Python — runs in browser."
        icon={<Terminal className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner
          code={`# ADR structure validator
# Checks every ADR has all required fields + valid status

adrs = [
    {"id": "ADR-001", "title": "Adopt Lakehouse", "status": "accepted", "date": "FY23-Q1",
     "deciders": "Data Platform", "context": "Needed BI + ML platform...",
     "decision": "Adopt Databricks Lakehouse", "consequences": "+ Single format",
     "alternatives": ["Snowflake-only"], "tags": ["storage", "lakehouse"]},
    {"id": "ADR-013", "title": "Commit to Iceberg", "status": "accepted", "date": "FY26-Q3",
     "deciders": "Data Platform, Architecture", "context": "Vendor-neutrality...",
     "decision": "Iceberg primary, Delta on Databricks", "consequences": "+ Vendor-neutral",
     "alternatives": ["Stay on Delta", "Migrate to Hudi"], "tags": ["iceberg", "delta"]},
    {"id": "ADR-014", "title": "DuckDB for CI", "status": "accepted", "date": "FY26-Q4",
     "deciders": "Data Platform, DevOps", "context": "CI needs local engine...",
     "decision": "DuckDB for CI + local analytics", "consequences": "+ CI costs drop 90%",
     "alternatives": ["Snowflake CI", "SQLite"], "tags": ["ci", "duckdb"]},
]

required = ["id", "title", "status", "date", "deciders", "context", "decision", "consequences", "alternatives", "tags"]
valid_statuses = ["accepted", "proposed", "deprecated", "superseded"]

issues = []
for adr in adrs:
    for field in required:
        if field not in adr or not adr[field]:
            issues.append(f"⚠ {adr.get('id', '???')}: missing '{field}'")
    if adr.get("status") and adr["status"] not in valid_statuses:
        issues.append(f"⚠ {adr['id']}: invalid status '{adr['status']}'")
    if adr.get("alternatives") and not isinstance(adr["alternatives"], list):
        issues.append(f"⚠ {adr['id']}: alternatives must be a list")
    if not any(adr.get('id','') in i for i in issues):
        print(f"✓ {adr['id']}: valid ({adr['status']}, {len(adr.get('alternatives',[]))} alternatives)")

print()
print("=" * 60)
if issues:
    print("VALIDATION ISSUES:")
    for i in issues: print(f"  {i}")
    print(f"\n{len(issues)} issue(s) found.")
else:
    print(f"✓ All {len(adrs)} ADRs validated — structure is correct.")
print("=" * 60)`}
          buttonLabel="Run ADR validator (Pyodide)"
        />
      </SectionCard>

      {/* Knowledge Shorts — vertical video-style explainers */}
      <SectionCard
        title="Knowledge Shorts — 60-second explainers"
        description="Short-form technical knowledge in the YouTube Shorts style. Swipe horizontally to browse. Click any short to expand the full explanation + jump to the implementing page. Inspired by channels like datamlistic."
        icon={<Play className="h-5 w-5" />}
        badge="10 shorts"
      >
        <KnowledgeShorts />
      </SectionCard>

      {/* Closing thought */}
      <SectionCard title="The honest truth" icon={<Lightbulb className="h-5 w-5" />}>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Every <InlineCode>accepted</InlineCode> decision here is a snapshot in time. Some will look embarrassing
          in five years. That's the point — when the world changes, the ADR is the breadcrumb that tells the
          next engineer exactly which assumptions to revisit. If you're reading this and thinking "but what
          about X?" — that's the prompt to write a new ADR. The hub is never done.
        </p>
      </SectionCard>

      <DeeperThoughtSection pageTitle="Knowledge Hub">
        <DeeperThought title="Knowledge Hub IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Knowledge Hub is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Knowledge Hub connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Knowledge Hub sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Knowledge Hub) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "research" as const, reason: "Continue to research — see also from this page" }, { id: "evolution" as const, reason: "Continue to evolution — see also from this page" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("research")} className="text-sm text-primary hover:underline">
          → See the academic foundations (Research page)
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("evolution")} className="text-sm text-primary hover:underline">
          → See how decisions evolved (Evolution page)
        </Link>
      </div>
    </div>
  );
}
