"use client";

import { useState } from "react";
import Link from "next/link";
import { SectionCard, PageHeader } from "../_components/section-card";
import { InlineCode } from "../_components/code-block";
import { ADRS, PATTERNS, TRADEOFFS } from "../_data/synthetic";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LazyList } from "../_components/lazy-list";
import { KnowledgeShorts } from "../_components/knowledge-shorts";
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
