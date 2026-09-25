#!/usr/bin/env bash
# sync-session-to-repo.sh
#
# One-shot helper: copy the session worklog entries and any new session scripts
# into the app repo, then commit and push to private/main.
#
# This is the "always" workflow the user requested: every code change, script,
# and worklog entry must live in the private repository so the work is
# recoverable from any clone.
#
# Algorithm:
#   1. Copy any new/updated scripts from the session scripts dir.
#   2. For the worklog, use a SIMPLE grep-based missing-entry detection:
#      for each Task ID in the session log, if it's NOT in the repo worklog,
#      find its block (from the --- separator BEFORE it to the next --- separator)
#      and append it. This is more robust than the previous awk-based approach,
#      which had a bug that caused mass duplication.
#   3. Commit + push to private/main.
#
# Safety:
#   - Idempotent: re-running it after no changes is a no-op.
#   - Never duplicates a Task ID that's already in the repo (per grep check).
#   - Skips blocks whose Task ID is already in the repo.

set -euo pipefail

APP_REPO="${APP_REPO:-/home/z/appdatasci2}"
SESSION_LOG="${SESSION_LOG:-/home/z/my-project/worklog.md}"
SESSION_SCRIPTS_DIR="${SESSION_SCRIPTS_DIR:-/home/z/my-project/scripts}"

if [ ! -d "$APP_REPO/.git" ]; then
  echo "ERROR: $APP_REPO is not a git repo" >&2
  exit 1
fi
if [ ! -f "$SESSION_LOG" ]; then
  echo "ERROR: session worklog not found at $SESSION_LOG" >&2
  exit 1
fi

cd "$APP_REPO"

# 1. Sync scripts.
NEW_SCRIPTS=0
if [ -d "$SESSION_SCRIPTS_DIR" ]; then
  mkdir -p scripts
  for f in "$SESSION_SCRIPTS_DIR"/*.py "$SESSION_SCRIPTS_DIR"/*.sh "$SESSION_SCRIPTS_DIR"/*.txt; do
    [ -e "$f" ] || continue
    base=$(basename "$f")
    if [ ! -f "scripts/$base" ] || ! diff -q "$f" "scripts/$base" > /dev/null 2>&1; then
      cp "$f" "scripts/$base"
      echo "  ~ synced scripts/$base"
      NEW_SCRIPTS=$((NEW_SCRIPTS + 1))
    fi
  done
fi

# 2. Append missing worklog entries.
WORKLOG_ADDED=0
if [ -f worklog.md ]; then
  # Build a list of Task IDs in the repo worklog.
  repo_ids_file=$(mktemp)
  grep "^Task ID: " worklog.md | sed 's/^Task ID: //' | sort -u > "$repo_ids_file"

  # For each Task ID in the session log, check if it's missing from the repo.
  # If missing, extract its block and append.
  session_ids_file=$(mktemp)
  grep "^Task ID: " "$SESSION_LOG" | sed 's/^Task ID: //' > "$session_ids_file"

  new_blocks_file=$(mktemp)
  while IFS= read -r id; do
    # Skip if already in repo.
    if grep -qxF "$id" "$repo_ids_file"; then
      continue
    fi

    # Find the line of "Task ID: $id" in the session log.
    task_line=$(grep -n "^Task ID: $id$" "$SESSION_LOG" | head -1 | cut -d: -f1)
    if [ -z "$task_line" ]; then continue; fi

    # Find the --- separator that PRECEDES this Task ID line.
    sep_line=$(awk -v tl="$task_line" 'NR < tl && /^---$/ {last=NR} END {print last}' "$SESSION_LOG")

    # Find the next --- separator AFTER this Task ID line (or EOF).
    next_sep_line=$(awk -v tl="$task_line" 'NR > tl && /^---$/ {print NR; exit}' "$SESSION_LOG")
    if [ -z "$next_sep_line" ]; then
      # No next separator — go to end of file.
      end_line=$(wc -l < "$SESSION_LOG")
    else
      # Stop one line BEFORE the next --- separator (so we don't include it).
      end_line=$((next_sep_line - 1))
    fi

    # Extract the block (from sep_line to end_line, inclusive).
    echo "  + adding entry: $id"
    awk -v s="$sep_line" -v e="$end_line" 'NR >= s && NR <= e' "$SESSION_LOG" >> "$new_blocks_file"
    echo "" >> "$new_blocks_file"
  done < "$session_ids_file"

  if [ -s "$new_blocks_file" ]; then
    added_lines=$(wc -l < "$new_blocks_file")
    cat "$new_blocks_file" >> worklog.md
    WORKLOG_ADDED=1
    echo "  + appended $added_lines lines of new task entries to worklog.md"
  fi
  rm -f "$repo_ids_file" "$session_ids_file" "$new_blocks_file"
fi

# 3. Commit + push.
git add -A
if git diff --cached --quiet; then
  echo "Nothing to commit — everything already in sync."
  exit 0
fi

MSG_LINES=("chore: sync session worklog + scripts to private repo")
MSG_LINES+=("")
if [ $NEW_SCRIPTS -gt 0 ]; then
  MSG_LINES+=("- $NEW_SCRIPTS new/updated scripts synced")
fi
if [ $WORKLOG_ADDED -eq 1 ]; then
  MSG_LINES+=("- worklog appended with new task entries")
fi
MSG_LINES+=("")
MSG_LINES+=("This is the 'always sync' workflow — every session's scripts and worklog")
MSG_LINES+=("entries must live in the private repo so work is recoverable from any clone.")

printf '%s\n' "${MSG_LINES[@]}" > /tmp/sync_msg.txt
git commit -F /tmp/sync_msg.txt > /dev/null
rm -f /tmp/sync_msg.txt
git push private main
echo "Pushed to private/main."
