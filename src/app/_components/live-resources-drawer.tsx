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
import {
  ExternalLink, Loader2, Sparkles, AlertCircle,
  FileText, GitBranch, Database, Code2, BookOpen, Send,
} from "lucide-react";

/**
 * LiveResourcesDrawer — opens as a right-side drawer.
 *
 * Tabs:
 *   - Papers   : arXiv (latest) + Semantic Scholar (highly cited)
 *   - Repos    : GitHub Search API (top implementations by stars)
 *   - Datasets : Hugging Face + Papers with Code datasets
 *   - Code     : Code snippets from popular GitHub repos (raw.githubusercontent)
 *   - Submit   : Bidirectional — opens prefilled GitHub new-issue URL
 *                to suggest a new resource for the platform
 *
 * All client-side fetch. Cached in localStorage 24h. Works on static
 * GitHub Pages preview.
 */

type Tab = "papers" | "repos" | "datasets" | "code" | "submit";

interface ArxivPaper {
  title: string; authors: string[]; published: string; url: string; summary: string;
}
interface GitHubRepo {
  name: string; url: string; stars: number; description: string; language: string; last_updated: string; topics: string[];
}
interface HFDataset {
  id: string; url: string; downloads: number; description: string; tags: string[];
}
interface PwCDataset {
  name: string; url: string; description: string;
}
interface CodeSnippet {
  filename: string; language: string; code: string; repo: string; url: string;
}

interface ResourcesData {
  arxiv?: { count: number; papers: ArxivPaper[] } | { error: string };
  github?: { count: number; repos: GitHubRepo[] } | { error: string };
  huggingface?: { count: number; datasets: HFDataset[] } | { error: string };
  pwc_datasets?: { count: number; datasets: PwCDataset[] } | { error: string };
  code?: { count: number; snippets: CodeSnippet[] } | { error: string };
  fetched_at: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_PREFIX = "mdse-resources-cache:";

function getCached(topic: string): ResourcesData | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + topic);
    if (!raw) return null;
    const data = JSON.parse(raw) as { data: ResourcesData; ts: number };
    if (Date.now() - data.ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + topic);
      return null;
    }
    return data.data;
  } catch { return null; }
}

function setCached(topic: string, data: ResourcesData) {
  try {
    localStorage.setItem(CACHE_PREFIX + topic, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* ignore */ }
}

async function fetchJson(url: string, timeoutMs = 15000): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept": "application/json, application/xml, */*" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("json")) return await res.json();
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * fetchJsonWithCorsFallback — try direct fetch first; on failure (CORS,
 * 403, network error), retry through a public CORS proxy.
 *
 * Why: the static GitHub Pages preview can't reach APIs that don't set
 * `Access-Control-Allow-Origin: *`. Verified failures (Oct 2026):
 *   - export.arxiv.org          — no CORS headers, blocked
 *   - api.github.com/search      — works for unauthenticated requests
 *                                  but rate-limited (60/hr/IP)
 *   - huggingface.co/api/datasets — CORS-friendly (works direct)
 *   - paperswithcode.com/api/v1   — sometimes flaky from GH Pages
 *
 * Public CORS proxies used as fallback (in order):
 *   1. https://corsproxy.io/?url=<encoded>   — fast, reliable
 *   2. https://api.allorigins.win/raw?url=<encoded>  — slower, more permissive
 *
 * Both are read-only GET proxies. They DON'T forward POST/cookies/headers.
 */
async function fetchJsonWithCorsFallback(url: string, timeoutMs = 15000): Promise<unknown> {
  // Try direct first
  try {
    return await fetchJson(url, timeoutMs);
  } catch (directErr) {
    const msg = directErr instanceof Error ? directErr.message : String(directErr);
    // If it's a CORS / network error, retry through proxies
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("CORS") || msg.includes("HTTP 403") || msg.includes("HTTP 0")) {
      const encoded = encodeURIComponent(url);
      const proxies = [
        `https://corsproxy.io/?url=${encoded}`,
        `https://api.allorigins.win/raw?url=${encoded}`,
      ];
      for (const proxyUrl of proxies) {
        try {
          return await fetchJson(proxyUrl, timeoutMs);
        } catch {
          // try next proxy
        }
      }
      // All proxies failed — rethrow the original error
      throw directErr;
    }
    // Non-CORS error (e.g. HTTP 404, 500) — don't retry
    throw directErr;
  }
}

