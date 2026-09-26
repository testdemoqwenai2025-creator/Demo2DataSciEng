#!/usr/bin/env python3
"""
Upgrade 5 specific outcome tiles to emit multi-series JSON output.

The previous script (add_json_output_to_outcomes.py) added generic
single-bar JSON output to 55 outcomes. This script targets 5 specific
outcomes (Monte Carlo, Kalman, GBM) and replaces their generic single-bar
JSON with multi-series line chart JSON that produces {x, y, series} rows.

Strategy:
  1. Find each outcome by its description text (which appears AFTER the
     code block in the source).
  2. Look BACKWARDS from the description to find the previous
     `print(json.dumps([...]))` line (the generic single-bar JSON that
     the upgrade script added).
  3. Replace that single-bar JSON with a multi-series JSON that produces
     chart data shaped as [{x, y, series}, ...].
"""
import re
from pathlib import Path

CARDS_FILE = Path("/home/z/my-project/src/app/_components/_elegant_code_cards.tsx")

# Per-tile: (description_marker, new_python_code_to_replace_with)
# The new code starts with "# Final line: ..." comment + multi-series Python.
UPGRADES = [
    # 1. Monte Carlo Fintech outcome — MC estimate ± CI vs N (multi-series)
    {
        "description_marker": "convergence rate is O(1/\u221aN) per CLT",
        "new_code": (
            "# Final line: JSON output for chart rendering (multi-series line chart)\n"
            "import json\n"
            "mc_chart_data = []\n"
            "for n_val in [10, 50, 100, 500, 1000, 5000, 10000]:\n"
            "    if n_val > N: break\n"
            "    sub_payoffs = payoffs[:n_val]\n"
            "    sub_mean = sum(sub_payoffs) / n_val\n"
            "    sub_var = sum((p - sub_mean) ** 2 for p in sub_payoffs) / max(n_val - 1, 1)\n"
            "    sub_se = math.sqrt(sub_var / n_val) if n_val > 0 else 0\n"
            "    mc_chart_data.append({\"x\": n_val, \"y\": round(sub_mean, 2), \"series\": \"MC estimate\"})\n"
            "    mc_chart_data.append({\"x\": n_val, \"y\": round(sub_mean - 1.96 * sub_se, 2), \"series\": \"CI low\"})\n"
            "    mc_chart_data.append({\"x\": n_val, \"y\": round(sub_mean + 1.96 * sub_se, 2), \"series\": \"CI high\"})\n"
            "    mc_chart_data.append({\"x\": n_val, \"y\": round(bs_approx, 2), \"series\": \"Black-Scholes\"})\n"
            "print(json.dumps(mc_chart_data))"
        ),
    },
    # 2. Kalman Maritime outcome — true / AIS / Kalman longitude over time (multi-series)
    {
        "description_marker": "MarineTraffic runs this on 100K vessels",
        "new_code": (
            "# Final line: JSON output for chart rendering (multi-series line chart)\n"
            "import json\n"
            "kalman_chart_data = []\n"
            "for t in range(N):\n"
            "    kalman_chart_data.append({\"x\": t, \"y\": round(true_lons[t], 5), \"series\": \"True position\"})\n"
            "    kalman_chart_data.append({\"x\": t, \"y\": round(ais_lons[t], 5), \"series\": \"AIS reports\"})\n"
            "    kalman_chart_data.append({\"x\": t, \"y\": round(est_lons[t], 5), \"series\": \"Kalman estimate\"})\n"
            "print(json.dumps(kalman_chart_data))"
        ),
    },
    # 3. Kalman Aviation outcome — true / ADS-B / Kalman altitude over time (multi-series)
    {
        "description_marker": "FlightAware runs this on 100K flights",
        "new_code": (
            "# Final line: JSON output for chart rendering (multi-series line chart)\n"
            "import json\n"
            "kalman_chart_data = []\n"
            "for t in range(N):\n"
            "    kalman_chart_data.append({\"x\": t, \"y\": round(true_alts[t], 1), \"series\": \"True altitude\"})\n"
            "    kalman_chart_data.append({\"x\": t, \"y\": round(adsb_alts[t], 1), \"series\": \"ADS-B reports\"})\n"
            "    kalman_chart_data.append({\"x\": t, \"y\": round(est_alts[t], 1), \"series\": \"Kalman estimate\"})\n"
            "print(json.dumps(kalman_chart_data))"
        ),
    },
    # 4. GBM Fintech outcome — 5 sample paths + mean ± 1σ envelope (multi-series)
    {
        "description_marker": "SPX daily returns follow GBM",
        "new_code": (
            "# Final line: JSON output for chart rendering (multi-series line chart)\n"
            "import json\n"
            "gbm_chart_data = []\n"
            "n_chart_steps = min(20, n_steps + 1)\n"
            "step_interval = max(1, (n_steps + 1) // n_chart_steps)\n"
            "for t in range(0, n_steps + 1, step_interval):\n"
            "    prices_at_t = [p[t] for p in paths]\n"
            "    mean_p = sum(prices_at_t) / len(prices_at_t)\n"
            "    var_p = sum((p - mean_p) ** 2 for p in prices_at_t) / len(prices_at_t)\n"
            "    std_p = math.sqrt(var_p)\n"
            "    gbm_chart_data.append({\"x\": t, \"y\": round(mean_p, 0), \"series\": \"Mean\"})\n"
            "    gbm_chart_data.append({\"x\": t, \"y\": round(mean_p + std_p, 0), \"series\": \"Mean + 1\u03c3\"})\n"
            "    gbm_chart_data.append({\"x\": t, \"y\": round(mean_p - std_p, 0), \"series\": \"Mean - 1\u03c3\"})\n"
            "    for path_idx in range(min(3, len(paths))):\n"
            "        gbm_chart_data.append({\"x\": t, \"y\": round(paths[path_idx][t], 0), \"series\": \"Path \" + str(path_idx + 1)})\n"
            "print(json.dumps(gbm_chart_data))"
        ),
    },
    # 5. Monte Carlo Genetics outcome — MC p-value vs N perms (multi-series)
    {
        "description_marker": "PLINK runs 10\u2076 SNPs",
        "new_code": (
            "# Final line: JSON output for chart rendering (multi-series line chart)\n"
            "import json\n"
            "mc_chart_data = []\n"
            "for n_test in [10, 50, 100, 500, 1000, 5000, 10000]:\n"
            "    if n_test > n_perms: break\n"
            "    sub_null = null_stats[:n_test]\n"
            "    p_val = (sum(1 for s in sub_null if s >= observed_stat) + 1) / (n_test + 1)\n"
            "    mc_chart_data.append({\"x\": n_test, \"y\": round(p_val, 4), \"series\": \"MC p-value\"})\n"
            "    mc_chart_data.append({\"x\": n_test, \"y\": round(analytical_p, 4), \"series\": \"Analytical p-value\"})\n"
            "print(json.dumps(mc_chart_data))"
        ),
    },
]


