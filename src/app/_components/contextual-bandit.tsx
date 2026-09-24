"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PAGES, hrefFor, type PageId } from "../_lib/router";
import { Sparkles, ArrowRight, X, TrendingUp, ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * ContextualBandit — LAZY drawer mode.
 *
 * Instead of rendering inline at the bottom of every page (which adds
 * DOM nodes, JS execution, and memory to every page load), this now
 * renders as a button + Sheet drawer. The Thompson sampling only runs
 * when the user opens the drawer — not on every page mount.
 *
 * Memory efficient: 0 Beta samples until user asks.
 * Bandwidth efficient: 0 recommendation cards in DOM until user asks.
 * UX efficient: the affordance is a small button at the bottom of the
 * page; the depth lives in the drawer.
 */

interface BanditState {
  [pageId: string]: { alpha: number; beta: number; last_visited: string };
}

const BANDIT_KEY = "mdse-pages-bandit-v1";

function loadBandit(): BanditState {
  try {
    const raw = localStorage.getItem(BANDIT_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const init: BanditState = {};
  for (const p of PAGES) init[p.id] = { alpha: 1, beta: 1, last_visited: "" };
  return init;
}

function saveBandit(state: BanditState) {
  try { localStorage.setItem(BANDIT_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

function sampleGamma(shape: number): number {
  if (shape < 1) shape = 1;
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x = 0, v = 0;
    do { x = randomNormal(); v = 1 + c * x; } while (v <= 0);
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

interface Recommendation {
  page: typeof PAGES[number];
  sampled: number;
  mean: number;
}

function pickRecommendations(
  currentPage: PageId,
  bandit: BanditState,
  count: number,
): Recommendation[] {
  const current = PAGES.find((p) => p.id === currentPage);
  if (!current) return [];
  const candidates = PAGES.filter((p) => p.id !== currentPage && p.id !== "home");
  const sampled = candidates.map((p) => {
    const state = bandit[p.id] ?? { alpha: 1, beta: 1, last_visited: "" };
    let s = sampleBeta(state.alpha, state.beta);
    if (p.group === current.group) s *= 1.5;
    const hour = new Date().getHours();
    if (p.group === "Analytics" && hour >= 7 && hour <= 11) s *= 1.2;
    return { page: p, sampled: s, mean: state.alpha / (state.alpha + state.beta) };
  });
  sampled.sort((a, b) => b.sampled - a.sampled);
  return sampled.slice(0, count);
}

export function ContextualBandit({ currentPage }: { currentPage: PageId }) {
  // Lazy state — bandit loads only when drawer opens
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [bandit, setBandit] = useState<BanditState>({});

  // Mark current page as visited (alpha +1) — happens on mount, not on drawer open
  // Uses lazy useState initializer to avoid setState-in-effect
  const [visited, setVisited] = useState(false);

  useEffect(() => {
    if (visited) return;
    const t = setTimeout(() => {
      // Load bandit + mark current page visited
      const loaded = loadBandit();
      const current = loaded[currentPage] ?? { alpha: 1, beta: 1, last_visited: "" };
      const next = {
        ...loaded,
        [currentPage]: {
          alpha: current.alpha + 1,
          beta: current.beta,
          last_visited: new Date().toISOString(),
        },
      };
      saveBandit(next);
      setBandit(next);
      setVisited(true);
    }, 500); // defer 500ms so it doesn't block initial paint
    return () => clearTimeout(t);
  }, [currentPage, visited]);

  // LAZY EVALUATION: only sample recommendations when drawer opens
  const handleOpen = useCallback((openState: boolean) => {
    setOpen(openState);
    if (openState && !loading && recommendations.length === 0) {
      setLoading(true);
      // Defer sampling to next tick so the drawer animation isn't janky
      setTimeout(() => {
        const b = bandit && Object.keys(bandit).length > 0 ? bandit : loadBandit();
        const recs = pickRecommendations(currentPage, b, 5);
        setRecommendations(recs);
        setBandit(b);
        setLoading(false);
      }, 50);
    }
  }, [bandit, currentPage, loading, recommendations.length]);

  const handleSkip = useCallback((pageId: PageId) => {
    setBandit((prev) => {
      const current = prev[pageId] ?? { alpha: 1, beta: 1, last_visited: "" };
      const next = { ...prev, [pageId]: { ...current, beta: current.beta + 1 } };
      saveBandit(next);
      return next;
    });
    // Re-sample
    const b = loadBandit();
    setRecommendations(pickRecommendations(currentPage, b, 5));
  }, [currentPage]);

  const handleResample = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setRecommendations(pickRecommendations(currentPage, bandit, 5));
      setLoading(false);
    }, 50);
  }, [bandit, currentPage]);

  const totalInteractions = useMemo(
    () => Object.values(bandit).reduce((acc, s) => acc + s.alpha + s.beta - 2, 0),
    [bandit]
  );

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="w-full gap-2 justify-between h-auto py-2.5 mt-8"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Recommended next pages</span>
            <Badge variant="outline" className="text-[10px] gap-1">
              <TrendingUp className="h-2.5 w-2.5" /> contextual bandit
            </Badge>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(540px,100vw)] sm:max-w-[540px] p-0 overflow-y-auto">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <SheetTitle className="text-base">Adaptive recommendations</SheetTitle>
          </div>
          <SheetDescription className="text-xs">
            Thompson sampling bandit — picks 5 pages from your posterior based on clicks (α+1) and skips (β+1).
            Same-group pages get a contextual boost; analytics pages get a morning-hours boost.
            State persists to localStorage; iteration #{totalInteractions + 1}.
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-3">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Sampling Beta posteriors…</span>
            </div>
          )}

          {!loading && recommendations.length > 0 && (
            <>
              <div className="space-y-2">
                {recommendations.map(({ page, mean }, i) => (
                  <motion.div
                    key={page.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-md border border-border/60 p-3 bg-card hover:border-primary/40 transition-colors group"
                  >
                    <Link href={hrefFor(page.id)} className="block" onClick={() => setOpen(false)}>
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
                      Not interested (β+1)
                    </button>
                  </motion.div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResample}
                  className="gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Re-sample
                </Button>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  Iteration #{totalInteractions + 1}
                </span>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
