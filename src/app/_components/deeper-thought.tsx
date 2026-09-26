"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { TrendingUp, BookOpen, ArrowRight } from "lucide-react";
import { hrefFor } from "../_lib/router";

/**
 * DeeperThought — a reusable section component for "My deeper thought"
 * paragraphs. Each page on the platform should have AT LEAST 5 of these
 * sections — they're what make the platform a "thinking partner" instead
 * of a reference manual.
 *
 * Each DeeperThought has:
 *   - A bold, opinionated heading (not a textbook title)
 *   - A 3-5 sentence paragraph with original insight (not summary)
 *   - An optional "connected to research" link to /research or an ADR
 *
 * Usage:
 *   <DeeperThought
 *     title="The cell IS the original distributed system"
 *     connectedTo="ADR-041 (systems biology adoption)"
 *   >
 *     <p>FBA is LP for resource allocation — the SAME math Amazon uses...</p>
 *   </DeeperThought>
 */

interface DeeperThoughtProps {
  /** Bold, opinionated heading (e.g., "The cell IS the original distributed system") */
  title: string;
  /** Optional badge showing which research/ADR this thought connects to */
  connectedTo?: string;
  /** Optional link to the research page (defaults to /research) */
  researchHref?: string;
  /** The thought content — should be 3-5 sentences of original insight */
  children: ReactNode;
}

export function DeeperThought({ title, connectedTo, researchHref, children }: DeeperThoughtProps) {
  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-2">
      <div className="flex items-start gap-2">
        <TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground/90 leading-tight">{title}</p>
          {connectedTo && (
            <div className="flex items-center gap-1.5 mt-1">
              <BookOpen className="h-3 w-3 text-muted-foreground" />
              <Link
                href={researchHref ?? hrefFor("research")}
                className="text-[10px] text-muted-foreground hover:text-primary hover:underline"
              >
                Connected to: {connectedTo} →
              </Link>
            </div>
          )}
        </div>
      </div>
      <div className="text-xs text-muted-foreground leading-relaxed space-y-2 pl-6">
        {children}
      </div>
    </div>
  );
}

/**
 * DeeperThoughtSection — a wrapper that groups multiple DeeperThought items
 * under a section heading. Use this on every page to add 5+ thoughts.
 *
 * Usage:
 *   <DeeperThoughtSection pageTitle="Computational Biology">
 *     <DeeperThought title="The cell IS the original distributed system" ...>
 *       <p>...</p>
 *     </DeeperThought>
 *     <DeeperThought title="FBA IS supply chain optimisation" ...>
 *       <p>...</p>
 *     </DeeperThought>
 *     // ... 3+ more
 *   </DeeperThoughtSection>
 */
export function DeeperThoughtSection({
  pageTitle,
  children,
}: {
  pageTitle: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-base font-bold text-foreground/90">
          My deeper thoughts — {pageTitle}
        </h2>
      </div>
      <p className="text-xs text-muted-foreground italic leading-relaxed">
        These are not summaries. They are arguments — the kind of connections a reader with
        serious grey matter would make after living with the material for years. Each thought
        connects to the platform's research section (ADRs, papers, decision records) so it's
        traceable, not just opinionated.
      </p>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}
