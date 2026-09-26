"use client";

import { useState } from "react";
import Link from "next/link";
import { SectionCard, PageHeader } from "../_components/section-card";
import { LiveResearchDrawer } from "../_components/live-research-drawer";
import { DeeperThoughtsIndex } from "../_components/deeper-thoughts-index";
import { PAPERS, type Paper } from "../_data/synthetic";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  ExternalLink,
  BookOpen,
  Network,
  Quote,
  ArrowRight,
  Filter,
  Sparkles,
  TrendingUp,
} from "lucide-react";

const TOPIC_LABELS: Record<Paper["topic"], string> = {
  storage: "Storage",
  compute: "Compute",
  modelling: "Modelling",
  governance: "Governance",
  ml: "ML",
  architecture: "Architecture",
  streaming: "Streaming",
  devops: "DevOps",
};

const TOPIC_COLORS: Record<Paper["topic"], string> = {
  storage: "var(--chart-1)",
  compute: "var(--chart-2)",
  modelling: "var(--chart-3)",
  governance: "var(--chart-4)",
  ml: "var(--chart-5)",
  architecture: "var(--chart-1)",
  streaming: "var(--chart-3)",
  devops: "var(--chart-2)",
};

export function ResearchPage() {
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [selectedPaper, setSelectedPaper] = useState<Paper>(PAPERS[0]);

  const filteredPapers =
    topicFilter === "all" ? PAPERS : PAPERS.filter((p) => p.topic === topicFilter);

  const allTopics = Array.from(new Set(PAPERS.map((p) => p.topic)));

  // Build citation graph node positions (simple circular layout)
  const nodeCount = PAPERS.length;
  const paperPositions: Record<string, { x: number; y: number; r: number }> = {};
  PAPERS.forEach((p, i) => {
    const angle = (i / nodeCount) * 2 * Math.PI - Math.PI / 2;
    paperPositions[p.id] = {
      x: 250 + 200 * Math.cos(angle),
      y: 200 + 180 * Math.sin(angle),
      r: 8,
    };
  });

  // Citation edges
  const edges: Array<{ from: string; to: string }> = [];
  PAPERS.forEach((p) => {
    p.cites?.forEach((c) => {
      if (paperPositions[c]) edges.push({ from: p.id, to: c });
    });
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Knowledge Loop · why"
        title="Research Papers — academic foundations"
        description="Every major pattern in this platform has a paper (or several) behind it. This page connects production components back to their academic origins. The citation graph shows how ideas flow from theory to running code. Click any paper to read the abstract, key insight, and which part of the platform implements it."
        right={
          <Badge variant="outline" className="gap-1.5">
            <GraduationCap className="h-3 w-3" /> {PAPERS.length} papers · {edges.length} citations
          </Badge>
        }
      />

      {/* Citation graph */}
      <SectionCard
        title="Citation graph"
        description="Each node is a paper; arrows are 'cites'. Hover or click a node to load its abstract below."
        icon={<Network className="h-5 w-5" />}
      >
        <div className="grid lg:grid-cols-[1fr_1fr] gap-4">
          <div className="relative">
            <svg viewBox="0 0 500 400" className="w-full h-auto border border-border/40 rounded-md bg-muted/10">
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="8"
                  refX="6"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 6 3, 0 6" fill="oklch(0.5 0 0 / 0.6)" />
                </marker>
              </defs>
              {/* Edges */}
              {edges.map((e, i) => {
                const from = paperPositions[e.from];
                const to = paperPositions[e.to];
                if (!from || !to) return null;
                // shorten line so arrow doesn't overlap node
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const ux = dx / dist;
                const uy = dy / dist;
                const x1 = from.x + ux * (from.r + 2);
                const y1 = from.y + uy * (from.r + 2);
                const x2 = to.x - ux * (to.r + 4);
                const y2 = to.y - uy * (to.r + 4);
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="oklch(0.5 0 0 / 0.35)"
                    strokeWidth={1.2}
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}
              {/* Nodes */}
              {PAPERS.map((p) => {
                const pos = paperPositions[p.id];
                const isSelected = p.id === selectedPaper.id;
                return (
                  <g
                    key={p.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    className="cursor-pointer"
                    onClick={() => setSelectedPaper(p)}
                  >
                    <circle
                      r={pos.r + (isSelected ? 4 : 0)}
                      fill={isSelected ? "var(--primary)" : TOPIC_COLORS[p.topic]}
                      stroke={isSelected ? "var(--primary-foreground)" : "none"}
                      strokeWidth={1.5}
                      opacity={isSelected ? 1 : 0.85}
                    />
                    {isSelected && (
                      <circle
                        r={pos.r + 8}
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth={1.5}
                        opacity={0.5}
                      >
                        <animate attributeName="r" from={pos.r + 4} to={pos.r + 14} dur="1.2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from={0.6} to={0} dur="1.2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <title>{p.title} ({p.year})</title>
                  </g>
                );
              })}
              {/* Selected paper label */}
              {selectedPaper && (
                <text
                  x={paperPositions[selectedPaper.id].x}
                  y={paperPositions[selectedPaper.id].y + 25}
                  textAnchor="middle"
                  fill="var(--foreground)"
                  fontSize="9"
                  fontWeight="600"
                >
                  {selectedPaper.id.replace("p-", "")}
                </text>
              )}
            </svg>
            {/* Legend */}
            <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
              {allTopics.map((t) => (
                <span key={t} className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: TOPIC_COLORS[t as Paper["topic"]] }} />
                  {TOPIC_LABELS[t as Paper["topic"]]}
                </span>
              ))}
            </div>
          </div>

          {/* Selected paper detail */}
          <div className="rounded-md border border-border/60 p-4 bg-muted/10">
            <div className="flex items-start gap-2 mb-2">
              <Badge variant="outline" className="text-[10px]">{selectedPaper.year}</Badge>
              <Badge
                variant="outline"
                className="text-[10px] gap-1"
                style={{ borderColor: TOPIC_COLORS[selectedPaper.topic] }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: TOPIC_COLORS[selectedPaper.topic] }} />
                {TOPIC_LABELS[selectedPaper.topic]}
              </Badge>
              <span className="text-[10px] text-muted-foreground ml-auto font-mono">{selectedPaper.id}</span>
            </div>
            <h3 className="text-base font-semibold leading-tight mb-1.5">{selectedPaper.title}</h3>
            <p className="text-xs text-muted-foreground mb-3">
              <span className="font-medium">{selectedPaper.authors}</span> · {selectedPaper.venue}
            </p>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Abstract</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{selectedPaper.abstract}</p>
              </div>
              <div className="rounded-md border border-primary/40 bg-primary/5 p-2.5">
                <p className="text-[10px] uppercase tracking-wider text-primary mb-1 flex items-center gap-1">
                  <Quote className="h-3 w-3" /> Key insight
                </p>
                <p className="text-xs text-foreground/90 leading-relaxed">{selectedPaper.key_insight}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Implemented in</p>
                <p className="text-xs text-foreground/80">{selectedPaper.implemented_in}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <a href={selectedPaper.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" /> Read the paper
                  </a>
                </Button>
                <LiveResearchDrawer
                  topic={`${selectedPaper.title.split(":")[0]} ${TOPIC_LABELS[selectedPaper.topic].toLowerCase()}`}
                  trigger={
                    <Button size="sm" variant="default" className="gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> View live research
                    </Button>
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Filter + paper cards */}
      <SectionCard
        title="Paper library"
        description="Filter by topic. Each card shows the paper, the key insight, and where the platform implements it."
        icon={<BookOpen className="h-5 w-5" />}
      >
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setTopicFilter("all")}
            className={`text-[11px] px-2 py-1 rounded border transition-colors ${topicFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border/60 hover:bg-accent"}`}
          >
            All ({PAPERS.length})
          </button>
          {allTopics.map((t) => {
            const count = PAPERS.filter((p) => p.topic === t).length;
            return (
              <button
                key={t}
                onClick={() => setTopicFilter(t)}
                className={`text-[11px] px-2 py-1 rounded border transition-colors inline-flex items-center gap-1.5 ${topicFilter === t ? "bg-primary text-primary-foreground border-primary" : "border-border/60 hover:bg-accent"}`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: TOPIC_COLORS[t as Paper["topic"]] }} />
                {TOPIC_LABELS[t as Paper["topic"]]} ({count})
              </button>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {filteredPapers.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPaper(p)}
              className={`text-left rounded-md border p-3 transition-all hover:shadow-sm ${p.id === selectedPaper.id ? "border-primary/60 bg-primary/5" : "border-border/60 hover:border-primary/40"}`}
            >
              <div className="flex items-start gap-2 mb-1.5">
                <span className="h-2 w-2 rounded-full mt-1.5 shrink-0" style={{ background: TOPIC_COLORS[p.topic] }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">{p.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {p.authors} · {p.venue} · {p.year}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed mb-2 line-clamp-2">{p.key_insight}</p>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-primary">→ {p.implemented_in}</span>
                {p.cites && p.cites.length > 0 && (
                  <span className="text-muted-foreground">{p.cites.length} cites</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Knowledge loop footer */}
      <SectionCard title="Closing the knowledge loop" icon={<ArrowRight className="h-5 w-5" />}>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Research → Knowledge → Architecture → Dashboard → back to Research. The four pages of the Knowledge
          Loop form a closed circuit: papers inspire patterns, patterns become architecture, architecture is
          observed in the live dashboard, and observations drive new research (new papers to read, new ADRs to
          write, new patterns to try). The platform is never finished — it's an ongoing conversation between
          theory and production.
        </p>
      </SectionCard>

      {/* Deeper thoughts index — connected to the research section */}
      <SectionCard
        title="Deeper thoughts index — every argument on the platform, filterable by ADR"
        description="Every page on the platform should have 5+ 'My deeper thought' sections — original arguments connected to the ADRs in this research section. This index collects them all. Filter by ADR to see all thoughts connected to a specific decision record. The research page IS the thinking hub — where ADRs live + the thoughts that reference them."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="thinking hub"
      >
        <DeeperThoughtsIndex />
      </SectionCard>

      {/* Future projections — connects research (past: ADRs) to future (projections) */}
      <SectionCard
        title="Future projections — where this platform goes in 10-20 years"
        description="The research section documents the platform's PAST decisions (ADRs). The /future page projects the platform's FUTURE evolution — what replaces Snowflake, Kafka, PyTorch? The math (SVD, Attention, Poisson, FFT, Bayes, Kalman) stays the same. The tools are the amplifier; the math is the signal. The platform is designed for technology turnover. Visit /future for 10 technology projections + 6 deeper thoughts about the platform's own evolution."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="future hub"
      >
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            The research page is now the platform's <strong className="text-foreground/80">thinking hub</strong> — it connects:
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li><strong className="text-foreground/80">Past</strong>: ADRs (Architecture Decision Records) — why each decision was made</li>
            <li><strong className="text-foreground/80">Present</strong>: Deeper thoughts — original arguments on every page, connected to ADRs</li>
            <li><strong className="text-foreground/80">Future</strong>: Projections — what replaces each tool, while the math stays</li>
          </ul>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-semibold text-primary mb-1">Timeline: 1800-2050</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Beltrami invented SVD in 1873. Shannon defined entropy in 1948. Kalman published his filter in 1960.
              NumPy was created in 2005. PyTorch in 2016. In 2035, NumPy may be replaced by WebGPU-native arrays.
              But SVD will still decompose matrices. Attention will still measure correlation. The math survives.
              The /future page has a visual timeline showing this — equations vs tools, 1800-2050.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={hrefFor("future")} className="text-sm text-primary hover:underline font-semibold">
              → Visit /future — technology evolution timeline + projections
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link href={hrefFor("elegant-code")} className="text-sm text-primary hover:underline">
              → Elegant Code (the 20 equations that survive)
            </Link>
          </div>
        </div>
      </SectionCard>

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">
          → Patterns & decisions (Knowledge Hub)
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("evolution")} className="text-sm text-primary hover:underline">
          → How ideas evolved (Evolution)
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("home")} className="text-sm text-primary hover:underline">
          → Back to overview
        </Link>
      </div>
    </div>
  );
}
