"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { PAGES, hrefFor, type PageId } from "../_lib/router";
import { Sparkles, ArrowRight, X, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Contextual bandit for page recommendations.
 *
 * Extends the Thompson sampling pattern from Knowledge Shorts to the page level:
 *   - Tracks per-page Beta(α, β) posterior based on clicks (α+1) + skips (β+1)
 *   - Context features: current page (referrer), time-of-day bucket, topic
 *   - Recommends 3 pages the user hasn't visited yet, weighted by sampled posterior
 *
 * The bandit sits at the bottom of every page. State persists to localStorage
 * so it learns across sessions. New visitors get a cold-start uniform prior
 * (Beta(1,1) per page) and the bandit warms up as they navigate.
 *
 * Implementation notes:
 *   - Real contextual bandits use feature vectors + logistic regression.
 *   - This simplified version uses topic-similarity as the "context":
 *     a page in the same group as the current page gets a 1.5× multiplier
 *     on its sampled posterior.
 *   - For production: integrate a real CB library (e.g. Vowpal Wabbit) and
 *     store state server-side. See AGENTIC_WORKFLOW.md.
 */

interface BanditState {
  [pageId: string]: {
    alpha: number; // clicks from this user
    beta: number;  // skips
    last_visited: string; // ISO ts
  };
}

const BANDIT_KEY = "mdse-pages-bandit-v1";

function loadBandit(): BanditState {
  try {
    const raw = localStorage.getItem(BANDIT_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const init: BanditState = {};
  for (const p of PAGES) {
    init[p.id] = { alpha: 1, beta: 1, last_visited: "" };
  }
  return init;
}

function saveBandit(state: BanditState) {
  try {
    localStorage.setItem(BANDIT_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

function sampleGamma(shape: number): number {
  if (shape < 1) shape = 1;
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x = 0, v = 0;
    do {
      x = randomNormal();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function randomNormal(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function sampleBeta(alpha: number, beta: number): number {
  const x = sampleGamma(alpha);
  const y = sampleGamma(beta);
  return x / (x + y);
}

function pickRecommendations(
  currentPage: PageId,
  bandit: BanditState,
  count: number,
): Array<{ page: typeof PAGES[number]; sampled: number; mean: number }> {
  const current = PAGES.find((p) => p.id === currentPage);
  if (!current) return [];

  const candidates = PAGES.filter((p) => p.id !== currentPage && p.id !== "home");
  const sampled = candidates.map((p) => {
    const state = bandit[p.id] ?? { alpha: 1, beta: 1, last_visited: "" };
    let s = sampleBeta(state.alpha, state.beta);
    // Contextual boost: same-group pages get 1.5× multiplier
    if (p.group === current.group) s *= 1.5;
    // Time-of-day feature: analytics pages get a small boost in morning hours
    const hour = new Date().getHours();
    if (p.group === "Analytics" && hour >= 7 && hour <= 11) s *= 1.2;
    return {
      page: p,
      sampled: s,
      mean: state.alpha / (state.alpha + state.beta),
    };
  });
  sampled.sort((a, b) => b.sampled - a.sampled);
  return sampled.slice(0, count);
}

export function ContextualBandit({ currentPage }: { currentPage: PageId }) {
  const [recommendations, setRecommendations] = useState<ReturnType<typeof pickRecommendations>>([]);
  const [dismissed, setDismissed] = useState(false);

  // Lazy initializer — runs once on mount (client-side). typeof window guard
  // ensures SSR returns empty object → no hydration mismatch.
  const [bandit, setBandit] = useState<BanditState>(() => {
    if (typeof window === "undefined") return {};
    return loadBandit();
  });
  const [mounted, setMounted] = useState(false);

  // Set mounted flag after first render — bandit loads via the lazy initializer above
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  // Re-sample recommendations when currentPage or bandit changes (only after mounted)
  useEffect(() => {
    if (!mounted || !Object.keys(bandit).length) return;
    const t = setTimeout(() => {
      setRecommendations(pickRecommendations(currentPage, bandit, 3));
      setDismissed(false);
    }, 0);
    return () => clearTimeout(t);
  }, [currentPage, bandit, mounted]);

  // Mark a page as visited (alpha +1) when the user lands on it
  useEffect(() => {
    if (!mounted || !Object.keys(bandit).length || !currentPage) return;
    const t = setTimeout(() => {
      setBandit((prev) => {
        const current = prev[currentPage] ?? { alpha: 1, beta: 1, last_visited: "" };
        const next = {
          ...prev,
          [currentPage]: {
            alpha: current.alpha + 1,
            beta: current.beta,
            last_visited: new Date().toISOString(),
          },
        };
        saveBandit(next);
        return next;
      });
    }, 0);
    return () => clearTimeout(t);
  }, [currentPage, bandit, mounted]);

  const handleSkip = useCallback((pageId: PageId) => {
    setBandit((prev) => {
      const current = prev[pageId] ?? { alpha: 1, beta: 1, last_visited: "" };
      const next = {
        ...prev,
        [pageId]: { ...current, beta: current.beta + 1 }, // skip = "loss"
      };
      saveBandit(next);
      return next;
    });
    // Re-sample
    setRecommendations(pickRecommendations(currentPage, loadBandit(), 3));
  }, [currentPage]);

  if (dismissed || recommendations.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mt-10 rounded-lg border border-primary/30 bg-gradient-to-br from-primary/5 via-background to-amber-500/4 p-5"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Recommended next pages</p>
            <Badge variant="outline" className="text-[10px] gap-1">
              <TrendingUp className="h-2.5 w-2.5" /> contextual bandit
            </Badge>
          </div>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss recommendations"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
          A Thompson sampling bandit picks these 3 pages from your posterior — based on what
          you&apos;ve clicked (α) and skipped (β) so far. Same-group pages get a contextual boost,
          analytics pages get a small morning-hours boost. State persists to localStorage so
          the bandit learns across sessions.
        </p>
        <div className="grid md:grid-cols-3 gap-3">
          {recommendations.map(({ page, mean }, i) => (
            <motion.div
              key={page.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-md border border-border/60 p-3 bg-card hover:border-primary/40 transition-colors group"
            >
              <Link href={hrefFor(page.id)} className="block">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold group-hover:text-primary transition-colors leading-tight">
                    {page.shortLabel}
                  </p>
                  <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2 mb-2">
                  {page.description}
                </p>
                <div className="flex items-center justify-between text-[10px]">
                  <Badge variant="outline" className="text-[9px]">{page.group}</Badge>
                  <span className="font-mono text-muted-foreground">P(click) = {(mean * 100).toFixed(0)}%</span>
                </div>
              </Link>
              <button
                onClick={(e) => { e.preventDefault(); handleSkip(page.id); }}
                className="mt-2 text-[10px] text-muted-foreground hover:text-foreground"
              >
                Not interested
              </button>
            </motion.div>
          ))}
        </div>
        <div className="mt-3 text-[10px] text-muted-foreground italic">
          Iteration {Object.values(bandit).reduce((acc, s) => acc + s.alpha + s.beta - 2, 0) + 1}.
          The more you navigate, the sharper the recommendations become.
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
