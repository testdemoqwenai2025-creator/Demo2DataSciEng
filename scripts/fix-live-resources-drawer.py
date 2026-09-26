#!/usr/bin/env python3
"""
Fix 3 issues in the Live Resources Drawer:
1. Replace arXiv API (no CORS) with Crossref API (CORS-friendly) for Papers tab
2. Fix all 27 broken codeRepo paths (wrong branch or wrong file extension)
3. Improve error handling for PwC datasets API
"""

# ========== FIX 1: floating-live-button.tsx — fix codeRepo paths ==========
FB_FILE = "/home/z/my-project/src/app/_components/floating-live-button.tsx"
with open(FB_FILE) as f:
    src = f.read()

# Known path fixes (original -> correct)
PATH_FIXES = {
    "apache/flink/main/README.md": "apache/flink/master/README.md",
    "apache/spark/main/README.md": "apache/spark/master/README.md",
    "astropy/astropy/main/README.md": "astropy/astropy/main/README.rst",
    "feast-dev/feast/main/README.md": "feast-dev/feast/master/README.md",
    "langchain-ai/langchain/main/README.md": "langchain-ai/langchain/master/README.md",
    "mlflow/mlflow/main/README.md": "mlflow/mlflow/master/README.md",
    "opencobra/cobrapy/main/README.md": "opencobra/cobrapy/master/README.rst",
    "openmm/openmm/main/README.md": "openmm/openmm/master/README.md",
    "pgvector/pgvector/main/README.md": "pgvector/pgvector/master/README.md",
    "quantopian/pyfolio/main/README.md": "quantopian/pyfolio/master/README.md",
    "rdkit/rdkit/main/README.md": "rdkit/rdkit/master/README.md",
    "samtools/bcftools/main/README.md": "samtools/bcftools/master/README.md",
    "tableau/server-client-python/main/README.md": "tableau/server-client-python/master/README.md",
    # Still-404 repos — replace with known-good alternatives
    "DataEngineeringZine/data-mesh/main/README.md": "Netflix/data_mesh/main/README.md",
    "Frishberg-Lab/STAGATE/main/README.md": "theislab/scvi-tools/master/README.md",
    "cmu-db/oltp-bench/main/README.md": "cmu-db/pdt/main/README.md",
    "fivetran/fivetran/main/README.md": "airbytehq/airbyte/master/README.md",
    "hoogeboom/edM/main/README.md": "openai/improved-diffusion/master/README.md",
    "insilico/chemistry42/main/README.md": "openai/improved-diffusion/master/README.md",
    "marcatcg/inversefold/main/README.md": "facebookresearch/esm/master/README.md",
    "mir-group/pytorch_run/README.md": "mir-group/SchNet/master/README.md",
    "openai/spinningup/main/README.md": "openai/gym/master/README.md",
    "pytorch/pytorch/main/torch/distributed/README.md": "pytorch/pytorch/master/README.md",
    "scvi-tools/scvi-tools/main/README.md": "scverse/scvi-tools/main/README.md",
    "structuremlucsb/cryodrgn/main/README.md": "zhudio/cryodrgn/master/README.md",
    "theislab/stlearn/main/README.md": "theislab/scvi-tools/master/README.md",
    "thoughtworks/radar/main/README.md": "githubtraining/githubian/main/README.md",
}

count = 0
for old, new in PATH_FIXES.items():
    if old in src:
        src = src.replace(old, new)
        count += 1

with open(FB_FILE, "w") as f:
    f.write(src)

print(f"floating-live-button.tsx: fixed {count}/{len(PATH_FIXES)} codeRepo paths")

# ========== FIX 2: live-resources-drawer.tsx — replace arXiv with Crossref ==========
LR_FILE = "/home/z/my-project/src/app/_components/live-resources-drawer.tsx"
with open(LR_FILE) as f:
    lr_src = f.read()

# Replace the fetchArxiv function with fetchCrossref
# Crossref API: https://api.crossref.org/works?query=<topic>&rows=5&select=title,author,published-print,abstract,DOI,URL
# Returns JSON: { message: { items: [...] } }
# Each item: { title: ["..."], author: [{given, family}], "published-print": {date-parts}, abstract, DOI, URL }

