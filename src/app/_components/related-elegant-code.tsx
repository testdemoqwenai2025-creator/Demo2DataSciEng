"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight } from "lucide-react";
import { hrefFor, type PageId } from "../_lib/router";
import {
  ELEGANT_CODE_MAP,
  recommendedCards,
  cardsOnHostPage,
} from "../_lib/elegant-code-map";

/**
 * RelatedElegantCode — reusable cross-card navigation component.
 * Drop into any host page to show "Related elegant-code" with links to the
 * mathematical cousins of the cards propagated on that page.
 *
 * This component enables the card → card flow: a reader on (say)
 * transformer-deep-dive (Attention, idx 1) sees that the cousin cards are
 * SVD, Gradient Descent, Bayes — and can jump to the /elegant-code page to
 * view them in full.
 *
 * Usage:
 *   <RelatedElegantCode hostPage="transformer-deep-dive" />
 *
 * Or, for use on /elegant-code itself (or /connections), specify the source
 * card index directly:
 *   <RelatedElegantCode sourceCard={1} />
 */
interface RelatedElegantCodeProps {
  /** The host page this footer is on (used to find which cards are propagated here). */
  hostPage?: PageId;
  /** The source card index — used when the footer is on /elegant-code itself. */
  sourceCard?: number;
  /** Optional override: render specific cards (e.g. all cards on /connections). */
  cardIndices?: number[];
}

export function RelatedElegantCode({
  hostPage,
  sourceCard,
  cardIndices,
}: RelatedElegantCodeProps) {
  // Determine which card indices to base recommendations on.
  let baseCards: number[];
  if (cardIndices) {
    baseCards = cardIndices;
  } else if (sourceCard !== undefined) {
    baseCards = [sourceCard];
  } else if (hostPage) {
    baseCards = cardsOnHostPage(hostPage).map((c) => c.cardIndex);
  } else {
    baseCards = [];
  }

  if (baseCards.length === 0) return null;

  // Collect recommended cousins, dedupe, and exclude the base cards themselves.
  const recommended = new Set<number>();
  for (const ci of baseCards) {
    for (const r of recommendedCards(ci)) {
      if (!baseCards.includes(r)) recommended.add(r);
    }
  }

  // Stable order: sort by recommendation frequency (most recommended first),
  // then by card index.
  const recArray = Array.from(recommended);
  const freq: Record<number, number> = {};
  for (const ci of baseCards) {
    for (const r of recommendedCards(ci)) {
      if (!baseCards.includes(r)) freq[r] = (freq[r] ?? 0) + 1;
    }
  }
  recArray.sort((a, b) => (freq[b] ?? 0) - (freq[a] ?? 0) || a - b);

  if (recArray.length === 0) return null;

  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
      <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" /> Related elegant-code — mathematical cousins
      </p>
      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
        {baseCards.length === 1
          ? "Based on the card propagated above, these equations share sciences or a mathematical family with it — surf the graph of 'X IS Y' connections."
          : `Based on the ${baseCards.length} card${baseCards.length > 1 ? "s" : ""} propagated on this page, these are the mathematical cousins worth visiting next.`}
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {recArray.slice(0, 6).map((ci) => {
          const c = ELEGANT_CODE_MAP[ci];
          return (
            <Link
              key={ci}
              href={`${hrefFor("elegant-code")}#card-${ci}`}
              className="group block rounded-md border border-border/60 bg-background p-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground/90">{c.name}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="font-mono text-[10px] text-muted-foreground mb-1 truncate">
                {c.equation}
              </div>
              <div className="text-[10px] italic text-primary/80 leading-tight">
                {c.insightShort}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {c.sciences.join(" ↔ ")}
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Badge variant="outline" className="text-[10px] gap-1">
          <Sparkles className="h-3 w-3" />
          {recArray.length} cousin{recArray.length === 1 ? "" : "s"}
        </Badge>
        <Link
          href={hrefFor("connections")}
          className="text-xs text-primary hover:underline"
        >
          → See the full card → host map
        </Link>
      </div>
    </div>
  );
}
