#!/bin/bash
# ============================================================
# Pre-push guardrail — runs locally before every git push
# Protects: worklog.md (never deleted), .github/ (no unreviewed changes)
# ============================================================

protected_files=(
  "worklog.md"
  ".github/CODEOWNERS"
  ".github/CONTRIBUTING.md"
  ".github/workflows/deploy-pages.yml"
  ".github/workflows/sync-to-public.yml"
)

echo "🔍 Running pre-push guardrail checks..."

# Check if any protected file is being deleted
for file in "${protected_files[@]}"; do
  if git diff --cached --name-status | grep -q "^D.*$file"; then
    echo "❌ BLOCKED: Protected file '$file' is being deleted."
    echo "   If this is intentional, bypass with: git push --no-verify (NOT RECOMMENDED)"
    exit 1
  fi
done

# Check if worklog.md is being overwritten (not just appended to)
if git diff --cached --name-only | grep -q "^worklog.md$"; then
  # Count lines removed from worklog.md
  lines_removed=$(git diff --cached --numstat -- worklog.md | awk '{print $2}')
  if [ -n "$lines_removed" ] && [ "$lines_removed" -gt 0 ]; then
    echo "❌ BLOCKED: worklog.md has $lines_removed lines being REMOVED."
    echo "   The worklog is append-only (multi-agent shared log)."
    echo "   If this is intentional, bypass with: git push --no-verify (NOT RECOMMENDED)"
    exit 1
  fi
fi

# Check for force-push (should never happen to main)
remote_branch=$(echo "$2" | sed 's/.*heads\///')
if [ "$remote_branch" = "main" ]; then
  # Check if this is a force-push (local is behind remote)
  if [ -f ".git/MERGE_HEAD" ]; then
    echo "⚠️  WARNING: Pushing after a merge to main. Ensure no conflicts."
  fi
fi

echo "✅ Guardrail checks passed."
exit 0
