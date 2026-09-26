"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ELEGANT_CODE_CARDS } from "./_elegant_code_cards";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain, Sparkles, X, Search, ExternalLink, MessageCircle, ChevronRight, Loader2,
} from "lucide-react";

/**
 * AskMeAnything — a floating "Ask me anything" AI expert widget.
 *
 * Click the floating button (bottom-right) to open a modal where readers
 * can ask any question. The widget:
 *   1. Searches the platform's content first (20 elegant-code cards, 60
 *      outcome tiles, talent/skill/science/sector fields).
 *   2. Returns matching cards with deep-links to /elegant-code#card-N
 *      or /living-* pages.
 *   3. If no in-platform match, or if the user wants an external second
 *      opinion, offers one-click deep-links to external AI platforms
 *      (Gemini, Grok, Qwenai, MiniMax, ChatGPT, Claude, Perplexity)
 *      with the question pre-filled as a URL query parameter.
 *
 * The widget is fully client-side — no backend required. It works on
 * static GitHub Pages. The "AI" is a smart search engine over the
 * platform's existing content + curated external AI platform links.
 *
 * Why this approach:
 *   - The platform is a static site (no Node backend on GitHub Pages).
 *   - Calling LLM APIs from the browser requires API keys in the client
 *     (security risk + the LLM skill explicitly says "backend only").
 *   - The user mentioned: "if not reach out the web ai platform" — so
 *     the external fallback uses URL parameters to open the user's
 *     preferred AI platform with the question pre-filled, in a new tab.
 */

interface SearchResult {
  cardIndex: number;
  cardTitle: string;
  cardSubtitle: string;
  cardAccent: string;
  cardEquation: string;
  matchedFields: string[];
  liveDemoUrl?: string;
}

// External AI platforms that accept a question via URL parameter.
// Each entry: { name, url (with {q} placeholder), description, accent color }
const EXTERNAL_AI_PLATFORMS: Array<{
  name: string;
  url: string; // {q} is replaced with the URL-encoded question
  description: string;
  accent: string;
}> = [
  {
    name: "Gemini",
    url: "https://gemini.google.com/app?q={q}",
    description: "Google's multimodal AI. Good for general Q&A, code, math, and image understanding.",
    accent: "#4285F4",
  },
  {
    name: "Grok",
    url: "https://grok.com/?q={q}",
    description: "xAI's LLM with real-time web access. Good for current events and X/Twitter data.",
    accent: "#1DA1F2",
  },
  {
    name: "Qwen AI",
    url: "https://chat.qwen.ai/?q={q}",
    description: "Alibaba's Qwen — strong on math, multilingual, and code.",
    accent: "#615CED",
  },
  {
    name: "MiniMax",
    url: "https://www.minimaxi.com/chat?q={q}",
    description: "MiniMax — strong on long-context, voice, and creative writing.",
    accent: "#FF6B35",
  },
  {
    name: "ChatGPT",
    url: "https://chat.openai.com/?q={q}",
    description: "OpenAI's GPT-4. Industry standard for general Q&A and reasoning.",
    accent: "#10A37F",
  },
  {
    name: "Claude",
    url: "https://claude.ai/new?q={q}",
    description: "Anthropic's Claude — strong on long-context analysis and code review.",
    accent: "#D97757",
  },
  {
    name: "Perplexity",
    url: "https://www.perplexity.ai/?q={q}",
    description: "Perplexity AI — web-search-augmented LLM. Good for research questions with citations.",
    accent: "#20808D",
  },
];

// Build the search index from ELEGANT_CODE_CARDS.
function buildSearchIndex(): SearchResult[] {
  const index: SearchResult[] = [];
  const liveMap: Record<number, string> = {
    0: "/living-svd",
    1: "/living-attention",
    2: "/living-poisson",
    3: "/living-fft",
    9: "/living-entropy",
    10: "/living-black-scholes",
    11: "/living-haversine",
    16: "/living-kalman",
    17: "/living-monte-carlo",
    18: "/living-gbm",
  };
  ELEGANT_CODE_CARDS.forEach((card, idx) => {
    index.push({
      cardIndex: idx,
      cardTitle: card.title,
      cardSubtitle: card.subtitle,
      cardAccent: card.accent,
      cardEquation: card.subtitle.split(" — ")[0] ?? "",
      matchedFields: [],
      liveDemoUrl: liveMap[idx],
    });
  });
  return index;
}

