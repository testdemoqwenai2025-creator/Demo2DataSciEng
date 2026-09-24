# ModernDataSciEng Platform — Architecture Principles

This document captures the architectural decisions that shape the platform. It's written for the team that maintains it — when you're trying to decide "should this be inline or in a drawer?" or "should we lazy-load this?", the answer is here.

## Core principle: thin index, lazy depth

**The entire platform is a thin index; the depth lives in drawers that open on demand.**

Every page is a lightweight summary of the topic. Heavy content (code samples, live research data, ADRs, recommendations, datasets) loads only when users explicitly request it — by clicking a button that opens a drawer.

This is the **progressive disclosure + lazy evaluation** pattern, applied consistently. It's how Stripe Docs, Vercel Docs, and modern documentation platforms work.

### Why this pattern

1. **Page load time is O(1) per page** — not O(content). A page with 5 code samples × 200 lines each weighs the same as a page with no code samples, because the code lives in drawers.
2. **Memory usage is O(active drawers)** — not O(all content on the page). Unopened drawers contribute zero DOM nodes.
3. **Server bandwidth = the heavy content is fetched from CDN on demand** — the page HTML is small; the drawer content (live data from arXiv/GitHub/HF) is fetched when the user opens.
4. **User experience = scan first, dive deep where interested** — users see the surface, expand what matters to them.

### Where lazy evaluation applies

| Pattern | Component | What's lazy |
|---|---|---|
| Multi-language code samples | `MultiLangSamples` (drawer mode) | Code blocks only render when drawer opens |
| Live research data | `LiveResearchDrawer`, `LiveResourcesDrawer` | arXiv + GitHub + HF + PwC fetched on demand, cached 24h in localStorage |
| ADR list | `LazyList` (Knowledge Hub) | First 5 ADRs render; rest load on "Show more" |
| Stack inventory, file formats, free tier | `LazyList` (Modern Big Data) | First 5-6 rows render; rest load on click |
| Recommended next pages | `ContextualBandit` (drawer) | Thompson sampling only runs when drawer opens |
| Animated Knowledge Shorts | `KnowledgeShorts` | SVG diagrams animate when active; other shorts are static |
| Python execution | `PyodideRunner` | ~10MB Pyodide runtime lazy-loads from CDN on first "Run" click; cached singleton |
| Floating live button | `FloatingLiveButton` | Tooltip appears on first visit; dismissible; pulse stops after dismissal |

## The drawer architecture

Every drawer is a self-contained lazy-loaded unit:

```
Page (lightweight index)
├── SectionCard (summary + description)
│   └── Button trigger → opens drawer
│       └── Drawer (Sheet component)
│           ├── Header (title + description)
│           ├── Content (lazy-loaded on open)
│           │   ├── Fetches from CDN/API if needed
│           │   ├── Renders only when drawer is open
│           │   └── Caches in localStorage where appropriate
│           └── Footer (file types, links, actions)
```

### Drawer inventory

| Drawer | Component | What it contains | Lazy-fetch source |
|---|---|---|---|
| Multi-language code samples | `MultiLangSamples` (drawer mode) | 5+ language tabs × code blocks | None (code is in JS bundle) |
| Live research | `LiveResearchDrawer` | arXiv + GitHub + PwC + Semantic Scholar | Real API calls on open |
| Live resources | `LiveResourcesDrawer` | arXiv + GitHub + Hugging Face + PwC + raw GitHub code | Real API calls on open |
| Recommended pages | `ContextualBandit` | 5 Thompson-sampled page recommendations | localStorage bandit state |
| Knowledge Shorts | `KnowledgeShorts` | 10 animated SVG diagrams + subtitle reveals | None (all client-side) |
| Pyodide execution | `PyodideRunner` | Python output panel | Pyodide Wasm runtime from CDN |

## The lazy evaluation hierarchy

From least-lazy to most-lazy:

1. **Always render** — page headers, section titles, the floating button, the sidebar nav. These are the "index" — they must be there for the page to make sense.

2. **Render on page mount** — KPI cards, executive summaries, the section card titles. These are the "surface" — users see them immediately, they're cheap to render.

3. **Render on scroll** — `LazyList` with `autoLoadOnScroll` enabled. The first N items render; the next batch loads when the user scrolls near the bottom via IntersectionObserver.

4. **Render on click** — drawer triggers (buttons). The button is in the DOM; the drawer content isn't. Clicking loads the content.

5. **Fetch on open** — `LiveResearchDrawer`, `LiveResourcesDrawer`. The drawer opens → fetches real-time data from arXiv/GitHub/HF/PwC. Cached in localStorage for 24h.