async function fetchArxiv(topic: string): Promise<NonNullable<ResourcesData["arxiv"]>> {
  try {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(topic)}&start=0&max_results=5&sortBy=submittedDate&sortOrder=descending`;
    const text = (await fetchJsonWithCorsFallback(url, 20000)) as string;
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

async function fetchGitHub(topic: string, language = ""): Promise<NonNullable<ResourcesData["github"]>> {
  try {
    const langQ = language ? `+language:${language}` : "";
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(topic)}${langQ}+stars:>10&sort=stars&order=desc&per_page=5`;
    const data = (await fetchJsonWithCorsFallback(url, 15000)) as { items?: Array<Record<string, unknown>> };
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

async function fetchHuggingFace(topic: string): Promise<NonNullable<ResourcesData["huggingface"]>> {
  try {
    // Hugging Face datasets search API — public, no auth needed
    const url = `https://huggingface.co/api/datasets?search=${encodeURIComponent(topic)}&limit=5&full=false`;
    const data = (await fetchJsonWithCorsFallback(url, 15000)) as Array<Record<string, unknown>>;
    const datasets: HFDataset[] = (Array.isArray(data) ? data : []).map((d) => ({
      id: String(d.id ?? d.name ?? "?"),
      url: `https://huggingface.co/datasets/${d.id ?? d.name ?? ""}`,
      downloads: Number(d.downloads ?? 0),
      description: String(d.description ?? d.tags?.[0] ?? "").slice(0, 200),
      tags: Array.isArray(d.tags) ? d.tags.slice(0, 5) : [],
    }));
    return { count: datasets.length, datasets };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function fetchPwCDatasets(topic: string): Promise<NonNullable<ResourcesData["pwc_datasets"]>> {
  try {
    // Papers with Code datasets API
    const url = `https://paperswithcode.com/api/v1/datasets/?search=${encodeURIComponent(topic)}&page=1&page_size=5`;
    const data = (await fetchJsonWithCorsFallback(url, 15000)) as { results?: Array<Record<string, unknown>> };
    const datasets: PwCDataset[] = (data.results || []).map((d) => ({
      name: String(d.name ?? ""),
      url: `https://paperswithcode.com/dataset/${d.slug ?? d.name ?? ""}`,
      description: String(d.description ?? "").slice(0, 280),
    }));
    return { count: datasets.length, datasets };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function fetchCodeSnippets(topic: string, sampleRepo?: string): Promise<NonNullable<ResourcesData["code"]>> {
  try {
    if (sampleRepo) {
      // Fetch a specific file from a known repo via raw.githubusercontent
      // e.g. "owner/repo/main/path/to/file.py"
      const url = `https://raw.githubusercontent.com/${sampleRepo}`;
      const text = (await fetchJsonWithCorsFallback(url, 15000)) as string;
      return {
        count: 1,
        snippets: [{
          filename: sampleRepo.split("/").pop() || "snippet",
          language: sampleRepo.endsWith(".py") ? "python" : sampleRepo.endsWith(".scala") ? "scala" : sampleRepo.endsWith(".go") ? "go" : sampleRepo.endsWith(".rs") ? "rust" : "text",
          code: text.slice(0, 4000),
          repo: sampleRepo.split("/").slice(0, 2).join("/"),
          url: `https://github.com/${sampleRepo.split("/").slice(0, 2).join("/")}`,
        }],
      };
    }
    return { count: 0, snippets: [] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function fetchAll(topic: string, codeRepo?: string): Promise<ResourcesData> {
  const [arxiv, github, hf, pwc, code] = await Promise.all([
    fetchArxiv(topic),
    fetchGitHub(topic),
    fetchHuggingFace(topic),
    fetchPwCDatasets(topic),
    fetchCodeSnippets(topic, codeRepo),
  ]);
  return {
    arxiv, github, huggingface: hf, pwc_datasets: pwc, code,
    fetched_at: new Date().toISOString(),
  };
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch { return iso.slice(0, 10); }
}

// ============================================================
// Bidirectional submit — opens prefilled GitHub new-issue URL
// ============================================================
const PUBLIC_REPO_OWNER = "testdemoqwenai2025-creator";
const PUBLIC_REPO_NAME = "DemoAppDataSci";

function SubmitTab({ topic }: { topic: string }) {
  const [title, setTitle] = useState(`Suggest resource for: ${topic}`);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [type, setType] = useState<"paper" | "repo" | "dataset" | "code">("paper");

  const issueBody = [
    `## Suggested resource for topic: \`${topic}\``,
    "",
    `**Type**: ${type}`,
    url ? `**URL**: ${url}` : "",
    "",
    "**Why should this be added to the platform?**",
    note || "_(replace this with your rationale — what does this resource add that's missing?)_",
    "",
    "---",
    "_Submitted via the LiveResourcesDrawer bidirectional submit form. Maintainers will review and merge if accepted._",
  ].filter(Boolean).join("\n");

  const issueUrl = `https://github.com/${PUBLIC_REPO_OWNER}/${PUBLIC_REPO_NAME}/issues/new?${new URLSearchParams({
    title,
    body: issueBody,
    labels: `suggested-resource,${type}`,
  }).toString()}`;

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
        <p className="text-xs font-semibold flex items-center gap-1.5 text-primary">
          <Send className="h-3.5 w-3.5" /> Bidirectional submit
        </p>
        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
          Found a paper, repo, dataset, or code snippet that should be in the platform?
          Fill in the form, click submit, and a prefilled GitHub issue will open on the
          public repo. Maintainers review and merge accepted suggestions — the platform
          becomes self-curating.
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Resource type</label>
        <div className="flex flex-wrap gap-1.5">
          {(["paper", "repo", "dataset", "code"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                type === t ? "bg-primary text-primary-foreground border-primary" : "border-border/60 hover:bg-accent"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-border/60 px-2 py-1.5 text-xs"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://arxiv.org/abs/... or https://github.com/... or https://huggingface.co/datasets/..."
          className="w-full rounded-md border border-border/60 px-2 py-1.5 text-xs font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Why add this?</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="What does this resource add that's currently missing? Which platform page should it appear on?"
          className="w-full rounded-md border border-border/60 px-2 py-1.5 text-xs"
        />
      </div>
      <Button asChild className="gap-1.5 w-full">
        <a href={issueUrl} target="_blank" rel="noopener noreferrer">
          <Send className="h-3.5 w-3.5" /> Open GitHub issue
        </a>
      </Button>
      <p className="text-[10px] text-muted-foreground text-center">
        Opens a new tab with a prefilled issue on {PUBLIC_REPO_OWNER}/{PUBLIC_REPO_NAME}.
        No GitHub login required to view; submitter logs in to post.
      </p>
    </div>
  );
}

// ============================================================
// Main component
// ============================================================
export function LiveResourcesDrawer({
  topic,
  codeRepo,
  trigger,
}: {
  topic: string;
  codeRepo?: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("repos");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ResourcesData | null>(null);

  const load = useCallback(async () => {
    if (!topic) return;
    setLoading(true);
    const cached = getCached(topic);
    if (cached) { setData(cached); setLoading(false); return; }
    try {
      const result = await fetchAll(topic, codeRepo);
      setData(result);
      setCached(topic, result);
    } finally {
      setLoading(false);
    }
  }, [topic, codeRepo]);

  useEffect(() => {
    if (open && !data && !loading) load();
  }, [open, data, loading, load]);

  const TABS: { id: Tab; label: string; icon: typeof FileText }[] = [
    { id: "repos", label: "Repos", icon: GitBranch },
    { id: "papers", label: "Papers", icon: FileText },
    { id: "datasets", label: "Datasets", icon: Database },
    { id: "code", label: "Code", icon: Code2 },
    { id: "submit", label: "Submit", icon: Send },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="w-[min(620px,100vw)] sm:max-w-[620px] p-0 overflow-y-auto">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <SheetTitle className="text-base">Live resources drawer</SheetTitle>
          </div>
          <SheetDescription className="text-xs">
            Real-time data fetched client-side for topic{" "}
            <code className="font-mono text-foreground/80">{topic}</code>. Sources: arXiv, GitHub,
            Hugging Face, Papers with Code. Cached 24h in localStorage.
          </SheetDescription>
        </SheetHeader>

        {/* Tabs */}
        <div className="flex border-b border-border/60 bg-muted/20">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? "border-primary text-primary bg-background"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3 w-3" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-4 space-y-3 min-h-[400px]">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Fetching live data from 5 sources…</span>
            </div>
          )}

          {data && !loading && tab === "papers" && (
            <section>
              {data.arxiv && "error" in data.arxiv ? (
                <p className="text-xs text-rose-600 dark:text-rose-400">⚠ {data.arxiv.error}</p>
              ) : data.arxiv ? (
                <ul className="space-y-2">
                  {data.arxiv.papers.map((p, i) => (
                    <li key={i} className="rounded-md border border-border/60 p-2.5 hover:bg-muted/20">
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
              ) : <p className="text-xs text-muted-foreground">No data</p>}
            </section>
          )}

          {data && !loading && tab === "repos" && (
            <section>
              {data.github && "error" in data.github ? (
                <p className="text-xs text-rose-600 dark:text-rose-400">⚠ {data.github.error}</p>
              ) : data.github ? (
                <ul className="space-y-2">
                  {data.github.repos.map((r, i) => (
                    <li key={i} className="rounded-md border border-border/60 p-2.5 hover:bg-muted/20">
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
              ) : <p className="text-xs text-muted-foreground">No data</p>}
            </section>
          )}

          {data && !loading && tab === "datasets" && (
            <section className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Database className="h-3 w-3" /> Hugging Face datasets
                </p>
                {data.huggingface && "error" in data.huggingface ? (
                  <p className="text-xs text-rose-600 dark:text-rose-400">⚠ {data.huggingface.error}</p>
                ) : data.huggingface ? (
                  <ul className="space-y-2">
                    {data.huggingface.datasets.map((d, i) => (
                      <li key={i} className="rounded-md border border-border/60 p-2.5 hover:bg-muted/20">
                        <a href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2">
                          <span className="text-[11px] font-mono text-primary hover:underline">{d.id}</span>
                          <Badge variant="outline" className="text-[9px] ml-auto shrink-0">{d.downloads} dl</Badge>
                        </a>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{d.description}</p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 mt-3 flex items-center gap-1.5">
                  <BookOpen className="h-3 w-3" /> Papers with Code datasets
                </p>
                {data.pwc_datasets && "error" in data.pwc_datasets ? (
                  <p className="text-xs text-rose-600 dark:text-rose-400">⚠ {data.pwc_datasets.error}</p>
                ) : data.pwc_datasets ? (
                  <ul className="space-y-2">
                    {data.pwc_datasets.datasets.map((d, i) => (
                      <li key={i} className="rounded-md border border-border/60 p-2.5 hover:bg-muted/20">
                        <a href={d.url} target="_blank" rel="noopener noreferrer">
                          <p className="text-[11px] font-mono text-primary hover:underline">{d.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{d.description}</p>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          )}

          {data && !loading && tab === "code" && (
            <section>
              {data.code && "error" in data.code ? (
                <p className="text-xs text-rose-600 dark:text-rose-400">⚠ {data.code.error}</p>
              ) : data.code && data.code.count > 0 ? (
                <div className="space-y-3">
                  <p className="text-[11px] text-muted-foreground">
                    Live code fetched from <code className="font-mono">{data.code.snippets[0].repo}</code> on GitHub
                  </p>
                  {data.code.snippets.map((s, i) => (
                    <div key={i} className="rounded-md border border-border/60 overflow-hidden">
                      <div className="bg-muted/40 px-2 py-1 border-b border-border/60 flex items-center justify-between">
                        <span className="text-[11px] font-mono">{s.filename}</span>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1">
                          <ExternalLink className="h-2.5 w-2.5" /> repo
                        </a>
                      </div>
                      <pre className="code-scroll overflow-x-auto p-2 text-[10px] leading-relaxed font-mono bg-[oklch(0.16_0.005_240)] text-[oklch(0.97_0.005_60)] max-h-96">
                        {s.code.slice(0, 3000)}
                      </pre>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No code snippet configured for this topic. Set the <code className="font-mono">codeRepo</code> prop
                  on LiveResourcesDrawer to enable (e.g. <code className="font-mono">&quot;owner/repo/main/path/file.py&quot;</code>).
                </p>
              )}
            </section>
          )}

          {tab === "submit" && !loading && (
            <SubmitTab topic={topic} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