// Score a card against the query — higher = better match.
function scoreCard(card: SearchResult, query: string): { score: number; matchedFields: string[] } {
  if (!query.trim()) return { score: 0, matchedFields: [] };
  const q = query.toLowerCase().trim();
  const tokens = q.split(/\s+/).filter((t) => t.length > 1);
  if (tokens.length === 0) return { score: 0, matchedFields: [] };

  const fullCard = ELEGANT_CODE_CARDS[card.cardIndex];
  const matchedFields: string[] = [];
  let score = 0;

  // Title match (high weight)
  if (card.cardTitle.toLowerCase().includes(q)) {
    score += 10;
    matchedFields.push("title");
  } else {
    // Token match in title
    const titleTokens = tokens.filter((t) => card.cardTitle.toLowerCase().includes(t));
    if (titleTokens.length > 0) {
      score += titleTokens.length * 2;
      matchedFields.push("title");
    }
  }

  // Subtitle match
  if (card.cardSubtitle.toLowerCase().includes(q)) {
    score += 5;
    matchedFields.push("equation");
  }

  // Brief match
  if (fullCard.brief.dataset.toLowerCase().includes(q) || fullCard.brief.why.toLowerCase().includes(q)) {
    score += 4;
    matchedFields.push("brief");
  }

  // Insight match (the "X IS Y" insight)
  if (fullCard.insight.toLowerCase().includes(q)) {
    score += 6;
    matchedFields.push("insight");
  }

  // Outcome match (skill, talent, science, sector)
  if (fullCard.outcomes) {
    for (const o of fullCard.outcomes) {
      const skillMatch = o.skill.toLowerCase().includes(q);
      const talentMatch = o.talent.toLowerCase().includes(q);
      const scienceMatch = o.science.toLowerCase().includes(q);
      const sectorMatch = o.sector.toLowerCase().includes(q);
      const descMatch = o.description.toLowerCase().includes(q);
      if (skillMatch) { score += 3; matchedFields.push("skill"); }
      if (talentMatch) { score += 3; matchedFields.push("talent"); }
      if (scienceMatch) { score += 2; matchedFields.push("science"); }
      if (sectorMatch) { score += 2; matchedFields.push("sector"); }
      if (descMatch) { score += 1; matchedFields.push("outcome description"); }
      // Token-level matches
      const outcomeText = `${o.skill} ${o.talent} ${o.science} ${o.sector} ${o.description}`.toLowerCase();
      const outcomeTokens = tokens.filter((t) => outcomeText.includes(t));
      if (outcomeTokens.length > 0) {
        score += outcomeTokens.length * 0.5;
        if (!matchedFields.includes("outcome")) matchedFields.push("outcome");
      }
    }
  }

  // Token-level matches across the whole card (for multi-word queries)
  const fullText = `${card.cardTitle} ${card.cardSubtitle} ${fullCard.brief.dataset} ${fullCard.brief.why} ${fullCard.insight}`.toLowerCase();
  if (fullCard.outcomes) {
    for (const o of fullCard.outcomes) {
      fullText.concat(` ${o.skill} ${o.talent} ${o.science} ${o.sector} ${o.description}`);
    }
  }
  const fullTokens = tokens.filter((t) => fullText.includes(t));
  if (fullTokens.length === tokens.length && score === 0) {
    score += 1; // weak match on tokens only
  }

  return { score, matchedFields: Array.from(new Set(matchedFields)) };
}

