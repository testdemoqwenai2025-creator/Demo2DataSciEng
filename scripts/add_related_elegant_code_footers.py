#!/usr/bin/env python3
"""
Add the RelatedElegantCode footer + import to all 9 host pages.
The cross-disciplinary card on each host is uniquely identified by its comment
line `{/* Cross-disciplinary elegant-code card — X */}` (or `{/* cards — X+Y */}`
for numpy-scipy). We locate that comment, find the next `</SectionCard>`, and
insert the footer immediately after.
"""
import re
import sys
from pathlib import Path

ROOT = Path("/home/z/appdatasci2/src/app/_pages")
IMPORT_LINE = 'import { RelatedElegantCode } from "../_components/related-elegant-code";'
IMPORT_MARKER = 'import { hrefFor } from "../_lib/router";'

# host_page_id -> (comment_marker_substr, file_basename)
HOSTS = {
    "numpy-scipy":              ("Cross-disciplinary elegant-code cards — SVD + FFT", "numpy-scipy.tsx"),
    "transformer-deep-dive":    ("Cross-disciplinary elegant-code card — Attention", "transformer-deep-dive.tsx"),
    "bioinformatics-pipelines":("Cross-disciplinary elegant-code card — Poisson", "bioinformatics-pipelines.tsx"),
    "computational-biology":    ("Cross-disciplinary elegant-code card — Verlet", "computational-biology.tsx"),
    "computational-physics":    ("Cross-disciplinary elegant-code card — Navier-Stokes", "computational-physics.tsx"),
    "tabular":                  ("Cross-disciplinary elegant-code card — Gradient Descent", "tabular.tsx"),
    "alphamissense":            ("Cross-disciplinary elegant-code card — Bayes", "alphamissense.tsx"),
    "systems-biology":          ("Cross-disciplinary elegant-code card — Entropy", "systems-biology.tsx"),
    "space-science":            ("Cross-disciplinary elegant-code card — Euler", "space-science.tsx"),
}


def apply_one(host_id: str, marker: str, fname: str) -> tuple[bool, str]:
    path = ROOT / fname
    src = path.read_text()
    changes = []

    # 1) Add the import after the hrefFor import marker (only if not present).
    if IMPORT_LINE not in src:
        if IMPORT_MARKER not in src:
            return False, f"{fname}: could not find import marker to anchor on"
        new_src = src.replace(
            IMPORT_MARKER,
            IMPORT_MARKER + "\n" + IMPORT_LINE,
            1,
        )
        if new_src == src:
            return False, f"{fname}: import replace did not change anything"
        src = new_src
        changes.append("added import")

    # 2) Insert the <RelatedElegantCode hostPage="..." /> footer right after
    #    the closing </SectionCard> of the cross-disciplinary card.
    if "RelatedElegantCode hostPage=" in src:
        return True, f"{fname}: footer already present, skipping"

    # Find the comment line.
    comment_idx = src.find("{" + f"/* {marker}")
    if comment_idx == -1:
        # Fall back to exact marker match.
        comment_idx = src.find("/* " + marker)
        if comment_idx == -1:
            return False, f"{fname}: could not locate cross-disciplinary comment marker"
        # Back up to the leading `{`.
        while comment_idx > 0 and src[comment_idx] != "{":
            comment_idx -= 1

    # Find the closing </SectionCard> AFTER the comment.
    close_idx = src.find("</SectionCard>", comment_idx)
    if close_idx == -1:
        return False, f"{fname}: no </SectionCard> after cross-disciplinary comment"
    end_of_close = close_idx + len("</SectionCard>")

    footer_block = (
        "\n\n      {/* Related elegant-code — card → card adjacency footer */}\n"
        f'      <RelatedElegantCode hostPage={{"{host_id}" as never}} />'
    )
    new_src = src[:end_of_close] + footer_block + src[end_of_close:]
    if new_src == src:
        return False, f"{fname}: footer insert produced no change"
    src = new_src
    changes.append("added footer")

    path.write_text(src)
    return True, f"{fname}: " + ", ".join(changes)


def main() -> int:
    n_ok = 0
    n_fail = 0
    for host_id, (marker, fname) in HOSTS.items():
        ok, msg = apply_one(host_id, marker, fname)
        print(f"{'OK' if ok else 'FAIL'}  {msg}")
        if ok:
            n_ok += 1
        else:
            n_fail += 1
    print(f"\n{n_ok} succeeded, {n_fail} failed")
    return 0 if n_fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
