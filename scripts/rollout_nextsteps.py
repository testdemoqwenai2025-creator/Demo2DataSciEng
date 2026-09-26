#!/usr/bin/env python3
"""
Rollout NextSteps to all pages that don't have it yet.

Strategy per page:
  1. Parse RelatedTopics (topics={[{id, reason}, ...]}) from the page source.
  2. Look up elegant-code cards hosted on this page (cardsOnHostPage).
  3. For each hosted card, find cousin cards (recommendedCards) and their
     OTHER host pages — these are the page-specific "cousin" suggestions.
  4. Build up to 3 NextSteps in this priority:
     a. ALWAYS include one navigation/orientation page (connections or
        elegant-code or resources) as the 1st suggestion — matches the
        existing pattern on living-svd.tsx.
     b. If the page hosts an elegant-code card, include one cousin-card
        host page (different domain, same math).
     c. Fill remaining slots from RelatedTopics (skipping duplicates).
     d. Fallback to {elegant-code, connections, resources} if nothing else.

Skip pages that already import NextSteps (10 living-equation pages +
elegant-code = 11 pages with NextSteps already).

Insertion pattern (matches living-svd.tsx exactly):
  import { NextSteps } from "../_components/next-steps";   <-- top of file
  ...
  <NextSteps relatedPages={[
    { id: "x" as const, reason: "..." },
    { id: "y" as const, reason: "..." },
    { id: "z" as const, reason: "..." },
  ]} />
  <div className="flex flex-wrap gap-2">   <-- existing link footer
    ...
  </div>
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path("/home/z/my-project")
PAGES_DIR = ROOT / "src/app/_pages"
ELEGANT_MAP = ROOT / "src/app/_lib/elegant-code-map.ts"

# ---------------------------------------------------------------------------
# Parse elegant-code-map.ts to get the hostPages for each card.
# ---------------------------------------------------------------------------

def parse_elegant_code_map() -> list[dict[str, Any]]:
    """Parse ELEGANT_CODE_MAP entries from the .ts source.
    Returns list of {cardIndex, name, hostPages, insightShort, sciences}."""
    text = ELEGANT_MAP.read_text()
    # Each card entry starts with `{ cardIndex: <n>,` and ends with `},`
    # We'll match by cardIndex, name, hostPages, insightShort, sciences.
    entries: list[dict[str, Any]] = []
    # Match each card block: from `cardIndex:` to the closing `},` of that card.
    card_pattern = re.compile(
        r"cardIndex:\s*(?P<idx>\d+),\s*"
        r'name:\s*"(?P<name>[^"]+)",\s*'
        r'equation:\s*"[^"]*",\s*'
        r'sciences:\s*\[(?P<sciences>[^\]]*)\],\s*'
        r'insightShort:\s*"(?P<insight>[^"]*)",\s*'
        r'hostPages:\s*\[(?P<hosts>[^\]]*)\],\s*'
        r'hostReasons:\s*\[(?P<reasons>[^\]]*)\],',
        re.DOTALL,
    )
    for m in card_pattern.finditer(text):
        # Parse the hosts array — list of quoted strings separated by commas.
        hosts_raw = m.group("hosts")
        host_ids = re.findall(r'"([^"]+)"', hosts_raw)
        sciences_raw = m.group("sciences")
        sciences = re.findall(r'"([^"]+)"', sciences_raw)
        entries.append({
            "cardIndex": int(m.group("idx")),
            "name": m.group("name"),
            "insightShort": m.group("insight"),
            "sciences": sciences,
            "hostPages": host_ids,
        })
    return entries


def parse_card_neighbors() -> dict[int, list[int]]:
    """Parse CARD_NEIGHBORS dict from elegant-code-map.ts."""
    text = ELEGANT_MAP.read_text()
    # Find the block: `const CARD_NEIGHBORS: Record<number, number[]> = { ... };`
    block_match = re.search(
        r"const CARD_NEIGHBORS[^=]+=\s*\{(?P<body>.*?)\};",
        text,
        re.DOTALL,
    )
    if not block_match:
        return {}
    body = block_match.group("body")
    # Each line: `  0: [3, 9, 19],` possibly with comments
    neighbors: dict[int, list[int]] = {}
    line_pattern = re.compile(r"^\s*(\d+):\s*\[([^\]]+)\]", re.MULTILINE)
    for m in line_pattern.finditer(body):
        idx = int(m.group(1))
        cousins = [int(x) for x in re.findall(r"\d+", m.group(2))]
        neighbors[idx] = cousins
    return neighbors


# ---------------------------------------------------------------------------
# Parse RelatedTopics from a page source file.
# ---------------------------------------------------------------------------

def parse_related_topics(source: str) -> list[dict[str, str]]:
    """Extract {id, reason} entries from a <RelatedTopics topics={[...]} /> block."""
    # Match `topics={[ ... ]}` — possibly spanning multiple lines.
    # The block ends at `]}` (closing of array + closing of JSX expression).
    block_match = re.search(r"topics=\{(?P<arr>\[.*?\])\}", source, re.DOTALL)
    if not block_match:
        return []
    arr_text = block_match.group("arr")
    # Each entry: { id: "..." as const, reason: "..." },
    entry_pattern = re.compile(
        r'\{\s*id:\s*"([^"]+)"\s*(?:as const)?\s*,\s*reason:\s*"([^"]*)"',
        re.DOTALL,
    )
    return [{"id": m.group(1), "reason": m.group(2)} for m in entry_pattern.finditer(arr_text)]


def parse_link_footer(source: str) -> list[str]:
    """Extract page ids from `<Link href={hrefFor("...")} ...>` chips in the
    trailing link-footer. These are the page author's hand-curated 'next'
    suggestions — useful as a fallback signal when RelatedTopics is empty."""
    # Match the trailing `<div className="flex flex-wrap gap-2">...</div>` block.
    footer_match = re.search(
        r'<div className="flex flex-wrap gap-2">(.*?)</div>',
        source,
        re.DOTALL,
    )
    if not footer_match:
        return []
    footer_body = footer_match.group(1)
    # hrefFor("page-id")
    return re.findall(r'hrefFor\("([^"]+)"\)', footer_body)


# ---------------------------------------------------------------------------
# Build per-page NextSteps suggestions.
# ---------------------------------------------------------------------------

# Pages that act as navigation hubs — always a good "where to go next" suggestion.
HUB_PAGES = ["connections", "elegant-code", "resources"]


def build_next_steps(
    page_id: str,
    related_topics: list[dict[str, str]],
    link_footer_ids: list[str],
    cards_on_this_page: list[dict[str, Any]],
    card_neighbors: dict[int, list[int]],
    all_cards: list[dict[str, Any]],
) -> list[dict[str, str]]:
    """Return up to 3 {id, reason} suggestions for NextSteps."""
    suggestions: list[dict[str, str]] = []
    seen_ids: set[str] = set()

    def add(pid: str, reason: str) -> None:
        if pid in seen_ids:
            return
        if len(suggestions) >= 3:
            return
        suggestions.append({"id": pid, "reason": reason})
        seen_ids.add(pid)

    # --- 1. Orientation / navigation suggestion (1st) ---
    # Pick the hub page that's NOT already in related topics — prefer "connections"
    # for pages hosting elegant-code cards, "resources" for content pages, "elegant-code"
    # for math-heavy pages.
    rt_ids = {rt["id"] for rt in related_topics}
    footer_ids_set = set(link_footer_ids)

    if cards_on_this_page:
        # Pages with elegant-code cards → "connections" makes most sense (cousin-card hub)
        if "connections" not in rt_ids and "connections" not in footer_ids_set:
            card_names = " · ".join(c["name"] for c in cards_on_this_page[:2])
            add("connections", f"See {card_names}'s cousin cards in the cross-disciplinary graph")
        elif "elegant-code" not in rt_ids and "elegant-code" not in footer_ids_set:
            add("elegant-code", "Browse all 20 elegant-code cards (cross-disciplinary math)")
    elif "connections" not in rt_ids and "connections" not in footer_ids_set:
        add("connections", "Trace this topic's connections across the platform's math graph")
    elif "elegant-code" not in rt_ids and "elegant-code" not in footer_ids_set:
        add("elegant-code", "See the cross-disciplinary math that powers this topic")

    # --- 2. Cousin-card host pages (different domain, same math) ---
    # For each card on this page, find its cousin cards, then find OTHER host pages.
    if cards_on_this_page and len(suggestions) < 3:
        for card in cards_on_this_page:
            if len(suggestions) >= 3:
                break
            cousin_indices = card_neighbors.get(card["cardIndex"], [])
            for cidx in cousin_indices:
                if len(suggestions) >= 3:
                    break
                cousin_card = next((c for c in all_cards if c["cardIndex"] == cidx), None)
                if not cousin_card:
                    continue
                # Find OTHER host pages (not this page) for the cousin card.
                for host_pid in cousin_card["hostPages"]:
                    if host_pid == page_id or host_pid in seen_ids:
                        continue
                    sciences = cousin_card.get("sciences", [])
                    science_hint = sciences[0] if sciences else "another domain"
                    add(
                        host_pid,
                        f"{cousin_card['name']} ({cousin_card['insightShort']}) — same math, {science_hint} domain",
                    )
                    break  # one host per cousin card

    # --- 3. Fill from RelatedTopics (skipping duplicates) ---
    for rt in related_topics:
        if len(suggestions) >= 3:
            break
        # Skip pure-navigation entries already covered above
        if rt["id"] in seen_ids:
            continue
        # Convert the related-topic reason into a forward-looking "next step" reason
        reason = rt["reason"]
        # Trim overly long reasons to a one-liner (~80 chars)
        if len(reason) > 90:
            # Cut at a sensible boundary
            reason = reason[:90].rsplit(" ", 1)[0] + "…"
        add(rt["id"], reason)

    # --- 3b. If still short, use link-footer chips as suggestions ---
    # (These are the page author's hand-curated "see also" links — good signal.)
    for fid in link_footer_ids:
        if len(suggestions) >= 3:
            break
        if fid in seen_ids:
            continue
        # Don't add if it's THIS page (avoid self-loop)
        if fid == page_id:
            continue
        # Generic reason — the link footer doesn't have explicit reasons.
        add(fid, f"Continue to {fid.replace('-', ' ')} — see also from this page")

    # --- 4. Fallback to the navigation trio if we're still short ---
    fallback_reasons = {
        "elegant-code": "Start with the 20 elegant-code cards — the platform's cross-disciplinary math",
        "connections": "See the card → card graph — how the platform's math connects",
        "resources": "Browse the curated datasets, papers, and libraries",
    }
    for pid in HUB_PAGES:
        if len(suggestions) >= 3:
            break
        add(pid, fallback_reasons[pid])

    return suggestions[:3]


# ---------------------------------------------------------------------------
# Render + insert NextSteps JSX into a page source file.
# ---------------------------------------------------------------------------

def render_next_steps_jsx(suggestions: list[dict[str, str]]) -> str:
    """Render the <NextSteps relatedPages={[...]} /> JSX (single line, matching living-svd.tsx)."""
    entries = ", ".join(
        f'{{ id: "{s["id"]}" as const, reason: "{s["reason"]}" }}'
        for s in suggestions
    )
    return f"<NextSteps relatedPages=[{entries}] />".replace("=[", "={[").replace("] />", "]} />")


def render_import_line() -> str:
    return 'import { NextSteps } from "../_components/next-steps";'


def insert_next_steps(source: str, suggestions: list[dict[str, str]]) -> str | None:
    """Insert the import line and the <NextSteps /> JSX element.
    Returns the modified source, or None if no insertion point found."""
    if not suggestions:
        return None

    if "next-steps" in source:
        # Already has NextSteps import — skip.
        return None

    new_source = source

    # --- 1. Insert the import line ---
    # Find the LAST existing import line and insert ours after it.
    # All existing pages import from "../_components/..." — match that pattern.
    import_match = re.search(
        r'(\nimport\s+\{[^}]+\}\s+from\s+"\.\./_components/[^"]+";\s*\n)',
        new_source,
    )
    if import_match:
        # Insert after the last _components import
        end = import_match.end()
        new_source = (
            new_source[:end]
            + render_import_line() + "\n"
            + new_source[end:]
        )
    else:
        # Fallback: insert after the first import line
        first_import = re.search(r'^import\s[^\n]+\n', new_source, re.MULTILINE)
        if first_import:
            end = first_import.end()
            new_source = (
                new_source[:end]
                + render_import_line() + "\n"
                + new_source[end:]
            )
        else:
            return None

    # --- 2. Insert the <NextSteps /> JSX ---
    # Target: just before the trailing `<div className="flex flex-wrap gap-2">` link footer.
    jsx = render_next_steps_jsx(suggestions)
    # Add proper indentation (6 spaces, matching the page's existing style)
    jsx_block = f"\n      {jsx}\n"

    # Look for the link footer pattern
    footer_match = re.search(
        r'(\n\s*)<div className="flex flex-wrap gap-2">',
        new_source,
    )
    if footer_match:
        insert_at = footer_match.start()
        new_source = (
            new_source[:insert_at]
            + jsx_block
            + new_source[insert_at:]
        )
    else:
        # Fallback: insert just before the closing </div> of the page wrapper.
        # Match `\n    </div>\n  );\n}` — the final close of the page wrapper.
        closing_match = re.search(r'(\n    </div>\s*\n  \);\s*\n\})', new_source)
        if closing_match:
            insert_at = closing_match.start()
            new_source = (
                new_source[:insert_at]
                + jsx_block
                + new_source[insert_at:]
            )
        else:
            # Last-resort fallback: insert before the final `);` of the function body.
            end_match = re.search(r'(\s*\n  \);\s*\n\})', new_source)
            if end_match:
                insert_at = end_match.start()
                new_source = (
                    new_source[:insert_at]
                    + jsx_block
                    + new_source[insert_at:]
                )
            else:
                # Couldn't find insertion point — revert import and bail.
                return None

    return new_source


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    all_cards = parse_elegant_code_map()
    print(f"Parsed {len(all_cards)} elegant-code cards")

    card_neighbors = parse_card_neighbors()
    print(f"Parsed {len(card_neighbors)} card-neighbor entries")

    # Build page → cards-hosted-here map (the inverse of hostPages).
    # (cardsOnHostPage is the same lookup.)
    page_to_cards: dict[str, list[dict[str, Any]]] = {}
    for card in all_cards:
        for pid in card["hostPages"]:
            page_to_cards.setdefault(pid, []).append(card)
    print(f"Page→cards map: {len(page_to_cards)} pages host at least one card")

    # Iterate over all page files.
    page_files = sorted(PAGES_DIR.glob("*.tsx"))
    print(f"Total page files: {len(page_files)}")

    # Mode: --rebuild will REMOVE existing NextSteps (import + JSX) and re-insert.
    rebuild_mode = "--rebuild" in sys.argv

    modified = 0
    skipped_already_has = 0
    skipped_no_insertion = 0
    failed: list[str] = []

    for pf in page_files:
        page_id = pf.stem
        source = pf.read_text()

        has_next_steps = "next-steps" in source or "NextSteps" in source

        if has_next_steps and not rebuild_mode:
            skipped_already_has += 1
            continue

        if has_next_steps and rebuild_mode:
            # Strip the existing NextSteps import + JSX so we can re-insert fresh.
            source = strip_next_steps(source)

        # Parse RelatedTopics
        related_topics = parse_related_topics(source)
        # Parse link-footer chips
        link_footer_ids = parse_link_footer(source)
        # Look up cards on this page
        cards_here = page_to_cards.get(page_id, [])

        # Build suggestions
        suggestions = build_next_steps(
            page_id=page_id,
            related_topics=related_topics,
            link_footer_ids=link_footer_ids,
            cards_on_this_page=cards_here,
            card_neighbors=card_neighbors,
            all_cards=all_cards,
        )

        if not suggestions:
            failed.append(f"{page_id}: no suggestions generated")
            continue

        # Insert
        new_source = insert_next_steps(source, suggestions)
        if new_source is None:
            skipped_no_insertion += 1
            failed.append(f"{page_id}: no insertion point found")
            continue

        pf.write_text(new_source)
        modified += 1
        print(f"  ✓ {page_id}: {len(suggestions)} steps ({', '.join(s['id'] for s in suggestions)})")

    print()
    print("=" * 60)
    print(f"Modified: {modified}")
    print(f"Skipped (already has NextSteps): {skipped_already_has}")
    print(f"Skipped (no insertion point): {skipped_no_insertion}")
    print(f"Failed: {len(failed)}")
    for f in failed:
        print(f"  - {f}")

    return 0 if not failed else 1


def strip_next_steps(source: str) -> str:
    """Remove the existing NextSteps import + JSX from a page source so we
    can re-insert fresh. Used in --rebuild mode."""
    # Remove the import line.
    source = re.sub(
        r'\nimport \{ NextSteps \} from "\.\./_components/next-steps";\n',
        "\n",
        source,
    )
    # Remove the JSX element. We render it as a single line:
    #   <NextSteps relatedPages={[{ id: "x" as const, reason: "..." }, ...]} />
    # Match the whole line (handles nested { } by being non-greedy on the line).
    source = re.sub(
        r'^\s*<NextSteps\s+relatedPages=\{.*?\}\s*/>\s*$\n?',
        "",
        source,
        flags=re.MULTILINE | re.DOTALL,
    )
    # Clean up any double-blank-lines we may have introduced.
    source = re.sub(r'\n{3,}', '\n\n', source)
    return source


if __name__ == "__main__":
    sys.exit(main())
