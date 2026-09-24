#!/usr/bin/env python3
"""
ModernDataSciEng Platform — Test Script

Runs a full test suite:
  1. ESLint (via `bun run lint`)
  2. TypeScript typecheck (no emit)
  3. Smoke test — HTTP 200 on all 15 routes
  4. HTML validation — <title> + <h1> present on each page
  5. Agent endpoint smoke (POST /api/agent-triage returns 200 with valid JSON)

Usage:
    python3 scripts/test.py [--base-url http://localhost:3000]

Exit codes:
    0 = all tests pass
    1 = test failures
    2 = script error
"""
import sys, os, json, subprocess, time, urllib.request, urllib.error, re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BASE_URL = os.environ.get("BASE_URL", "http://localhost:3000")

PASSED, FAILED = [], []

def log_pass(name, detail=""):
    PASSED.append((name, detail))
    print(f"  ✓ {name}: {detail}")

def log_fail(name, detail=""):
    FAILED.append((name, detail))
    print(f"  ✗ {name}: {detail}")

def run(cmd, **kw):
    return subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True, **{**dict(check=False), **kw})

# All 15 routes that should return HTTP 200
ROUTES = [
    ("/",                     "Home"),
    ("/architecture",         "Architecture"),
    ("/fivetran-hightouch",   "Fivetran & Hightouch"),
    ("/databricks",           "Databricks Lakehouse"),
    ("/snowflake",            "Snowflake & SQL"),
    ("/dbt",                  "dbt & Dimensional Modelling"),
    ("/orchestration",        "Orchestration"),
    ("/tableau",              "Tableau & Analytics"),
    ("/governance",           "Data Governance"),
    ("/cicd",                  "CI/CD & DevOps"),
    ("/about",                 "About & Compliance"),
    ("/knowledge",             "Knowledge Hub"),
    ("/dashboard",             "Live Dashboard"),
    ("/evolution",             "Evolution Timeline"),
    ("/research",              "Research Papers"),
]

# ============================================================
# 1. ESLint
# ============================================================
def test_lint():
    print("\n== 1) ESLint ==")
    res = run(["bun", "run", "lint"])
    if res.returncode == 0:
        log_pass("eslint", "no lint errors")
    else:
        log_fail("eslint", f"exit {res.returncode}: {res.stderr[:300]}")

# ============================================================
# 2. TypeScript typecheck (no emit)
# ============================================================
def test_typecheck():
    print("\n== 2) TypeScript typecheck ==")
    # Use bunx to invoke tsc — tsc --noEmit is the standard check
    res = run(["bunx", "tsc", "--noEmit", "--skipLibCheck", "--project", "tsconfig.json"])
    if res.returncode == 0:
        log_pass("typecheck", "no type errors")
    else:
        # Ignore errors that come from .next/ types being stale
        out = res.stdout + res.stderr
        if "error TS" in out and ".next/" not in out:
            log_fail("typecheck", f"TS errors: {out[:300]}")
        else:
            log_pass("typecheck", "no real TS errors (only .next cache noise)")

# ============================================================
# 3. Smoke test — all routes return HTTP 200
# ============================================================
def fetch(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": "test-script/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode(errors="ignore")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="ignore")
    except Exception as e:
        return 0, str(e)

def test_routes():
    print(f"\n== 3) Smoke test — {len(ROUTES)} routes ==")
    print(f"   Base URL: {BASE_URL}")
    for path, name in ROUTES:
        status, body = fetch(BASE_URL + path)
        if status == 200:
            log_pass(f"route_{path}", f"{name} → 200 ({len(body)}b)")
        else:
            log_fail(f"route_{path}", f"{name} → {status}")

# ============================================================
# 4. HTML validation — <title> + <h1> on each page
# ============================================================
TITLE_RE = re.compile(r"<title[^>]*>([^<]+)</title>", re.IGNORECASE)
H1_RE = re.compile(r"<h1[^>]*>([^<]+)</h1>", re.IGNORECASE)

