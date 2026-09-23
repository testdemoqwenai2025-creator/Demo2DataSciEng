"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Loader2, Search, FileText, GitBranch, Database, Quote, Sparkles, AlertCircle } from "lucide-react";

/**
 * LiveResearchDrawer — opens as a right-side drawer.
 * Fetches real-time research from:
 *   - arXiv (latest papers)
 *   - GitHub (top implementations)
 *   - Papers with Code (datasets + benchmarks)
 *   - Semantic Scholar (citation count)
 *
 * All client-side, no backend required (works on static GitHub Pages).
 * Results cached in localStorage for 24h.
 */

interface ArxivPaper {
  title: string;
  authors: string[];
  published: string;
  url: string;
  summary: string;
}
interface GitHubRepo {
  name: string;
  url: string;
  stars: number;
  description: string;
  language: string;
  last_updated: string;
  topics: string[];
}
interface PwCPaper {
  title: string;
  url: string;
  abstract: string;
  proceeding: string;
}
interface S2Paper {
  title: string;
  year: number;
  citations: number;
  authors: string[];
  url: string;
  pdf: string;
  abstract: string;
}

interface ResearchData {
  arxiv: { count: number; papers: ArxivPaper[] } | { error: string };
  github: { count: number; repos: GitHubRepo[] } | { error: string };
  papers_with_code: { count: number; papers: PwCPaper[] } | { error: string };
  semantic_scholar: { count: number; papers: S2Paper[] } | { error: string };
  fetched_at: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_PREFIX = "mdse-research-cache:";

function getCached(topic: string): ResearchData | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + topic);
    if (!raw) return null;
    const data = JSON.parse(raw) as { data: ResearchData; ts: number };
    if (Date.now() - data.ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + topic);
      return null;
    }
    return data.data;
  } catch {
    return null;
  }
}

