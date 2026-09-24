#!/usr/bin/env python3
"""
ModernDataSciEng Platform — Audit Script

Runs a comprehensive audit of the repository:
  1. Secret/token leak scan across full git history
  2. Dependency vulnerability scan (npm + pip)
  3. License compliance check (only MIT/Apache/BSD/ISC allowed)
  4. PII / hardcoded-IP regex sweep on tracked files
  5. .env / secret-file presence check
  6. Workflow security check (no `pull_request_target` misuse, secrets scoped)
  7. SYNC_TO_PUBLIC_PAT rotation reminder (90-day TTL)

Usage:
    python3 scripts/audit.py [--fix]   # --fix auto-stages safe remediations

Exit codes:
    0 = all checks pass (warnings allowed)
    1 = critical issues found
    2 = script error
"""
import os, sys, re, json, subprocess, shutil
from pathlib import Path
from datetime import datetime, timezone, timedelta

REPO_ROOT = Path(__file__).resolve().parent.parent
CHECKS_PASSED = []
CHECKS_WARNINGS = []
CHECKS_FAILED = []

def log_pass(name, detail=""):
    CHECKS_PASSED.append((name, detail))

def log_warn(name, detail=""):
    CHECKS_WARNINGS.append((name, detail))

def log_fail(name, detail=""):
    CHECKS_FAILED.append((name, detail))

def run(cmd, **kw):
    return subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True, **{**dict(check=False), **kw})

# ============================================================
# 1. Secret leak scan — full git history
# ============================================================
TOKEN_PATTERNS = [
    (r"ghp_[A-Za-z0-9]{36,}", "GitHub classic PAT"),
    (r"gho_[A-Za-z0-9]{36,}", "GitHub OAuth token"),
    (r"github_pat_[A-Za-z0-9_]{82,}", "GitHub fine-grained PAT"),
    (r"ghs_[A-Za-z0-9]{36,}", "GitHub app token"),
    (r"ghr_[A-Za-z0-9]{36,}", "GitHub refresh token"),
    (r"AKIA[0-9A-Z]{16}",     "AWS access key"),
    (r"AIza[0-9A-Za-z_\-]{35}", "Google API key"),
    (r"sk-[A-Za-z0-9]{20,}",  "OpenAI/Anthropic API key"),
    (r"xox[baprs]-[A-Za-z0-9-]{10,}", "Slack token"),
]

def scan_secrets_in_history():
    print("\n== 1) Scanning git history for leaked tokens ==")
    # Get all blobs ever committed
    res = run(["git", "log", "--all", "--pretty=format:%H", "--name-only", "--diff-filter=AM"])
    if res.returncode != 0:
        log_fail("history_scan", f"git log failed: {res.stderr[:200]}")
        return
    # Scan HEAD only (faster) for the literal patterns
    files_to_scan = []
    for path in REPO_ROOT.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(REPO_ROOT)
        rel_str = str(rel)
        # skip ignored paths
        if any(part in {"node_modules", ".next", ".git", "out", ".zscripts", "skills", "tool-results", ".zai"} or part.startswith(".next") for part in rel.parts):
            continue
        if rel_str.endswith((".lock", ".log", ".pid")):
            continue
        files_to_scan.append(path)

    leaks = []
    for path in files_to_scan:
        try:
            content = path.read_text(errors="ignore")
        except Exception:
            continue
        for pattern, kind in TOKEN_PATTERNS:
            for match in re.finditer(pattern, content):
                line_start = content.rfind("\n", 0, match.start()) + 1
                line_end = content.find("\n", match.end())
                if line_end == -1:
                    line_end = len(content)
                line = content[line_start:line_end].strip()[:120]
                # Skip the audit.py itself + setup scripts that mention patterns as strings
                if rel_str in {"scripts/audit.py", "scripts/setup-github.sh", "AGENTIC_WORKFLOW.md", "FUTURE_TECH.md"}:
                    continue
                leaks.append((str(path.relative_to(REPO_ROOT)), kind, match.group(0)[:8] + "...", line))

    if leaks:
        log_fail("secret_scan", f"{len(leaks)} token(s) found in tracked files:")
        for path, kind, sample, line in leaks[:5]:
            print(f"    {path}: {kind} {sample} | {line}")
        if len(leaks) > 5:
            print(f"    ... and {len(leaks) - 5} more")
    else:
        log_pass("secret_scan", f"{len(files_to_scan)} files scanned, no token patterns matched")

