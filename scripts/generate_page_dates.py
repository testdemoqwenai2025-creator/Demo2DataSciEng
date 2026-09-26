#!/usr/bin/env python3
"""
Generate last-updated metadata for every page from git log.
Outputs a TS constant: src/app/_lib/page-dates.ts
"""
import subprocess, re, json
from pathlib import Path
from datetime import datetime

PAGES_DIR = Path("/home/z/my-project/src/app/_pages")
OUT_FILE = Path("/home/z/my-project/src/app/_lib/page-dates.ts")

def get_git_date(filepath):
    """Get the last commit date for a file from git log."""
    try:
        result = subprocess.run(
            ["git", "log", "-1", "--format=%cI", "--", str(filepath)],
            capture_output=True, text=True, cwd="/home/z/my-project"
        )
        if result.returncode == 0 and result.stdout.strip():
            iso_date = result.stdout.strip()
            dt = datetime.fromisoformat(iso_date.replace("Z", "+00:00"))
            return dt.strftime("%Y-%m-%d")
    except:
        pass
    return None

# Scan all page files.
entries = {}
for f in PAGES_DIR.glob("*.tsx"):
    date = get_git_date(f)
    if date:
        page_id = f.stem
        entries[page_id] = date

# Also check the layout/router for "home" date.
home_date = get_git_date("src/app/page.tsx") or get_git_date("src/app/_pages/home.tsx")
if home_date:
    entries["home"] = home_date

# Generate TS.
lines = [
    "// Auto-generated: last-updated dates from git log per page.",
    "// Updated by scripts/generate_page_dates.py",
    "export const PAGE_DATES: Record<string, string> = {",
]
for page_id in sorted(entries.keys()):
    lines.append(f'  "{page_id}": "{entries[page_id]}",')
lines.append("};")
lines.append("")

OUT_FILE.write_text("\n".join(lines))
print(f"Generated page-dates.ts: {len(entries)} pages with dates")