6. **Compute on open** — `ContextualBandit`. Thompson sampling (Beta distribution via Marsaglia-Tsang Gamma) only runs when the drawer opens. Zero computation on page mount.

7. **Lazy-load Wasm on first use** — `PyodideRunner`. ~10MB Pyodide runtime loads from CDN on first "Run" click. Cached as a singleton promise — subsequent runs on any page are instant.

## The bandit architecture

Two Thompson sampling bandits power adaptive behaviour:

### 1. Knowledge Shorts bandit (`KnowledgeShorts` component)

- Per-short Beta(α, β) posterior in localStorage (`mdse-shorts-bandit-v1`)
- Wins: click + completion → α+1; Skips: skip → β+1
- Samples via Marsaglia-Tsang Gamma → Beta ratio
- Picks next short by max sampled posterior
- Persists across sessions

### 2. Page recommendations bandit (`ContextualBandit` component)

- Per-page Beta(α, β) posterior in localStorage (`mdse-pages-bandit-v1`)
- Wins: visiting a page → α+1; Losses: skipping a recommendation → β+1
- Contextual features:
  - Same-group boost: 1.5× multiplier on sampled posterior
  - Time-of-day: Analytics pages get 1.2× boost during morning hours (7-11am)
- Lazy: sampling only runs when the drawer opens (not on page mount)
- Persists across sessions — learns the user's navigation preferences

## The sync + deploy pipeline

```
Private repo (AppDataSci-Advanced)
  ↓ push to main
  ↓
sync-to-public.yml workflow
  ↓ force-push to public repo
  ↓
DemoAppDataSci (public)
  ↓ push to main
  ↓
deploy-pages.yml workflow
  ↓ build static export (GITHUB_PAGES=true)
  ↓ excludes src/app/api/ (Next.js export doesn't support API routes)
  ↓ deploy to GitHub Pages via actions/deploy-pages@v4
  ↓
https://testdemoqwenai2025-creator.github.io/DemoAppDataSci/
```

### Workflow guard

The sync workflow has a `if: github.repository == 'testdemoqwenai2025-creator/AppDataSci-Advanced'` guard — it only runs on the private repo, not on the public mirror (where it would try to "sync to itself" and fail without the secret).

## The routing architecture

15+ pages, each a real Next.js route (`src/app/<page-id>/page.tsx`).

- **No hash routing** — every page is a real URL (`/databricks`, not `/#/databricks`)
- **Backward compat** — old `#/databricks` URLs are auto-redirected to `/databricks` via a useEffect in AppShell
- **AppShell in layout.tsx** — wraps every route with sidebar + header + footer + floating button
- **Active route detection** — `usePathname()` in AppShell determines which sidebar entry is highlighted
- **404 page** — `not-found.tsx` for graceful handling

## The free-tier + open-source stack

The platform itself uses only free-tier + OSS:

- **Next.js 16** (MIT) — framework
- **Tailwind CSS 4** (MIT) — styling
- **shadcn/ui** (MIT) — component library
- **Recharts** (MIT) — charts
- **Framer Motion** (MIT) — animations
- **Pyodide** (Apache 2.0) — Python in Wasm
- **z-ai-web-dev-sdk** — LLM (dev only; static export excludes API routes)

The platform is deployed on **GitHub Pages** (free, 24/7/365, public, no NDA required).

## Future architecture moves

1. **WebContainer for Node** — TypeScript/JavaScript samples could run in-browser via WebContainer (full Node runtime in Wasm). Same lazy-load pattern as Pyodide.

2. **Adaptive drawer content** — extend the contextual bandit to drawer content. If a user always opens the "Code" tab first on Databricks but "Datasets" first on Knowledge, the drawer could default to that tab per page. Beta(α, β) on tab-open events per page.

3. **Serverless agent endpoint** — the `/api/agent-triage` route works on dev preview only (static export excludes API routes). A serverless deployment (Vercel/Cloudflare Workers) could make the agent work on the public site too.

4. **Cross-page memory** — the floating button currently resets its dismissed state on each page. A smarter version: remember "this user always dismisses the tooltip" → after 3 dismissals, never show it again.

5. **Carbon-aware scheduling** — for the dev preview (which runs a server), schedule the agent's LLM calls to times when grid carbon intensity is low. The static site doesn't have this issue (no server).

---

This document is the canonical reference for the platform's architecture. When in doubt: **lazy-load it, put it in a drawer, and make the page lightweight.**