def escape_for_ts_backtick(s: str) -> str:
    """Escape a Python string for use inside a TS template literal (backtick string)."""
    return s.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")


def process():
    src = CARDS_FILE.read_text()
    total_modified = 0
    for upgrade in UPGRADES:
        desc_marker = upgrade["description_marker"]
        new_code = upgrade["new_code"]
        # Find the description marker in the source.
        desc_idx = src.find(desc_marker)
        if desc_idx == -1:
            print(f"  = description marker not found: {desc_marker[:50]!r}")
            continue
        # Look BACKWARDS from the description to find the previous
        # `# Final line: JSON output for chart rendering\nprint(json.dumps([...])))`
        # block. Search the 2000 characters BEFORE the description marker.
        search_start = max(0, desc_idx - 2000)
        search_region = src[search_start:desc_idx]
        # Pattern: '# Final line: JSON output for chart rendering\nprint(json.dumps([...]))'
        # The JSON content is non-greedy.
        match = re.search(
            r"# Final line: JSON output for chart rendering\nprint\(json\.dumps\(\[.*?\]\)\)",
            search_region,
            re.DOTALL,
        )
        if not match:
            print(f"  = JSON pattern not found before description: {desc_marker[:50]!r}")
            continue
        old_text = match.group(0)
        # Compute absolute position of the match in the full source.
        abs_start = search_start + match.start()
        abs_end = search_start + match.end()
        # Replace with the new multi-series code (escaped for TS backtick string).
        new_text_escaped = escape_for_ts_backtick(new_code)
        src = src[:abs_start] + new_text_escaped + src[abs_end:]
        total_modified += 1
        print(f"  + upgraded to multi-series: {desc_marker[:60]!r}")
    if total_modified > 0:
        CARDS_FILE.write_text(src)
    print(f"\nModified {total_modified} outcome code blocks to multi-series JSON.")


if __name__ == "__main__":
    process()
