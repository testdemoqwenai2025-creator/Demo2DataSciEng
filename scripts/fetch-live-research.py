#!/usr/bin/env python3
"""
ModernDataSciEng Platform — Live Research Fetcher

Fetches the latest research papers, GitHub repos, and datasets for a
given topic. Used by the LiveResearchDrawer component (client-side) and
also runnable as a CLI for batch refresh.

Data sources:
  - arXiv API (https://export.arxiv.org/api/query) — no auth, rate-limited
  - GitHub Search API (https://api.github.com/search/repositories) — 60 req/hr unauth
  - Papers with Code API (https://paperswithcode.com/api/v1/) — public
  - Semantic Scholar (https://api.semanticscholar.org/graph/v1/) — public, 5000 req/5min

Usage:
    python3 scripts/fetch-live-research.py <topic> [--limit 5] [--json]

Output:
    JSON document with keys: arxiv, github, papers_with_code, semantic_scholar
"""
import sys, json, urllib.request, urllib.parse, urllib.error, re
from datetime import datetime, timezone

def fetch(url, timeout=15, headers=None):
    h = {"User-Agent": "ModernDataSciEng-ResearchFetcher/1.0"}
    if headers: h.update(headers)
    req = urllib.request.Request(url, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            text = r.read().decode("utf-8", errors="ignore")
            return r.status, text
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="ignore")
    except Exception as e:
        return 0, str(e)

# ============================================================
# arXiv — latest papers
# ============================================================
def fetch_arxiv(topic, limit=5):
    """Search arXiv for the latest papers on a topic."""
    query = urllib.parse.quote(topic)
    url = f"https://export.arxiv.org/api/query?search_query=all:{query}&start=0&max_results={limit}&sortBy=submittedDate&sortOrder=descending"
    status, text = fetch(url, timeout=20)
    if status != 200:
        return {"error": f"arXiv HTTP {status}", "url": url}
    # Parse Atom XML
    results = []
    # Simple regex-based parse (avoid xml dependency)
    entries = re.findall(r"<entry>(.*?)</entry>", text, re.DOTALL)
    for entry in entries:
        title = re.search(r"<title>(.*?)</title>", entry, re.DOTALL)
        summary = re.search(r"<summary>(.*?)</summary>", entry, re.DOTALL)
        published = re.search(r"<published>(.*?)</published>", entry)
        link = re.search(r'<id>(.*?)</id>', entry)
        authors = re.findall(r"<name>(.*?)</name>", entry)
        if title:
            title_text = re.sub(r"\s+", " ", title.group(1)).strip()
            results.append({
                "title": title_text,
                "authors": authors[:5],
                "published": published.group(1) if published else None,
                "url": link.group(1).strip() if link else None,
                "summary": (re.sub(r"\s+", " ", summary.group(1)).strip()[:280] + "...") if summary else None,
            })
    return {"count": len(results), "papers": results, "source": "arXiv", "fetched_at": datetime.now(timezone.utc).isoformat()}

# ============================================================
# GitHub — top repos
# ============================================================
def fetch_github(topic, limit=5):
    """Search GitHub for top repositories on a topic."""
    query = urllib.parse.quote(topic)
    url = f"https://api.github.com/search/repositories?q={query}+language:python+stars:>10&sort=stars&order=desc&per_page={limit}"
    status, text = fetch(url, timeout=15)
    if status != 200:
        return {"error": f"GitHub HTTP {status}", "url": url}
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return {"error": "GitHub returned non-JSON"}
    results = []
    for repo in data.get("items", [])[:limit]:
        results.append({
            "name": repo.get("full_name"),
            "url": repo.get("html_url"),
            "stars": repo.get("stargazers_count"),
            "description": repo.get("description", "")[:200],
            "language": repo.get("language"),
            "last_updated": repo.get("updated_at"),
            "topics": repo.get("topics", [])[:5],
        })
    return {"count": len(results), "repos": results, "source": "GitHub", "fetched_at": datetime.now(timezone.utc).isoformat()}

# ============================================================
# Papers with Code — datasets + benchmarks
# ============================================================
def fetch_papers_with_code(topic, limit=5):
    """Search Papers with Code for papers + datasets on a topic."""
    # Search papers
    url = f"https://paperswithcode.com/api/v1/search/?q={urllib.parse.quote(topic)}&page=1&page_size={limit}"
    status, text = fetch(url, timeout=15)
    if status != 200:
        return {"error": f"PwC HTTP {status}"}
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return {"error": "PwC returned non-JSON"}
    results = []
    for item in data.get("results", [])[:limit]:
        paper = item.get("paper", {})
        results.append({
            "title": paper.get("title"),
            "url": f"https://paperswithcode.com/paper/{paper.get('id')}",
            "abstract": paper.get("abstract", "")[:280] + "..." if paper.get("abstract") else None,
            "proceeding": paper.get("proceeding"),
        })
    return {"count": len(results), "papers": results, "source": "Papers with Code", "fetched_at": datetime.now(timezone.utc).isoformat()}

# ============================================================
# Semantic Scholar — citation graph
# ============================================================
def fetch_semantic_scholar(topic, limit=5):
    """Search Semantic Scholar for highly-cited papers."""
    url = f"https://api.semanticscholar.org/graph/v1/paper/search?query={urllib.parse.quote(topic)}&limit={limit}&fields=title,year,citationCount,authors,abstract,openAccessPdf,url"
    status, text = fetch(url, timeout=20)
    if status != 200:
        return {"error": f"S2 HTTP {status}"}
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return {"error": "S2 returned non-JSON"}
    results = []
    for paper in data.get("data", [])[:limit]:
        results.append({
            "title": paper.get("title"),
            "year": paper.get("year"),
            "citations": paper.get("citationCount"),
            "authors": [a.get("name") for a in paper.get("authors", [])][:5],
            "url": paper.get("url"),
            "pdf": paper.get("openAccessPdf", {}).get("url") if paper.get("openAccessPdf") else None,
            "abstract": paper.get("abstract", "")[:280] + "..." if paper.get("abstract") else None,
        })
    return {"count": len(results), "papers": results, "source": "Semantic Scholar", "fetched_at": datetime.now(timezone.utc).isoformat()}

# ============================================================
# Main
# ============================================================
def main():
    if len(sys.argv) < 2:
        print("Usage: fetch-live-research.py <topic> [--limit N] [--json]")
        sys.exit(2)
    topic = sys.argv[1]
    limit = 5
    if "--limit" in sys.argv:
        idx = sys.argv.index("--limit")
        if idx + 1 < len(sys.argv):
            limit = int(sys.argv[idx + 1])

    print(f"Fetching live research for: {topic!r} (limit={limit})", file=sys.stderr)
    result = {
        "topic": topic,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "arxiv": fetch_arxiv(topic, limit),
        "github": fetch_github(topic, limit),
        "papers_with_code": fetch_papers_with_code(topic, limit),
        "semantic_scholar": fetch_semantic_scholar(topic, limit),
    }
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