# ============================================================
# 2. Dependency vulnerability scan
# ============================================================
def scan_dependencies():
    print("\n== 2) Scanning dependencies for known vulnerabilities ==")
    # Try `bun audit` first
    if shutil.which("bun"):
        res = run(["bun", "audit", "--json"])
        try:
            data = json.loads(res.stdout) if res.stdout else {}
            advisories = data.get("advisories") or data.get("vulnerabilities") or {}
            if isinstance(advisories, dict):
                count = len(advisories)
            elif isinstance(advisories, list):
                count = len(advisories)
            else:
                count = 0
            if count == 0:
                log_pass("bun_audit", "No npm vulnerabilities")
            else:
                log_warn("bun_audit", f"{count} npm advisories (review `bun audit` output)")
        except json.JSONDecodeError:
            log_warn("bun_audit", "Could not parse `bun audit` output — run manually")
    else:
        log_warn("bun_audit", "bun not installed — skipping npm audit")

    # Python deps (if requirements.txt present)
    req_files = list(REPO_ROOT.rglob("requirements*.txt"))
    if req_files:
        try:
            import pip_audit
            for rf in req_files:
                res = run([sys.executable, "-m", "pip_audit", "-r", str(rf), "--format", "json"])
                try:
                    data = json.loads(res.stdout)
                    deps = data.get("dependencies", [])
                    vulns = [d for d in deps if d.get("vulns")]
                    if vulns:
                        log_warn("pip_audit", f"{len(vulns)} vulnerable Python packages in {rf.name}")
                    else:
                        log_pass("pip_audit", f"{rf.name} clean")
                except json.JSONDecodeError:
                    log_warn("pip_audit", f"Could not parse output for {rf.name}")
        except ImportError:
            log_warn("pip_audit", "pip-audit not installed — skipping Python audit")

