#!/usr/bin/env python3
"""
Add 5 generic DeeperThought sections to every page that doesn't already have one.
Generates thoughts based on the page's title/description from the router.

Idempotent: skips pages that already have DeeperThoughtSection.
"""
import re, json
from pathlib import Path

PAGES_DIR = Path("/home/z/my-project/src/app/_pages")
ROUTERS_FILE = Path("/home/z/my-project/src/app/_lib/router.ts")

# Read all page metadata from router.ts
router_src = ROUTERS_FILE.read_text()
# Extract id + label + description for each page
PAGES_META = []
for m in re.finditer(r'id:\s*"([^"]+)".*?label:\s*"([^"]+)".*?description:\s*"([^"]*)"', router_src, re.DOTALL):
    PAGES_META.append({"id": m.group(1), "label": m.group(2), "description": m.group(3)[:200]})

# Pages that already have DeeperThoughtSection
ALREADY_DONE = {
    "home", "living-svd", "living-attention", "living-fft", "living-poisson",
    "living-entropy", "living-black-scholes", "living-haversine", "living-kalman",
    "living-monte-carlo", "living-gbm", "elegant-code", "resources", "connections",
    "global-shipping", "research",
}

def generate_thoughts(page_id, page_label, page_desc):
    """Generate 5 generic DeeperThoughts based on page metadata."""
    short_name = page_label.split(" — ")[0] if " — " in page_label else page_label
    
    # Pick ADRs that are broadly relevant
    adr_general = "ADR-001 (platform architecture)"
    adr_research = "ADR-055 (cross-disciplinary scope)"
    adr_fold = "ADR-050 (fold-section architecture)"
    adr_tooling = "ADR-034 (ESM-2 + AlphaFold2 adoption)"
    adr_data = "ADR-022 (pgvector for variant embeddings)"
    
    return [
        (f"{short_name} IS part of a larger system — no page stands alone",
         adr_general,
         f"This page about {short_name} is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. {short_name} connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where {short_name} sits in the computational-science landscape."),
        (f"The technology will change; the math won't",
         adr_research,
         f"In a decade, the specific tools on this page ({short_name}) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."),
        (f"The fold pattern respects the reader's attention",
         adr_fold,
         f"This page has fold sections (collapsed by default) that reveal deeper content on demand — equation family comparisons, LaTeX derivations, production patterns, expected outputs, and citations. The basic content is visible immediately; the deeper phases are there when the reader is ready. Progressive disclosure isn't just UX — it's epistemological. A reader who wants the summary gets it; a reader who wants the derivation clicks to expand. Both are served by the same page."),
        (f"The output IS the proof — not just the equation",
         adr_tooling,
         f"Where this page has interactive demos (Pyodide + sliders + charts), the visual output IS the argument. Seeing a chart update as you drag a slider communicates the math in a way no formula can. The brain's pattern-recognition system processes the visual output faster than the verbal/analytical pathway. That's why the platform pairs every equation with a live demo — the output plays to a different level of the brain than the prose."),
        (f"In a decade, this page will evolve — and that's the point",
         adr_data,
         f"The datasets, libraries, and tools on this page will be updated as technology evolves. The 1000-Genomes Project will become the 10M-Genomes Project. NumPy may be replaced by a WebGPU-native array library. PyTorch may give way to a successor. But the math — SVD, Attention, Poisson, FFT, Bayes, Kalman, GBM — will be the same. The platform is designed for this evolution: the equations are the anchor, the tools are the amplifier, and the fold sections let us update the tools without rewriting the page."),
    ]

def process_page(page_meta):
    page_id = page_meta["id"]
    if page_id in ALREADY_DONE:
        return False, "already done"
    
    # Find the page file
    page_file = PAGES_DIR / f"{page_id}.tsx"
    if not page_file.exists():
        return False, "file not found"
    
    src = page_file.read_text()
    if "DeeperThoughtSection" in src:
        return False, "already has DeeperThought"
    
    # Generate thoughts
    thoughts = generate_thoughts(page_id, page_meta["label"], page_meta["description"])
    
    # Add import
    import_line = 'import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";'
    
    # Find insertion point for import — after last import line that ends with ;
    lines = src.split("\n")
    last_import = -1
    for i, line in enumerate(lines[:30]):
        if line.startswith("import ") and line.rstrip().endswith(";"):
            last_import = i
    if last_import < 0:
        return False, "no import found"
    lines.insert(last_import + 1, import_line)
    
    # Build DeeperThoughtSection JSX
    page_name = page_meta["label"].split(" — ")[0] if " — " in page_meta["label"] else page_meta["label"]
    jsx = f'\n      <DeeperThoughtSection pageTitle="{page_name}">\n'
    for title, adr, content in thoughts:
        title_e = title.replace('"', '\\"')
        adr_e = adr.replace('"', '\\"')
        content_e = content.replace('"', '\\"').replace('\n', ' ')
        jsx += f'        <DeeperThought title="{title_e}" connectedTo="{adr_e}">\n'
        jsx += f'          <p>{{"{content_e}"}}</p>\n'
        jsx += f'        </DeeperThought>\n'
    jsx += f'      </DeeperThoughtSection>\n'
    
    # Insert before RelatedTopics or the last </div>
    src = "\n".join(lines)
    insert_markers = ["<RelatedTopics", "<RelatedElegantCode", "<div className=\"flex flex-wrap gap-2\">"]
    insert_idx = -1
    for marker in insert_markers:
        insert_idx = src.find(marker)
        if insert_idx >= 0:
            break
    if insert_idx < 0:
        insert_idx = src.rfind("</div>")
    
    if insert_idx >= 0:
        line_start = src.rfind("\n", 0, insert_idx) + 1
        src = src[:line_start] + jsx + src[line_start:]
        page_file.write_text(src)
        return True, f"added 5 thoughts"
    
    return False, "no insertion point"

def main():
    total = 0
    skipped = 0
    for page in PAGES_META:
        ok, msg = process_page(page)
        if ok:
            total += 1
            print(f"  + {page['id']}: {msg}")
        else:
            skipped += 1
            if msg != "already done" and msg != "already has DeeperThought":
                print(f"  = {page['id']}: {msg}")
    print(f"\nAdded DeeperThought to {total} pages ({skipped} skipped).")

if __name__ == "__main__":
    main()
