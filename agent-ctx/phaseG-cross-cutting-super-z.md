# Task ID: phaseG-cross-cutting — Super Z (main) — Phase G cross-cutting pages

## Task
Build 4 Phase G cross-cutting pages in `/home/z/appdatasci2/src/app/_pages/`:
- `data-mesh-deep-dive.tsx` (Dehghani 2019, 5 characteristics, graph theory + information theory + SLA)
- `streaming-sql.tsx` (Flink SQL + Spark SS + Materialize + RisingWave, event-time + watermarks + TUMBLE/HOP/SESSION)
- `data-contracts-deep-dive.tsx` (Sanderson 2022, C=(Schema,SLA,Q,O), backward/forward/full compat, SLA formula)
- `privacy-enhancing-tech.tsx` (ε-DP, Laplace/Gaussian mechanisms, FedAvg, HE: Paillier + BFV/BGV + CKKS)

Plus 1 dataset examples file: `src/app/_components/_dataset_examples14.tsx` with 8 scientific examples (2 per page × 5 langs = 40 code blocks + 8 Pyodide simulations).

## Reference implementation
- `/home/z/appdatasci2/src/app/_pages/mlflow-deep-dive.tsx` (685 lines) — DEDICATED Mathematical Foundations SectionCard with proper equations.
- `/home/z/appdatasci2/src/app/_components/dataset-cards.tsx` — DatasetExample interface.

## Output
- 5 new files, 5,211 total lines:
  - `src/app/_components/_dataset_examples14.tsx` (1,542 lines, 8 examples × 5 langs)
  - `src/app/_pages/data-mesh-deep-dive.tsx` (841 lines)
  - `src/app/_pages/streaming-sql.tsx` (917 lines)
  - `src/app/_pages/data-contracts-deep-dive.tsx` (925 lines)
  - `src/app/_pages/privacy-enhancing-tech.tsx` (986 lines)

