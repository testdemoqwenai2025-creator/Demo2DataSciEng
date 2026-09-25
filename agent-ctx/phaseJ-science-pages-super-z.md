# Task ID: phaseJ-science-pages
# Agent: Super Z (main)

## Summary

Built 3 Next.js pages in `/home/z/appdatasci2/src/app/_pages/` following the Foldable + ScienceShort design pattern from `computational-biology.tsx` (reference implementation, 546 lines).

## Files built (1,891 lines total)

### 1. `computational-chemistry.tsx` — `ComputationalChemistryPage` (~540 lines)
- **Topics**: DFT (Kohn-Sham equations, LDA/GGA/B3LYP hybrid), Hartree-Fock (Schrödinger Hψ=Eψ, Born-Oppenheimer), molecular orbitals (HOMO/LUMO, band gap), Arrhenius kinetics.
- **ScienceShort phases**: Wet Lab (synthesis/spectroscopy) → DFT computation (Gaussian/ORCA) → Molecular orbitals (HOMO/LUMO) → Publication (figure) → Marketplace (Schrödinger/Materials Design/Aspen/OpenEye).
- **Foldable Math (5 eqs)**: Schrödinger Hψ=Eψ · Kohn-Sham [-½∇²+V_eff]ψ_i=ε_iψ_i · Born-Oppenheimer (m_e/m_nucleus≈1/1836) · Arrhenius k=A·exp(-Ea/RT) · LUMO-HOMO gap ΔE=ε_LUMO-ε_HOMO.
- **Custom SVG**: DFT SCF loop (guess ρ₀ → Kohn-Sham solve → new ρ → convergence → output).
- **Pyodide**: Arrhenius simulation across 200K-1000K temperatures with Q10 rule.
- **Comparison**: Gaussian vs ORCA vs VASP vs Q-Chem (6 features).

### 2. `computational-physics.tsx` — `ComputationalPhysicsPage` (~660 lines)
- **Topics**: Lattice QCD (Wilson fermions, SU(3) gauge fields), Monte Carlo (Metropolis-Hastings, MCMC), FEM (weak form, basis functions, assembly), CFD (Navier-Stokes, Reynolds number, turbulence).
- **ScienceShort phases**: Detector (LHC ATLAS/CMS) → Monte Carlo (Metropolis MCMC) → FEM mesh (triangles) → Publication (PRL/arXiv) → Marketplace (COMSOL/ANSYS/OpenFOAM/LAMMPS).
- **Foldable Math (5 eqs)**: Metropolis P(accept)=min(1, e^(-ΔE/kT)) · Navier-Stokes ∂u/∂t + u·∇u = -∇p/ρ + ν∇²u · Reynolds Re=ρvL/ν · FEM weak form ∫Ω (∇v)·(k∇u) dΩ = ∫Ω f·v dΩ · Lattice QCD action S = Σ_x Σ_μ |U_μ(x)|² + Σ_f ψ̄(D[U]+m)ψ.
- **Custom SVG**: Metropolis MCMC loop (propose → ΔE → accept/reject → repeat with detailed-balance loop-back arrows).
- **Pyodide**: Metropolis sampler — bimodal mixture target, 5000 steps, ASCII histogram, mean/std estimate.
- **Comparison**: COMSOL vs ANSYS vs OpenFOAM vs LAMMPS (6 features).

### 3. `bioinformatics-pipelines.tsx` — `BioinformaticsPipelinesPage` (~690 lines)
- **Topics**: GATK variant calling (BWA → MarkDups → BQSR → HaplotypeCaller → GenotypeGVCFs → VEP), RNA-seq (STAR → featureCounts → DESeq2), ChIP-seq (BWA → MACS2 → HOMER/MEME), variant annotation (VEP, ANNOVAR, SnpEff, ClinVar).
- **ScienceShort phases**: Sequencer (NovaSeq → FASTQ) → GATK pipeline (6 steps) → Variants (VCF format) → Clinical report (ACMG + PharmGKB) → Marketplace (23andMe/Foundation/Guardant/Color).
- **Foldable Math (5 eqs)**: Poisson P(k)=(λ^k·e^(-λ))/k! · binomial test P(X≥n)=ΣC(N,k)·p^k·(1-p)^(N-k) · negative binomial P(k)=C(k+r-1,k)·(1-p)^r·p^k · Phred Q=-10·log10(P_error) · Hardy-Weinberg p²+2pq+q²=1.
- **Custom SVG**: GATK pipeline flowchart (6 stages with descriptions + animated pipeline dot).
- **Pyodide**: Poisson sequencing depth — P(≥10x) for various λ (5x-100x) + Monte Carlo verification.
- **Comparison**: GATK vs DeepVariant vs Strelka2 vs FreeBayes (6 features).

## Pattern fidelity (matches reference `computational-biology.tsx`)
- ✓ Imports `Foldable` from `../_components/foldable` (collapsible sections — progressive disclosure)
- ✓ Imports `ScienceShort` from `../_components/science-short` (looping 5-phase animation at top)
- ✓ Dedicated math section inside Foldable — 5 equations each with "Why this matters" paragraph
- ✓ Custom SVG diagrams (NO web images)
- ✓ Pyodide demo using only `math`, `random`, `collections`
- ✓ Comparison table (4 tools × 6 features)
- ✓ Why-evolved (4 shortfalls, Foldable)
- ✓ Unique features (2×2 grid)
- ✓ Computational tooling (Foldable)
- ✓ Research (Foldable)
- ✓ Insight (Foldable, 3-paragraph deeper thought)
- ✓ RelatedTopics + inline links

## Rules compliance
- ✓ Avoid `>` in JSX text — used `&gt;` and Unicode →
- ✓ Avoid `<` in JSX text — used `&lt;` and Unicode ≤
- ✓ Avoid `${` in Python f-strings — used only `{}` (no JS template-literal interpolation conflict)
- ✓ Avoid `{` in math JSX text — used parens `()`, brackets `[]`, no curly braces
- ✓ All SVGs custom-designed (no web images)
- ✓ `bunx eslint <file> --max-warnings=0` — all 3 files pass with 0 errors

## Build + verify
1. **Lint**: all 3 files pass with 0 errors and 0 warnings.
2. **Build**: `GITHUB_PAGES=true bun run build:static` succeeded (after fixing `Molecule` → `Orbit` icon import in computational-chemistry.tsx).
3. **Verify**: `out/computational-chemistry/index.html OK`, `out/computational-physics/index.html OK`, `out/bioinformatics-pipelines/index.html OK`.
4. **Restore**: src/app/api/route.ts restored; `out/.nojekyll` created.

## Commit + push
- Commit `48a009a`: "feat: add Phase J science pages (Comp Chemistry, Comp Physics, Bio Pipelines) with Foldable+ScienceShort pattern"
- Pushed to `private main` (12eb0f1 → 48a009a).

## Worklog
Appended Phase J entry to `/home/z/appdatasci2/worklog.md`.