export function AskMeAnything() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Build the search index once (not ref-based to satisfy react-hooks rules).
  const searchIndex = useMemo(() => buildSearchIndex(), []);

  // Compute results (debounced).
  const results: Array<SearchResult & { score: number; matchedFields: string[] }> = [];
  if (query.trim().length > 1) {
    for (const card of searchIndex) {
      const { score, matchedFields } = scoreCard(card, query);
      if (score > 0) {
        results.push({ ...card, score, matchedFields });
      }
    }
    results.sort((a, b) => b.score - a.score);
  }
  const topResults = results.slice(0, 5);
  const hasInPlatformMatch = topResults.length > 0;

  // Build external AI platform URLs with the query pre-filled.
  const externalUrls = useMemo(() => EXTERNAL_AI_PLATFORMS.map((p) => ({
    ...p,
    url: p.url.replace("{q}", encodeURIComponent(query)),
  })), [query]);

  // Reset isSearching after a short delay (for UX feedback).
  useEffect(() => {
    if (isSearching) {
      const t = setTimeout(() => setIsSearching(false), 300);
      return () => clearTimeout(t);
    }
  }, [isSearching, query]);

  return (
    <>
      {/* Floating button (bottom-right) */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all"
        aria-label="Ask me anything — AI expert"
      >
        <Brain className="h-5 w-5" />
        <span className="text-sm font-semibold">Ask me anything</span>
        <Sparkles className="h-4 w-4" />
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start md:items-center justify-center p-2 md:p-6 overflow-y-auto"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-3xl my-4 rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="border-b border-border/40 bg-muted/30 px-4 md:px-6 py-3 flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/15 shrink-0">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold leading-tight">Ask me anything</p>
                  <p className="text-xs text-muted-foreground">
                    Smart AI expert — searches the platform's 20 cards + 60 outcome tiles first,
                    then offers one-click deep-links to external AI platforms (Gemini, Grok, Qwen, MiniMax, ChatGPT, Claude, Perplexity).
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-full bg-background/90 border border-border hover:bg-accent transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 md:p-6 max-h-[80vh] overflow-y-auto space-y-5">
                {/* Search box */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setIsSearching(true);
                    }}
                    autoFocus
                    placeholder="Ask anything — e.g., 'what equation models both protein folding and language?' or 'which sector rewards Bayesian thinking?'"
                    className="w-full pl-10 pr-10 py-3 text-sm rounded-md border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {/* Quick suggestions */}
                {!query.trim() && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Try one of these:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "which equations bridge maritime and fintech",
                        "what does SVD do on DNA",
                        "which sector rewards sees population structure",
                        "how does Attention find protein contacts",
                        "Bayesian belief update",
                        "Lloyd's clustering",
                      ].map((s) => (
                        <button
                          key={s}
                          onClick={() => { setQuery(s); setIsSearching(true); }}
                          className="text-[11px] px-2 py-1 rounded-md border border-border/60 bg-muted/30 hover:border-primary/40 hover:bg-primary/5 transition-colors text-foreground/80"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* In-platform results */}
                {query.trim().length > 1 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary" />
                      {hasInPlatformMatch
                        ? `In-platform matches (${topResults.length}${results.length > 5 ? ` of ${results.length}` : ""})`
                        : "No in-platform matches"}
                    </p>
                    {hasInPlatformMatch ? (
                      <div className="space-y-2">
                        {topResults.map((r) => (
                          <Link
                            key={r.cardIndex}
                            href={`${hrefFor("elegant-code")}#card-${r.cardIndex}`}
                            className="block rounded-md border border-border/60 bg-muted/20 p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold" style={{ color: r.cardAccent }}>
                                  {r.cardTitle.split(" — ")[0]}
                                  <span className="text-muted-foreground font-normal"> · {r.cardEquation}</span>
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{r.cardSubtitle}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <Badge variant="outline" className="text-[9px]">
                                  score {r.score.toFixed(0)}
                                </Badge>
                                {r.liveDemoUrl && (
                                  <Link
                                    href={r.liveDemoUrl}
                                    className="text-[9px] text-primary hover:underline"
                                  >
                                    live demo →
                                  </Link>
                                )}
                              </div>
                            </div>
                            {r.matchedFields.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-border/40 flex flex-wrap gap-1">
                                <span className="text-[9px] text-muted-foreground uppercase">matched:</span>
                                {r.matchedFields.map((f) => (
                                  <Badge key={f} variant="secondary" className="text-[9px] px-1 py-0">{f}</Badge>
                                ))}
                              </div>
                            )}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-muted-foreground">
                        <p className="font-semibold text-amber-700 dark:text-amber-300">No in-platform match.</p>
                        <p className="mt-1">
                          The platform's 20 elegant-code cards + 60 outcome tiles don't directly answer this question.
                          Use the external AI platforms below for a general answer — they may also surface the platform's
                          GitHub repo if it's been indexed.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* External AI platforms */}
                {query.trim().length > 1 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <ExternalLink className="h-3 w-3 text-primary" />
                      Ask external AI platforms (opens in new tab with question pre-filled)
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {externalUrls.map((p) => (
                        <a
                          key={p.name}
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-md border border-border/60 bg-muted/20 p-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors group"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: p.accent }}
                            />
                            <span className="text-xs font-semibold text-foreground/80 group-hover:text-primary transition-colors">
                              {p.name}
                            </span>
                            <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{p.description}</p>
                        </a>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground italic mt-2 leading-relaxed">
                      Each platform opens in a new tab with your question pre-filled in the URL.
                      The platform doesn't store your question or share it with any of these services —
                      the URL handoff is the only data transfer.
                    </p>
                  </div>
                )}

                {/* Footer */}
                {!query.trim() && (
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                    <p className="font-semibold text-primary flex items-center gap-1.5">
                      <MessageCircle className="h-3.5 w-3.5" />
                      How this works
                    </p>
                    <p className="mt-1.5 leading-relaxed">
                      The widget is a smart search engine over the platform's 20 elegant-code cards and 60 outcome tiles
                      (skills, talents, sciences, sectors, insights). When you ask a question, it scores every card against
                      your query and returns the top 5 in-platform matches with deep-links to the full cards.
                      If no in-platform match (or for a second opinion), one-click deep-links open your preferred
                      external AI platform with the question pre-filled.
                    </p>
                    <p className="mt-2 text-[10px] italic">
                      The widget runs fully client-side — no backend, no API keys, no data leaves your browser
                      except the URL handoff to the external platform you click.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
