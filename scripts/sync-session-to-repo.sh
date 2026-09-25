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
# Usage: bash /home/z/my-project/scripts/sync-session-to-repo.sh
#
# Algorithm:
#   1. Copy any new/updated scripts from the session scripts dir.
#   2. For the worklog, split the session log into "task entry" blocks (each
#      starts with a `---` separator and a `Task ID:` line). For each block,
#      check if its Task ID is already in the repo's worklog. If not, append
#      the block. This avoids the bug where "append everything from the first
#      missing entry" would duplicate entries that are already present later
#      in the session log.
#   3. Commit + push to private/main.
#
# Safety:
#   - Idempotent: re-running it after no changes is a no-op.
#   - Never overwrites newer content in the app repo with older content from
#     the session log — it only APPENDS new task entries, never edits or
#     reorders existing ones.
#   - Never duplicates a Task ID that's already in the repo.

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

# 1. Sync scripts — copy any new or updated scripts from the session dir.
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

# 2. Append any new task entries from the session worklog that aren't yet in
#    the repo's worklog. We split the session log into "task entry" blocks
#    (each starts with a `---` line followed by a `Task ID:` line) and append
#    each missing block individually.
WORKLOG_ADDED=0
if [ -f worklog.md ]; then
  # Build a temp file of all repo Task IDs (one per line, no "Task ID: " prefix).
  repo_ids_file=$(mktemp)
  grep "^Task ID: " worklog.md | sed 's/^Task ID: //' | sort -u > "$repo_ids_file"

  # Split the session log into blocks. Each block starts at a `---` line that
  # is immediately followed by a `Task ID:` line. We use awk to emit one block
  # per missing Task ID to a temp file, then concatenate.
  new_blocks_file=$(mktemp)
  awk -v repo_ids_file="$repo_ids_file" '
    BEGIN {
      while ((getline line < repo_ids_file) > 0) {
        repo_ids[line] = 1
      }
      close(repo_ids_file)
      in_block = 0
      current_id = ""
      block_buf = ""
    }
    /^---$/ {
      # If we were in a block, emit it (only if its Task ID is missing).
      if (in_block && current_id != "" && !(current_id in repo_ids)) {
        print block_buf >> new_blocks_file
      }
      # Start a new block.
      in_block = 1
      block_buf = $0 "\n"
      current_id = ""
      next
    }
    {
      if (in_block) {
        block_buf = block_buf $0 "\n"
        if ($0 ~ /^Task ID: /) {
          current_id = substr($0, 11)
        }
      }
    }
    END {
      if (in_block && current_id != "" && !(current_id in repo_ids)) {
        print block_buf >> new_blocks_file
      }
    }
  ' new_blocks_file="$new_blocks_file" "$SESSION_LOG"

  if [ -s "$new_blocks_file" ]; then
    added_lines=$(wc -l < "$new_blocks_file")
    cat "$new_blocks_file" >> worklog.md
    WORKLOG_ADDED=1
    echo "  + appended $added_lines lines of new task entries to worklog.md"
  fi
  rm -f "$repo_ids_file" "$new_blocks_file"
fi

# 3. Commit + push if there's anything to commit.
git add -A
if git diff --cached --quiet; then
  echo "Nothing to commit — everything already in sync."
  exit 0
fi

# Build a short commit message.
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