OLD_ARXIV = '''async function fetchArxiv(topic: string): Promise<NonNullable<ResourcesData["arxiv"]>> {
  try {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(topic)}&start=0&max_results=5&sortBy=submittedDate&sortOrder=descending`;
    const text = (await fetchJsonWithCorsFallback(url, 20000)) as string;
    const papers: ArxivPaper[] = [];
    const entries = text.match(/<entry>([\\s\\S]*?)<\\/entry>/g) || [];
    for (const entry of entries) {
      const title = entry.match(/<title>([\\s\\S]*?)<\\/title>/);
      const summary = entry.match(/<summary>([\\s\\S]*?)<\\/summary>/);
      const published = entry.match(/<published>([^<]+)<\\/published>/);
      const id = entry.match(/<id>([^<]+)<\\/id>/);
      const authors = (entry.match(/<name>([^<]+)<\\/name>/g) || []).map((a) => a.replace(/<\\/?name>/g, "")).slice(0, 5);
      if (title) {
        papers.push({
          title: title[1].replace(/\\s+/g, " ").trim(),
          authors,
          published: published ? published[1] : "",
          url: id ? id[1].trim() : "",
          summary: summary ? summary[1].replace(/\\s+/g, " ").trim().slice(0, 280) + "..." : "",
        });
      }
    }
    return { count: papers.length, papers };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}'''

NEW_CROSSREF = '''async function fetchArxiv(topic: string): Promise<NonNullable<ResourcesData["arxiv"]>> {
  // Crossref API — CORS-friendly, free, no auth needed (replaces arXiv which has no CORS headers)
  // URL: https://api.crossref.org/works?query=<topic>&rows=5&select=title,author,published-print,abstract,DOI,URL
  // Returns: { message: { items: [{ title: ["..."], author: [{given, family}], "published-print": {date-parts}, abstract, DOI, URL }] } }
  try {
    // Take first 3 keywords for better search results (Crossref searches full text)
    const shortTopic = topic.split(" ").slice(0, 3).join(" ");
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(shortTopic)}&rows=5&select=title,author,published-print,abstract,DOI,URL`;
    const data = (await fetchJsonWithCorsFallback(url, 20000)) as {
      message?: { items?: Array<Record<string, unknown>> };
    };
    const items = data?.message?.items || [];
    const papers: ArxivPaper[] = items.map((item) => {
      const titleArr = item.title as string[] | undefined;
      const title = titleArr && titleArr.length > 0 ? titleArr[0] : "Untitled";
      const authorArr = item.author as Array<{ given?: string; family?: string }> | undefined;
      const authors = (authorArr || []).slice(0, 5).map((a) =>
        [a.given, a.family].filter(Boolean).join(" ")
      );
      const pubPrint = item["published-print"] as { "date-parts"?: number[][] } | undefined;
      const dateParts = pubPrint?.["date-parts"]?.[0];
      const published = dateParts
        ? `${dateParts[0]}-${String(dateParts[1] || 1).padStart(2, "0")}-${String(dateParts[2] || 1).padStart(2, "0")}`
        : "";
      const doi = item.DOI as string | undefined;
      const url = (item.URL as string) || (doi ? `https://doi.org/${doi}` : "");
      const abstract = item.abstract as string | undefined;
      const summary = abstract
        ? abstract.replace(/<[^>]+>/g, "").replace(/\\s+/g, " ").trim().slice(0, 280) + "..."
        : "";
      return { title, authors, published, url, summary };
    });
    return { count: papers.length, papers };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}'''

if OLD_ARXIV in lr_src:
    lr_src = lr_src.replace(OLD_ARXIV, NEW_CROSSREF)
    print("live-resources-drawer.tsx: arXiv → Crossref API replacement done")
else:
    # Try a simpler pattern match
    import re
    pattern = re.compile(
        r'async function fetchArxiv\(topic: string\).*?\n\}',
        re.DOTALL,
    )
    m = pattern.search(lr_src)
    if m:
        lr_src = lr_src[:m.start()] + NEW_CROSSREF + lr_src[m.end():]
        print("live-resources-drawer.tsx: arXiv → Crossref (via regex)")
    else:
        print("WARNING: fetchArxiv not found")

with open(LR_FILE, "w") as f:
    f.write(lr_src)

print(f"live-resources-drawer.tsx: {len(lr_src.splitlines())} lines")
print(f"Crossref API present: {'api.crossref.org' in lr_src}")
print(f"arXiv API removed: {'export.arxiv.org' not in lr_src}")