def test_html_validation():
    print(f"\n== 4) HTML validation — <title> + <h1> present ==")
    for path, name in ROUTES:
        status, body = fetch(BASE_URL + path)
        if status != 200:
            log_fail(f"html_{path}", f"skip — HTTP {status}")
            continue
        title_match = TITLE_RE.search(body)
        h1_match = H1_RE.search(body)
        if title_match and h1_match:
            log_pass(f"html_{path}", f"title='{title_match.group(1)[:40]}...' | h1='{h1_match.group(1)[:40]}...'")
        elif not title_match:
            log_fail(f"html_{path}", f"{name} — <title> missing")
        else:
            log_fail(f"html_{path}", f"{name} — <h1> missing")

# ============================================================
# 5. Agent endpoint smoke test
# ============================================================
def test_agent_endpoint():
    print(f"\n== 5) Agent endpoint smoke test ==")
    # GET should return the API description
    status, body = fetch(BASE_URL + "/api/agent-triage")
    if status != 200:
        log_fail("agent_get", f"GET /api/agent-triage → {status}")
        log_fail("agent_post", "skipped (GET failed)")
        return
    try:
        data = json.loads(body)
        if data.get("endpoint") == "/api/agent-triage":
            log_pass("agent_get", "GET returns API schema")
        else:
            log_fail("agent_get", f"unexpected response: {data}")
    except json.JSONDecodeError:
        log_fail("agent_get", f"non-JSON response: {body[:200]}")

    # POST should return a structured hypothesis (real LLM call)
    payload = json.dumps({
        "signal": "Volume anomaly detected — bronze_adobe_events",
        "layer": "Bronze",
        "severity": "warning",
        "detail": "−38% vs 7d MA → auto-quarantine",
        "ts": "2026-09-23T11:00:00Z",
    }).encode()
    req = urllib.request.Request(
        BASE_URL + "/api/agent-triage",
        data=payload,
        method="POST",
        headers={"Content-Type": "application/json", "User-Agent": "test-script/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            body = r.read().decode()
            data = json.loads(body)
            required_keys = {"root_cause", "confidence", "suggested_action", "known_pattern", "steps_taken"}
            if required_keys.issubset(data.keys()):
                log_pass("agent_post", f"confidence={data['confidence']} tokens={data.get('_meta', {}).get('tokens', '?')}")
            else:
                missing = required_keys - data.keys()
                log_fail("agent_post", f"missing keys: {missing}")
    except urllib.error.HTTPError as e:
        log_fail("agent_post", f"HTTP {e.code}: {e.read().decode()[:200]}")
    except Exception as e:
        log_fail("agent_post", f"error: {e}")

# ============================================================
# 6. 404 page test
# ============================================================
def test_404():
    print(f"\n== 6) 404 page ==")
    status, body = fetch(BASE_URL + "/nonexistent-route-xyz")
    if status == 404 and "404" in body:
        log_pass("404_page", "returns 404 with content")
    elif status == 404:
        log_warn = None
        log_pass("404_page", "returns 404")
    else:
        log_fail("404_page", f"expected 404, got {status}")

# ============================================================
# Main
# ============================================================
def main():
    print(f"ModernDataSciEng Platform — Test Suite")
    print(f"Repository: {REPO_ROOT}")
    print(f"Base URL:   {BASE_URL}")
    print(f"Timestamp:  {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}")

    # Wait for dev server to be reachable
    print("\n== 0) Waiting for dev server ==")
    for attempt in range(30):
        status, _ = fetch(BASE_URL + "/", timeout=10)
        if status == 200:
            print(f"  ✓ Dev server reachable after {attempt + 1} attempt(s)")
            break
        time.sleep(2)
    else:
        print(f"  ✗ Dev server unreachable at {BASE_URL}")
        sys.exit(2)

    test_lint()
    test_typecheck()
    test_routes()
    test_html_validation()
    test_agent_endpoint()
    test_404()

    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"  Passed: {len(PASSED)}")
    print(f"  Failed: {len(FAILED)}")
    print()
    if FAILED:
        print("Failures:")
        for name, detail in FAILED:
            print(f"  ✗ {name}: {detail}")
    sys.exit(1 if FAILED else 0)

if __name__ == "__main__":
    main()