## Math foundations (each page has a DEDICATED SectionCard with 4-6 boxed equations):
1. **Data Mesh DD**: G=(V,E) directed graph, O(1) mesh vs O(N) central, quality = 1 - H(X|Y) (conditional entropy), SLA = P(freshness<=T AND completeness>=C AND accuracy>=A) >= 0.999, betweenness centrality.
2. **Streaming SQL**: latency = t_process - t_event, W(t) = max_seen(t_event) - allowed_lateness, TUMBLE [t, t+size) non-overlapping, HOP [t, t+size) advancing by step (overlap), SESSION merge where gap <= inactivity_gap.
3. **Data Contracts DD**: C = (Schema, SLA, Q, O) formal tuple, backward (S2 ⊇ S1), forward (S1 ⊆ S2), full (S1 ≅ S2 isomorphic), SLA = P(completion<=T_max AND error<=ε_max) >= 1-α, MAJOR.MINOR.PATCH semantic versioning.
4. **Privacy Tech**: ε-DP Pr[M(D)∈S] ≤ e^ε × Pr[M(D')∈S], Laplace M(x) = f(x) + Lap(Δf/ε), Gaussian M(x) = f(x) + N(0, σ²) with σ ≥ √(2ln(1.25/δ)) × Δf/ε, composition (sequential ε_total = Σεᵢ, parallel ε_total = max(εᵢ)), HE Enc(a) ⊕ Enc(b) = Enc(a+b), Enc(a) ⊗ Enc(b) = Enc(a×b), FedAvg w(t+1) = Σ k (nk/n) × wk(t).

## Comparison tables (4-way each):
- Data Mesh vs Data Lake vs Data Warehouse vs Data Hub (5 features)
- Flink SQL vs Spark SS SQL vs Materialize vs RisingWave (6 features)
- dbt contracts vs Great Expectations vs Schema Registry vs OpenLineage (5 features)
- Differential Privacy vs Federated Learning vs Homomorphic Encryption vs Secure Multi-party (6 features)

## Issues encountered + fixes:
1. **Unescaped `\\${h.id}` in Scala s-string** (line 1360 of _dataset_examples14.tsx): `s"clinical.\\${h.id}_patients"` — JS parsed `\\${h.id}` as `\\` → `\` + `${h.id}` JS interpolation. Build failed with `ReferenceError: h is not defined`. **Fix**: replaced with `\${h.id}` (single backslash + dollar + brace → literal `${h.id}` output, valid Scala s-string interpolation).

2. **Unescaped `\\${freshness_h}` in Scala s-string** (line 529 of data-mesh-deep-dive.tsx): `s"Freshness SLA violated: \\${freshness_h}h > 24h"` — same issue. Build failed with `ReferenceError: freshness_h is not defined`. **Fix**: replaced with `\${freshness_h}`.

3. **Unescaped `{t+1}` in JSX text content** (line 603 of privacy-enhancing-tech.tsx): The text `w_{t+1} = Σ_k (n_k / n) × w_k^t` inside `<p className="font-mono">` had `{t+1}` parsed as JSX expression with `t` not in scope. Build failed with `ReferenceError: t is not defined`. **Fix**: reworded to `w(t+1) = Σ k (nk/n) × wk(t)` (removed curly braces, used parenthesised notation — same mathematical meaning, no JSX expression ambiguity).

## Verification:
- ESLint: `bunx eslint src/app/_components/_dataset_examples14.tsx src/app/_pages/{data-mesh-deep-dive,streaming-sql,data-contracts-deep-dive,privacy-enhancing-tech}.tsx --max-warnings=0` → all pass (0 errors, 0 warnings).
- Build: `GITHUB_PAGES=true bun run build:static` → 105/105 pages prerendered (Turbopack, ~30s compile).
- Output verified: out/data-mesh-deep-dive/index.html (362KB), out/streaming-sql/index.html (380KB), out/data-contracts-deep-dive/index.html (388KB), out/privacy-enhancing-tech/index.html (376KB).
- Math content keywords confirmed in built HTML: Graph Theory, Watermark (18), TUMBLE (62), HOP (36), SESSION (36), Chad Sanderson (10), backward (37), isomorphic (10), ε-DP (60), FedAvg (79), Laplace mechanism (16), Gaussian mechanism (19), Composition theorems (4), Lap(Δf/ε) (6), σ ≥ √(2ln(1.25/δ)) (8).

## Commit + push:
- SHA: f547074 on private/main (AppDataSciEng2-Advance)
- Previous: 76a85f9 (Phase G route stubs registered)
- Push: `git push private main` → 76a85f9..f547074. Pre-push guardrail checks passed.
- Sync workflow will mirror to public/main (Demo2DataSciEng); deploy workflow will build + publish to GitHub Pages.

## Stage Summary — Phase G cross-cutting pages complete + ALL PHASES COMPLETE:

- 5 new files (4 pages + 1 dataset_examples file): 5,211 lines of TypeScript/TSX added across 5 files.
- 4 cross-cutting pages — each follows the mlflow reference pattern exactly with all 13 sections (PageHeader + KPIs + dedicated Mathematical Foundations SectionCard + Architecture SVG + 3-4 code blocks + Pyodide demo + Comparison table + Why-evolved + 2×2 unique features + DatasetCards + Computational tooling + Research + Deeper-thought insight + RelatedTopics + cross-links).
- 8 scientific dataset examples × 5 languages (Scala/Rust/Go/Elixir/Zig) = 40 code blocks in _dataset_examples14.tsx + 8 Pyodide math simulations (using only math/random/collections).
- Each page's Mathematical Foundations SectionCard has 4-6 boxed equations rendered in `<p className="font-mono">` with extensive derivation/interpretation inline — these are the formal definitions, not heuristics.
- The 8 scientific examples show how cross-cutting concepts apply to scientific workloads:
  * Life sciences (7 examples): genomics variant calling as a mesh data product (1000 Genomes, 3B SNPs, SLA), clinical trial mesh via FDA FAERS (HIPAA + 21 CFR Part 11 + EMA EudraVigilance), real-time genomics via Flink SQL TUMBLE windows, genomics VCF contract, clinical GDPR contract, genomics ε-DP on GWAS, clinical trial FedAvg across hospital silos
  * Physics (1 example): LHC online monitoring via Materialize differential dataflow (40M events/sec, per-LB collision rate)

## All phases complete:
- Phase 1-4: 13 foundational pages + scientific-lakehouse-examples
- Phase A: 4 streaming pages + 6 streaming examples
- Phase B: 3 data quality / observability pages + 6 examples
- Phase C: 3 cloud warehouse pages + 6 examples
- Phase D: 3 orchestration pages + 6 examples
- Phase E: 4 ML platform deep-dive pages + 12 ML scientific examples
- Phase G: 4 cross-cutting pages (Data Mesh + Streaming SQL + Data Contracts + Privacy) + 8 cross-cutting scientific examples
- Total: 105 pages total, 60+ scientific dataset examples across the platform, each with 5-language code + Pyodide simulation.