function setCached(topic: string, data: ResearchData) {
  try {
    localStorage.setItem(CACHE_PREFIX + topic, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

async function fetchJson(url: string, timeoutMs = 15000): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept": "application/json, application/xml, */*" },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("json")) {
      return await res.json();
    }
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchArxiv(topic: string): Promise<ResearchData["arxiv"]> {
  try {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(topic)}&start=0&max_results=5&sortBy=submittedDate&sortOrder=descending`;
    const text = (await fetchJson(url, 20000)) as string;
    // Parse Atom XML
    const papers: ArxivPaper[] = [];
    const entries = text.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
    for (const entry of entries) {
      const title = entry.match(/<title>([\s\S]*?)<\/title>/);
      const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/);
      const published = entry.match(/<published>([^<]+)<\/published>/);
      const id = entry.match(/<id>([^<]+)<\/id>/);
      const authors = (entry.match(/<name>([^<]+)<\/name>/g) || []).map((a) => a.replace(/<\/?name>/g, "")).slice(0, 5);
      if (title) {
        papers.push({
          title: title[1].replace(/\s+/g, " ").trim(),
          authors,
          published: published ? published[1] : "",
          url: id ? id[1].trim() : "",
          summary: summary ? summary[1].replace(/\s+/g, " ").trim().slice(0, 280) + "..." : "",
        });
      }
    }
    return { count: papers.length, papers };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function fetchGitHub(topic: string): Promise<ResearchData["github"]> {
  try {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(topic)}+language:python+stars:>10&sort=stars&order=desc&per_page=5`;
    const data = (await fetchJson(url, 15000)) as { items?: Array<Record<string, unknown>> };
    const repos: GitHubRepo[] = (data.items || []).map((repo) => ({
      name: String(repo.full_name ?? repo.name ?? "?"),
      url: String(repo.html_url ?? ""),
      stars: Number(repo.stargazers_count ?? 0),
      description: String(repo.description ?? "").slice(0, 200),
      language: String(repo.language ?? "?"),
      last_updated: String(repo.updated_at ?? ""),
      topics: Array.isArray(repo.topics) ? repo.topics.slice(0, 5) : [],
    }));
    return { count: repos.length, repos };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function fetchPwC(topic: string): Promise<ResearchData["papers_with_code"]> {
  try {
    const url = `https://paperswithcode.com/api/v1/search/?q=${encodeURIComponent(topic)}&page=1&page_size=5`;
    const data = (await fetchJson(url, 15000)) as { results?: Array<Record<string, unknown>> };
    const papers: PwCPaper[] = (data.results || []).map((item) => {
      const paper = (item.paper ?? {}) as Record<string, unknown>;
      return {
        title: String(paper.title ?? ""),
        url: `https://paperswithcode.com/paper/${paper.id ?? ""}`,
        abstract: String(paper.abstract ?? "").slice(0, 280) + "...",
        proceeding: String(paper.proceeding ?? ""),
      };
    });
    return { count: papers.length, papers };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function fetchS2(topic: string): Promise<ResearchData["semantic_scholar"]> {
  try {
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(topic)}&limit=5&fields=title,year,citationCount,authors,abstract,openAccessPdf,url`;
    const data = (await fetchJson(url, 20000)) as { data?: Array<Record<string, unknown>> };
    const papers: S2Paper[] = (data.data || []).map((p) => ({
      title: String(p.title ?? ""),
      year: Number(p.year ?? 0),
      citations: Number(p.citationCount ?? 0),
      authors: Array.isArray(p.authors) ? p.authors.map((a: Record<string, unknown>) => String(a.name ?? "")).slice(0, 5) : [],
      url: String(p.url ?? ""),
      pdf: p.openAccessPdf && typeof p.openAccessPdf === "object" ? String((p.openAccessPdf as Record<string, unknown>).url ?? "") : "",
      abstract: String(p.abstract ?? "").slice(0, 280) + "...",
    }));
    return { count: papers.length, papers };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function fetchAll(topic: string): Promise<ResearchData> {
  // Run all four in parallel — Promise.allSettled never rejects
  const [arxiv, github, pwc, s2] = await Promise.all([
    fetchArxiv(topic),
    fetchGitHub(topic),
    fetchPwC(topic),
    fetchS2(topic),
  ]);
  return {
    arxiv,
    github,
    papers_with_code: pwc,
    semantic_scholar: s2,
    fetched_at: new Date().toISOString(),
  };
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

export function LiveResearchDrawer({ topic, trigger }: { topic: string; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ResearchData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!topic) return;
    setLoading(true);
    setError(null);
    // Check cache first
    const cached = getCached(topic);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }
    try {
      const result = await fetchAll(topic);
      setData(result);
      setCached(topic, result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [topic]);

  // When drawer opens, kick off the fetch (if no data yet)
  useEffect(() => {
    if (open && !data && !loading) {
      load();
    }
  }, [open, data, loading, load]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(560px,100vw)] sm:max-w-[560px] p-0 overflow-y-auto">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <SheetTitle className="text-base">Live research drawer</SheetTitle>
          </div>
          <SheetDescription className="text-xs">
            Real-time data fetched from arXiv, GitHub, Papers with Code, and Semantic Scholar — for topic{" "}
            <code className="font-mono text-foreground/80">{topic}</code>. Cached 24h in localStorage.
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-5">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Fetching live data from 4 sources…</span>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-rose-500/40 bg-rose-500/8 p-3 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {data && !loading && (
            <>
              {/* arXiv */}
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-3.5 w-3.5 text-amber-500" />
                  <h3 className="text-sm font-semibold">arXiv — latest papers</h3>
                  {"count" in data.arxiv && (
                    <Badge variant="outline" className="ml-auto text-[10px]">{data.arxiv.count}</Badge>
                  )}
                </div>
                {"error" in data.arxiv ? (
                  <p className="text-xs text-rose-600 dark:text-rose-400">⚠ {data.arxiv.error}</p>
                ) : (
                  <ul className="space-y-2">
                    {data.arxiv.papers.map((p, i) => (
                      <li key={i} className="rounded-md border border-border/60 p-2.5 hover:bg-muted/20 transition-colors">
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="block">
                          <p className="text-xs font-medium leading-snug hover:text-primary">{p.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {p.authors.join(", ")} · {formatDate(p.published)}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{p.summary}</p>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* GitHub */}
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <GitBranch className="h-3.5 w-3.5 text-emerald-500" />
                  <h3 className="text-sm font-semibold">GitHub — top implementations</h3>
                  {"count" in data.github && (
                    <Badge variant="outline" className="ml-auto text-[10px]">{data.github.count}</Badge>
                  )}
                </div>
                {"error" in data.github ? (
                  <p className="text-xs text-rose-600 dark:text-rose-400">⚠ {data.github.error}</p>
                ) : data.github.repos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No matching repos.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.github.repos.map((r, i) => (
                      <li key={i} className="rounded-md border border-border/60 p-2.5 hover:bg-muted/20 transition-colors">
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2">
                          <span className="text-[11px] font-mono text-primary hover:underline">{r.name}</span>
                          <Badge variant="outline" className="text-[9px] ml-auto shrink-0">★ {r.stars}</Badge>
                        </a>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{r.description}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span>{r.language}</span>
                          {r.topics.slice(0, 3).map((t) => (
                            <span key={t} className="px-1.5 py-0.5 bg-muted rounded text-[9px]">{t}</span>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Papers with Code */}
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-3.5 w-3.5 text-violet-500" />
                  <h3 className="text-sm font-semibold">Papers with Code — implementations + datasets</h3>
                  {"count" in data.papers_with_code && (
                    <Badge variant="outline" className="ml-auto text-[10px]">{data.papers_with_code.count}</Badge>
                  )}
                </div>
                {"error" in data.papers_with_code ? (
                  <p className="text-xs text-rose-600 dark:text-rose-400">⚠ {data.papers_with_code.error}</p>
                ) : (
                  <ul className="space-y-2">
                    {data.papers_with_code.papers.map((p, i) => (
                      <li key={i} className="rounded-md border border-border/60 p-2.5">
                        <a href={p.url} target="_blank" rel="noopener noreferrer">
                          <p className="text-xs font-medium hover:text-primary">{p.title}</p>
                          {p.proceeding && <p className="text-[10px] text-muted-foreground mt-0.5">{p.proceeding}</p>}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Semantic Scholar */}
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Quote className="h-3.5 w-3.5 text-cyan-500" />
                  <h3 className="text-sm font-semibold">Semantic Scholar — highly cited</h3>
                  {"count" in data.semantic_scholar && (
                    <Badge variant="outline" className="ml-auto text-[10px]">{data.semantic_scholar.count}</Badge>
                  )}
                </div>
                {"error" in data.semantic_scholar ? (
                  <p className="text-xs text-rose-600 dark:text-rose-400">⚠ {data.semantic_scholar.error}</p>
                ) : (
                  <ul className="space-y-2">
                    {data.semantic_scholar.papers.map((p, i) => (
                      <li key={i} className="rounded-md border border-border/60 p-2.5">
                        <a href={p.url} target="_blank" rel="noopener noreferrer">
                          <p className="text-xs font-medium hover:text-primary">{p.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {p.authors.join(", ")} · {p.year} · {p.citations} citations
                          </p>
                          {p.pdf && (
                            <a href={p.pdf} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline mt-1 inline-flex items-center gap-1">
                              <ExternalLink className="h-2.5 w-2.5" /> PDF
                            </a>
                          )}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Cache + refresh footer */}
              <div className="border-t border-border/60 pt-3 text-[10px] text-muted-foreground flex items-center justify-between">
                <span>Fetched {formatDate(data.fetched_at)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] gap-1"
                  onClick={() => {
                    try { localStorage.removeItem(CACHE_PREFIX + topic); } catch { /* ignore */ }
                    setData(null);
                    load();
                  }}
                >
                  <Search className="h-3 w-3" /> Refresh
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
