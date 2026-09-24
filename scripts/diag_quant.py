#!/usr/bin/env python3
"""Diagnose template-literal issues in quant_trade_code*.ts files."""

import sys

for path in [
    "src/app/_components/_quant_trade_code.ts",
    "src/app/_components/_quant_trade_code2.ts",
    "src/app/_components/_quant_trade_code3.ts",
    "src/app/_components/_quant_trade_code4.ts",
]:
    with open(path) as f:
        content = f.read()
    n_backticks = content.count("`")
    print(f"{path}: {n_backticks} backticks ({n_backticks // 2} constants if balanced)")

    # Find lines with ${ not preceded by a backslash
    bad = []
    for i, line in enumerate(content.split("\n"), 1):
        if "${" in line and "\\${" not in line:
            bad.append((i, line[:120]))
    print(f"  Lines with unescaped ${{  (would break TS template literal): {len(bad)}")
    for line_no, line in bad[:5]:
        print(f"    L{line_no}: {line}")
    print()