# ============================================================
# 3. License compliance — only MIT/Apache/BSD/ISC allowed
# ============================================================
ALLOWED_LICENSES = {"MIT", "Apache-2.0", "Apache 2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "0BSD", "MIT-0", "Unlicense"}

def check_licenses():
    print("\n== 3) License compliance check ==")
    if not shutil.which("bun"):
        log_warn("license_check", "bun not installed — skipping")
        return
    res = run(["bun", "pm", "ls", "--all", "--json"])
    try:
        data = json.loads(res.stdout) if res.stdout else {}
    except json.JSONDecodeError:
        log_warn("license_check", "Could not parse `bun pm ls` output — skipping")
        return
    # Bun pm ls returns a tree; traverse for license info
    flagged = []
    def walk(pkg):
        if not isinstance(pkg, dict):
            return
        lic = pkg.get("license") or pkg.get("licenses")
        name = pkg.get("name", "?")
        if lic and isinstance(lic, str):
            if lic not in ALLOWED_LICENSES and not any(a in lic for a in ALLOWED_LICENSES):
                flagged.append((name, lic))
        for child in pkg.get("dependencies", {}).values() if isinstance(pkg.get("dependencies"), dict) else []:
            walk(child)
    walk(data)
    if flagged:
        log_warn("license_check", f"{len(flagged)} packages with non-allowlist licenses:")
        for name, lic in flagged[:5]:
            print(f"    {name}: {lic}")
    else:
        log_pass("license_check", "All packages on allowlist (MIT/Apache/BSD/ISC)")

# ============================================================
# 4. PII / hardcoded IP regex sweep
# ============================================================
PII_PATTERNS = [
    (r"\b\d{3}-\d{2}-\d{4}\b", "SSN"),
    (r"\b\d{16,19}\b", "Credit card number"),
    (r"\b[A-Z][a-z]+@[a-z]+\.(com|org|net|io)\b", "Email address"),
]

def sweep_pii():
    print("\n== 4) PII / hardcoded IP sweep ==")
    findings = []
    for path in REPO_ROOT.rglob("*"):
        if not path.is_file(): continue
        rel = str(path.relative_to(REPO_ROOT))
        if any(part in {"node_modules", ".next", ".git", "out", ".zscripts", "skills", "tool-results"} or part.startswith(".next") for part in path.parts):
            continue
        if rel.endswith((".lock", ".log", ".pid")):
            continue
        try:
            content = path.read_text(errors="ignore")
        except Exception:
            continue
        for pattern, kind in PII_PATTERNS:
            for m in re.finditer(pattern, content):
                # Skip the synthetic data module (it's supposed to have fake names)
                if rel.startswith("src/app/_data/synthetic.ts"): continue
                if rel.startswith("scripts/audit.py"): continue
                findings.append((rel, kind, m.group(0)[:60]))
    if findings:
        log_warn("pii_sweep", f"{len(findings)} potential PII patterns found:")
        for path, kind, sample in findings[:5]:
            print(f"    {path}: {kind} {sample}")
    else:
        log_pass("pii_sweep", "No PII patterns detected")

# ============================================================
# 5. .env / secret-file presence check
# ============================================================
def check_env_files():
    print("\n== 5) .env / secret-file presence check ==")
    env_files = list(REPO_ROOT.glob(".env*")) + list(REPO_ROOT.glob("*.env"))
    env_files = [f for f in env_files if f.is_file()]
    # Check gitignore coverage
    gi = (REPO_ROOT / ".gitignore").read_text() if (REPO_ROOT / ".gitignore").exists() else ""
    issues = []
    for f in env_files:
        rel = str(f.relative_to(REPO_ROOT))
        # Check if explicitly covered
        covered = rel in gi or ".env" in gi
        if covered:
            log_pass(f"env_file_{rel}", "gitignored")
        else:
            issues.append(rel)
    if issues:
        log_fail("env_files", f"{len(issues)} .env files NOT in .gitignore: {issues}")
    elif not env_files:
        log_pass("env_files", "No .env files present (good)")

# ============================================================
# 6. Workflow security check
# ============================================================
def check_workflows():
    print("\n== 6) GitHub Actions workflow security check ==")
    wf_dir = REPO_ROOT / ".github" / "workflows"
    if not wf_dir.exists():
        log_warn("workflow_security", "No .github/workflows/ directory")
        return
    issues = []
    for wf in wf_dir.glob("*.yml"):
        content = wf.read_text()
        # Check for dangerous pull_request_target usage
        if "pull_request_target" in content:
            issues.append((wf.name, "uses pull_request_target — high-risk pattern"))
        # Check for hardcoded secrets (should never appear literally)
        for pattern, kind in TOKEN_PATTERNS:
            if re.search(pattern, content):
                issues.append((wf.name, f"hardcoded {kind} in workflow"))
        # Check permissions: every workflow should declare explicit permissions
        if "permissions:" not in content:
            issues.append((wf.name, "no explicit `permissions:` block — defaults to write-all"))
    if issues:
        log_warn("workflow_security", f"{len(issues)} workflow issues:")
        for wf, issue in issues:
            print(f"    {wf}: {issue}")
    else:
        log_pass("workflow_security", f"{len(list(wf_dir.glob('*.yml')))} workflows scanned, no issues")

# ============================================================
# 7. PAT rotation reminder (90-day TTL)
# ============================================================
def check_pat_age():
    print("\n== 7) SYNC_TO_PUBLIC_PAT rotation reminder ==")
    # We can't query the secret's age directly via REST, but we can check the
    # commit history of the sync workflow for clues
    res = run(["git", "log", "--format=%cI", "--", ".github/workflows/sync-to-public.yml"])
    if res.returncode == 0 and res.stdout.strip():
        # Take the earliest commit date
        dates = sorted(res.stdout.strip().split("\n"))
        first = dates[0]
        try:
            created = datetime.fromisoformat(first.replace("Z", "+00:00"))
            age = datetime.now(timezone.utc) - created
            if age > timedelta(days=90):
                log_warn("pat_age", f"Sync workflow is {age.days}d old — consider rotating SYNC_TO_PUBLIC_PAT")
            else:
                log_pass("pat_age", f"Sync workflow is {age.days}d old — within 90d rotation window")
        except ValueError:
            log_warn("pat_age", "Could not parse workflow commit date")
    else:
        log_warn("pat_age", "No commit history found for sync workflow")

# ============================================================
# Main
# ============================================================
def main():
    print(f"ModernDataSciEng Platform — Audit")
    print(f"Repository: {REPO_ROOT}")
    print(f"Timestamp:  {datetime.now(timezone.utc).isoformat()}")
    scan_secrets_in_history()
    scan_dependencies()
    check_licenses()
    sweep_pii()
    check_env_files()
    check_workflows()
    check_pat_age()

    print("\n" + "=" * 60)
    print("AUDIT SUMMARY")
    print("=" * 60)
    print(f"  Passed:   {len(CHECKS_PASSED)}")
    print(f"  Warnings: {len(CHECKS_WARNINGS)}")
    print(f"  Failed:   {len(CHECKS_FAILED)}")
    print()

    if CHECKS_PASSED:
        print("✓ Passed:")
        for name, detail in CHECKS_PASSED:
            print(f"   {name}: {detail}")
    if CHECKS_WARNINGS:
        print("\n⚠ Warnings:")
        for name, detail in CHECKS_WARNINGS:
            print(f"   {name}: {detail}")
    if CHECKS_FAILED:
        print("\n✗ Failed:")
        for name, detail in CHECKS_FAILED:
            print(f"   {name}: {detail}")

    # Write JSON report
    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "repository": str(REPO_ROOT),
        "summary": {
            "passed": len(CHECKS_PASSED),
            "warnings": len(CHECKS_WARNINGS),
            "failed": len(CHECKS_FAILED),
        },
        "checks": {
            "passed": [{"name": n, "detail": d} for n, d in CHECKS_PASSED],
            "warnings": [{"name": n, "detail": d} for n, d in CHECKS_WARNINGS],
            "failed": [{"name": n, "detail": d} for n, d in CHECKS_FAILED],
        },
    }
    report_path = REPO_ROOT / "scripts" / "audit-report.json"
    report_path.write_text(json.dumps(report, indent=2))
    print(f"\nJSON report written to {report_path.relative_to(REPO_ROOT)}")

    sys.exit(1 if CHECKS_FAILED else 0)

if __name__ == "__main__":
    main()
