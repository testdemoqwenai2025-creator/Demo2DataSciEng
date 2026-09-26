"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ELEGANT_CODE_CARDS } from "./_elegant_code_cards";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, X } from "lucide-react";

/**
 * TalentSearch — a search box on /resources that lets readers type a talent
 * or skill (e.g., "sees population structure") and get back all the
 * elegant-code cards that reward that talent.
 *
 * Searches across:
 *   - outcome.skill (e.g., "Computational biologist")
 *   - outcome.talent (e.g., "sees population structure in matrices")
 *   - outcome.science (e.g., "Genomics")
 *   - outcome.sector (e.g., "1000-Genomes Project")
 *   - card title / insight
 *
 * Returns matching cards with deep-links to /elegant-code#card-N.
 */

interface SearchResult {
  cardIndex: number;
  cardTitle: string;
  cardSubtitle: string;
  cardAccent: string;
  matchedOutcomes: Array<{
    science: string;
    sector: string;
    skill: string;
    talent: string;
  }>;
}

export function TalentSearch() {
  const [query, setQuery] = useState("");

  // Build the search index once.
  const searchIndex = useMemo(() => {
    const index: SearchResult[] = [];
    ELEGANT_CODE_CARDS.forEach((card, idx) => {
      if (!card.outcomes) return;
      const matches: SearchResult["matchedOutcomes"] = [];
      for (const o of card.outcomes) {
        matches.push({
          science: o.science,
          sector: o.sector,
          skill: o.skill,
          talent: o.talent,
        });
      }
      index.push({
        cardIndex: idx,
        cardTitle: card.title,
        cardSubtitle: card.subtitle,
        cardAccent: card.accent,
        matchedOutcomes: matches,
      });
    });
    return index;
  }, []);

  // Filter cards by query — match if any field contains the query (case-insensitive).
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return searchIndex
      .map((card) => {
        // Check card title/subtitle
        const titleMatch = card.cardTitle.toLowerCase().includes(q);
        const subtitleMatch = card.cardSubtitle.toLowerCase().includes(q);
        // Check each outcome's skill/talent/science/sector
        const matchingOutcomes = card.matchedOutcomes.filter((o) =>
          o.skill.toLowerCase().includes(q) ||
          o.talent.toLowerCase().includes(q) ||
          o.science.toLowerCase().includes(q) ||
          o.sector.toLowerCase().includes(q)
        );
        if (titleMatch || subtitleMatch || matchingOutcomes.length > 0) {
          return {
            ...card,
            matchedOutcomes: matchingOutcomes.length > 0 ? matchingOutcomes : card.matchedOutcomes,
            // Highlight whether the match was on card title vs outcome
            matchType: titleMatch || subtitleMatch ? "card" : "outcome",
          };
        }
        return null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }, [query, searchIndex]);

  // Get all unique talents/skills for suggestion chips.
  const allTalents = useMemo(() => {
    const set = new Set<string>();
    for (const card of searchIndex) {
      for (const o of card.matchedOutcomes) {
        set.add(o.talent);
        set.add(o.skill);
      }
    }
    return Array.from(set).sort();
  }, [searchIndex]);

  // Filter suggestion chips by query (for autocomplete).
  const suggestions = useMemo(() => {
    if (!query.trim()) return allTalents.slice(0, 8);
    const q = query.toLowerCase().trim();
    return allTalents.filter((t) => t.toLowerCase().includes(q)).slice(0, 8);
  }, [query, allTalents]);

  return (
    <div className="space-y-4">
      {/* Search box */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a talent, skill, science, or sector — e.g., 'sees population structure', 'Maritime', 'Bayesian', 'port captain'"
          className="w-full pl-10 pr-10 py-2.5 text-sm rounded-md border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Suggestion chips */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider self-center mr-1">
            Try:
          </span>
          {suggestions.map((t) => (
            <button
              key={t}
              onClick={() => setQuery(t)}
              className="text-[10px] px-2 py-1 rounded-md border border-border/60 bg-muted/30 hover:border-primary/40 hover:bg-primary/5 transition-colors text-foreground/80"
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {query.trim() && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            {results.length === 0
              ? `No matches for "${query}". Try a different talent or skill — or use the Ask-me-anything AI expert below.`
              : `${results.length} card${results.length === 1 ? "" : "s"} match "${query}":`}
          </p>
          {results.length === 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-amber-700 dark:text-amber-300">No in-platform match.</p>
              <p className="mt-1">
                The talent or skill you typed doesn't appear in the platform's 60 outcome tiles.
                Try one of the suggestion chips above, or use the <strong>Ask me anything</strong> AI expert
                (bottom-right button) to ask external AI platforms (Gemini, Grok, Qwenai, MiniMax).
              </p>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {results.map((r) => (
              <Link
                key={r.cardIndex}
                href={`${hrefFor("elegant-code")}#card-${r.cardIndex}`}
                className="block rounded-md border border-border/60 bg-muted/20 p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: r.cardAccent }}>
                      {r.cardTitle.split(" — ")[0]}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5 line-clamp-1">
                      {r.cardSubtitle}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[9px] shrink-0">
                    card {r.cardIndex + 1}
                  </Badge>
                </div>
                {r.matchedOutcomes.length > 0 && (
                  <div className="space-y-1.5 mt-2 pt-2 border-t border-border/40">
                    {r.matchedOutcomes.slice(0, 3).map((o, i) => (
                      <div key={i} className="text-[10px] space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-foreground/80">{o.science}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">{o.sector}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[9px] px-1 py-0">{o.skill}</Badge>
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 italic">{o.talent}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {!query.trim() && (
        <p className="text-xs text-muted-foreground italic">
          The platform has 60 outcome tiles across 20 elegant-code cards — each with a skill (what you'd be called) and a talent (what you'd be good at). Type any phrase to find which equations reward your mind.
        </p>
      )}
    </div>
  );
}
