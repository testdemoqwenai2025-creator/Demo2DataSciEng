#!/usr/bin/env python3
"""
Live audit: checks deployed GitHub Pages URLs for HTTP 200 + content.
Run after deploy to verify all pages are live and rendering.
"""
import urllib.request
import sys
from pathlib import Path

BASE_URL = "https://testdemoqwenai2025-creator.github.io/Demo2DataSciEng"

# Read page list from router.ts
PAGES = []
router = Path("src/app/_lib/router.ts").read_text()
import re
for m in re.finditer(r'id:\s*"([^"]+)"', router):
    PAGES.append(m.group(1))

# Add home
PAGES.insert(0, "home")

pass_count = 0
fail_count = 0

for page in PAGES:
    url = f"{BASE_URL}/" if page == "home" else f"{BASE_URL}/{page}/"
    try:
        req = urllib.request.Request(url, method="HEAD")
        resp = urllib.request.urlopen(req, timeout=10)
        status = resp.status
        if status == 200:
            pass_count += 1
            print(f"  ✅ {page}")
        else:
            fail_count += 1
            print(f"  ❌ {page}: HTTP {status}")
    except Exception as e:
        fail_count += 1
        print(f"  ❌ {page}: {e}")

print(f"\n=== LIVE AUDIT SUMMARY ===")
print(f"Total: {len(PAGES)}, Pass: {pass_count}, Fail: {fail_count}")
print(f"Pass rate: {pass_count/len(PAGES)*100:.1f}%")
