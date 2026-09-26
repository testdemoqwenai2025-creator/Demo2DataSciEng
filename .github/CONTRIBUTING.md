# Contributing to ModernDataSciEng Platform

## Guardrail Policy (effective 2024-09-25)

This repository has guardrails to protect against accidental data loss.
All contributors (human + AI agents) MUST follow these rules:

---

## 1. Branch Protection Rules

### `main` branch
- **No force-push** (`git push --force` is blocked)
- **No deletion** (the branch cannot be deleted)
- **All commits must be signed** (GPG or SSH signing)
- **PR review required** before merge (CODEOWNERS enforces this)

### `backup/stable-pre-break` branch
- **Immutable** — no pushes allowed except by repository owner
- **No deletion** — this is the recovery snapshot
- Created at commit `119e136` (2024-09-25)
- Purpose: recovery point if `main` is ever corrupted/reset

### Tags
- `stable-2024-09-25` — immutable tag at the stable snapshot
- Tags cannot be deleted or moved

---

## 2. Protected Files (CODEOWNERS)

The following files require explicit review before changes:

- `.github/` — CI/CD workflows, CODEOWNERS, this CONTRIBUTING.md
- `next.config.ts` — Next.js build configuration
- `package.json` / `bun.lock` — dependency lockfile
- `src/app/_lib/router.ts` — page registry (adding pages requires review)
- `src/app/_components/app-shell.tsx` — sidebar navigation
- `worklog.md` — shared multi-agent work log (NEVER DELETE)
- `scripts/` — deploy + utility scripts
- `AGENTIC_WORKFLOW.md`, `ARCHITECTURE.md`, `SKILLS.md`, `FUTURE_TECH.md`

---

## 3. Worklog Protocol

The file `/worklog.md` is the **shared multi-agent work log**.

### Rules:
1. **NEVER delete** the worklog or any of its contents
2. **NEVER rewrite** — only APPEND new sections
3. Each new section MUST start with `---` (horizontal rule)
4. Each section MUST include:
   ```markdown
   ---
   Task ID: <task id>
   Agent: <agent name>
   Task: <description>

   Work Log:
   - <step 1>
   - <step 2>

   Stage Summary:
   - <results>
   ```
5. Before starting work, every agent MUST read `worklog.md` to understand
   what previous agents have done.

---

## 4. Recovery Procedure

If the repository is ever reset/corrupted:

1. **Check the backup branch:**
   ```bash
   git fetch --all
   git log backup/stable-pre-break --oneline -5
   ```

2. **Restore from backup:**
   ```bash
   git checkout main
   git reset --hard backup/stable-pre-break
   git push --force private main  # only if absolutely necessary
   ```

3. **Check the stable tag:**
   ```bash
   git log stable-2024-09-25 --oneline -5
   ```

4. **If backup branch is also missing**, the deployed GitHub Pages site
   at https://testdemoqwenai2025-creator.github.io/DemoAppDataSci/
   still has the last successful build artifacts (HTML/CSS/JS) that can
   be scraped for reference, but the source is lost.

---

## 5. Pre-Push Checklist (for AI agents)

Before running `git push`, verify:

- [ ] `git status` shows the expected files changed
- [ ] `git log --oneline -5` shows your commits on top of the expected base
- [ ] `worklog.md` has NOT been deleted or overwritten (only appended to)
- [ ] `router.ts` changes are intentional (adding new page IDs)
- [ ] No `--force` push to `main` (it's blocked anyway, but double-check)
- [ ] Static export build succeeds: `GITHUB_PAGES=true bun run build:static`
- [ ] Lint passes: `bunx eslint <changed-files> --max-warnings=0`

---

## 6. Deploy Workflow

The deploy workflow (`.github/workflows/deploy-pages.yml`) runs on every
push to `main`:

1. Moves `src/app/api/` out of the build path (API routes are incompatible
   with `output: export`)
2. Runs `GITHUB_PAGES=true bun run build:static`
3. Restores `src/app/api/`
4. Uploads `out/` to GitHub Pages

**If the build fails**, the deploy does NOT happen — the live site stays
at the previous successful build. This is intentional (fail-safe).

---

## 7. Sync Workflow

The sync workflow (`.github/workflows/sync-to-public.yml`) mirrors commits
from `private/main` (the source-of-truth repo: AppDataSci-Advanced) to
`public/main` (the preview repo: DemoAppDataSci).

This means:
- **Push to `private/main`** → sync mirrors to `public/main` → deploy builds
  `public/main` and publishes to GitHub Pages
- The `public` remote is a mirror; do NOT push directly to it unless
  the sync workflow is broken

---

## Questions?

Contact: testdemoqwenai2025@gmail.com
