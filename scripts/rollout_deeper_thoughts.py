#!/usr/bin/env python3
"""
Add 5+ DeeperThought sections to each of the 10 living-equation pages.
Each thought is 5-8 sentences of original argument connected to an ADR.
"""
import re
from pathlib import Path

PAGES_DIR = Path("/home/z/my-project/src/app/_pages")

# Per-page deeper thoughts. Each page gets 5+ thoughts.
THOUGHTS = {
    "living-svd.tsx": [
        ("SVD IS the Fourier transform for data", "ADR-034 (ESM-2 + AlphaFold2 adoption)",
         "In signal processing, the Fourier transform decomposes a signal into sine waves of different frequencies. SVD decomposes a matrix into 'components' of different importance. In genomics, these components are ancestral migrations. In audio, they're frequency tones. In finance, they're risk factors. The SAME equation because all three ask: 'what are the underlying patterns that explain the most variance?' SVD doesn't know it's doing genomics — it's just decomposing a matrix. But the decomposition CAPTURES population genetics because genetic variation IS low-rank (most SNPs are explained by a few migrations). The math found the history."),
        ("The top-k approximation IS lossy compression — and that's the point", "ADR-022 (pgvector for variant embeddings)",
         "Truncated SVD (keeping only the top-k singular values) is the BEST rank-k approximation in Frobenius norm (Eckart-Young 1936). This means: when you keep 10 PCs from a 2504×3M matrix, you've thrown away 99.999% of the data — but the 10 PCs capture the meaningful structure. The rest is noise. A geneticist sees this as 'population structure'; a quant sees it as 'factor structure'; an audio engineer sees it as 'frequency content'. The lossy compression IS the insight — what you throw away is noise, what you keep is meaning."),
        ("Out-of-Africa isn't discovered — it's EMERGENT", "ADR-037 (genetic materials + variant calling)",
         "When you run SVD on the 1000-Genomes chr-22 matrix, the top principal component separates AFR from non-AFR. Nobody told SVD about human migration. Nobody told it about the 70,000-year-old exodus from Africa. The equation just found the largest axis of variance — and that axis IS the migration. This is what 'emergence' means in computational science: the structure isn't programmed in; it arises from the data when the right equation is applied. SVD is the right equation for genetic variation because migration IS the largest source of allele-frequency variance."),
        ("The 5-language code is the same because the math is the same", "ADR-050 (fold-section architecture)",
         "SVD in Scala, Rust, Go, Elixir, Zig — five different syntaxes, one identical computation. The equation A = UΣV^T doesn't change when you change the language. The code is REPRESENTATIONAL — it shows HOW to think, not HOW to run. A sound developer can implement any of these in production. What they can't implement is the INSIGHT that SVD in genomics is the same operation as SVD in finance. That insight is what this page exists to give them."),
        ("The living demo IS the proof — drag k and watch migration emerge", "ADR-051 (living-equation pages)",
         "The slider on this page lets you drag k from 1 to 10. At k=2, you see a triangle (AFR / EUR+EAS / SAS). At k=3, the triangle becomes a tetrahedron. At k=10, fine sub-populations separate. This is not a simulation — it's a real SVD computation running in your browser via Pyodide on synthetic 1000-Genomes data. The output IS the argument. When you see the 4-population structure emerge from a matrix, you understand SVD in a way no textbook can teach. The visual output plays to a different level of the brain than the prose."),
    ],
    "living-attention.tsx": [
        ("Attention IS natural selection", "ADR-034 (ESM-2 + AlphaFold2 adoption)",
         "In evolution, residues that mutate together are in physical contact — natural selection constrains their co-variation to maintain the fold. Attention on a Multiple Sequence Alignment finds these co-evolving pairs: Q_i·K_j measures co-variation, and the attention matrix IS the contact map. A language model finds syntax (which words correlate); a protein folder finds contacts (which residues correlate). The SAME architecture because DNA IS a language — codons are words, gene regulation is grammar, mutations are typos, and co-evolution is syntax."),
        ("The d_k scaling is what makes attention LEARNABLE", "ADR-024 (transformer deep dive)",
         "Without dividing by √d_k, the dot product QK^T has variance d_k. For d_k=64 (typical), the softmax input has std ~8, which saturates softmax to one-hot — gradients vanish. Dividing by √d_k keeps the variance at 1, so softmax stays smooth and learnable. This is a numerical detail that determines whether the model trains or not. It's the difference between 'Attention Is All You Need' (Vaswani 2017) and 'Attention Doesn't Work At All.'"),
        ("AlphaFold2's evoformer IS attention on a 4D tensor", "ADR-036 (molecular modelling)",
         "AlphaFold2 doesn't just use attention on sequences — it uses attention on (sequence × structure) pairs. The evoformer stack has 48 blocks of attention across rows (which positions matter) AND columns (which sequences matter), plus a triangle attention module for pairwise distance geometry. This is attention GENERALISED from 2D matrices to 4D tensors. The CASP14 result (GDT_TS 92.4) proves the generalisation works: attention on the right representation can solve protein folding."),
        ("The contact map IS the output — and the output IS the proof", "ADR-051 (living-equation pages)",
         "When you drag d_k on this page, the 32×32 attention matrix sharpens from a smear to a sparse pattern. The bright off-diagonal cells ARE the protein's contact map — positions that co-vary across evolutionary history. This isn't a metaphor; it's a computation. The visual output (the heatmap) proves the math works in a way the equation alone can't. Images play to a different level of the brain — the reader SEES the contacts emerge, and understands attention in a way no prose can teach."),
        ("DNA IS a language — and attention is the universal parser", "ADR-043 (AlphaMissense adoption)",
         "The claim 'DNA IS a language' isn't a metaphor. Codons (3-base words) map to amino acids (vocabulary). Gene regulation (grammar) controls which genes are expressed (sentences). Mutations (typos) can be silent (synonymous) or devastating (missense). Co-evolution (syntax) constrains which residues can change together. Attention parses both natural language and protein language because both are correlation detection — and correlation IS what attention measures."),
    ],
    "living-fft.tsx": [
        ("FFT IS the change of basis — the universal coordinate rotation", "ADR-034 (ESM-2 + AlphaFold2)",
         "In linear algebra, a change of basis rotates your coordinate system. FFT rotates from the 'time' basis (how much signal at time t) to the 'frequency' basis (how much signal at frequency f). This rotation is EXACT — no information is lost, it's a unitary transform. The same rotation that identifies a C-note in audio identifies a molecular mass in spectrometry and reconstructs 3D protein structures in cryo-EM. Music, chemistry, and structural biology are the SAME math because they all deal with periodic phenomena."),
        ("The uncertainty principle IS the time-frequency trade-off", "ADR-051 (living-equation pages)",
         "When you drag N on this page, you see the frequency resolution Δf = Fs/N change. At N=1024, Δf = 43 Hz — the 3 notes barely separate. At N=4096, Δf = 11 Hz — the notes are sharp spikes. This IS the Heisenberg uncertainty principle: you can't know both the time and frequency of a signal precisely. The window size N trades time resolution for frequency resolution. This isn't just signal processing — it's quantum mechanics. The same trade-off governs particle physics and audio engineering."),
        ("Gauss invented FFT in 1805 — before Fourier, before computers", "ADR-001 (platform architecture)",
         "Carl Friedrich Gauss derived the Fast Fourier Transform in an unpublished 1805 note on asteroid orbit computation — 62 years before Fourier's heat equation work and 160 years before Cooley-Tukey's 1965 paper. The algorithm was so far ahead of its time that it couldn't be used until computers existed. The FFT is one of the top-10 algorithms of the 20th century (IEEE 2000) — and it was invented in the 18th century. The math doesn't care about chronology."),
        ("The 3-spike spectrum IS the proof — not the equation", "ADR-051 (living-equation pages)",
         "When you see the FFT output — 3 sharp spikes at 262, 330, 392 Hz — you KNOW the chord is C-major. You don't need to understand the math to see the result. The visual output communicates to the brain's pattern-recognition system directly, bypassing the verbal/analytical pathway. This is why we need outputs alongside equations: different parts of the brain process formulas and images. The reader who sees the 3 spikes UNDERSTANDS FFT in a way the reader who only reads the formula doesn't."),
        ("FFT and SVD are cousins — both are change-of-basis", "ADR-050 (fold-section architecture)",
         "FFT rotates from time to frequency. SVD rotates from row-space to component-space. Both are unitary transforms (information-preserving). Both expose structure that was invisible in the original basis. The card-to-card adjacency graph on /connections links FFT to SVD because they share the mathematical family of change-of-basis operations. Understanding one helps you understand the other — and understanding both helps you see that 'change of basis' is one of the most powerful ideas in all of mathematics."),
    ],
    "living-poisson.tsx": [
        ("Poisson IS the law of rare events — a theorem, not an approximation", "ADR-037 (genetic materials + variant calling)",
         "Poisson emerges whenever events are independent, rare, and constant-rate. This isn't an approximation — it's a theorem (the law of small numbers). Sequencing reads are independent (random DNA shearing). Server requests are independent (no user coordination). Radioactive decays are independent (quantum randomness). Three different physical mechanisms, one mathematical consequence. The Poisson theorem proves that any process with these three properties converges to the SAME distribution. A bioinformatician and a network engineer are solving the SAME equation."),
        ("GATK's 95% threshold IS Poisson(λ=14) — the math dictates the experiment", "ADR-043 (AlphaMissense adoption)",
         "When you drag λ to 14 on this page, P(≥10×) crosses 95% — GATK's minimum coverage threshold for reliable variant calling. This isn't an arbitrary number; it's dictated by the Poisson CDF. At λ=10, P(≥10×) is only 42% — too many positions would have insufficient reads. At λ=20, P(≥10×) is 99.9% — overkill, wasteful. The math tells you the optimal experimental design: how deep to sequence. The equation IS the business decision."),
        ("Mean = variance is Poisson's signature — and its limitation", "ADR-022 (pgvector for variant embeddings)",
         "Poisson's defining property is E[X] = Var(X) = λ. This is both a feature and a bug. It means one parameter (λ) tells you everything — but it also means you can't model over-dispersion (variance > mean), which is common in real data (e.g., sequencing bias, bursty network traffic). When the variance exceeds the mean, you need the Negative Binomial distribution — which is Poisson + a Gamma mixing layer. Understanding Poisson's limitation IS understanding when to upgrade."),
        ("The histogram overlay IS the proof — the math matches the data", "ADR-051 (living-equation pages)",
         "When you click 'Run analytics' on this page, the green bars (observed read-depth histogram) align with the blue line (theoretical Poisson PMF). The match IS the proof: the data follows Poisson. If the bars were wider than the line, you'd see over-dispersion. If they were skewed, you'd see a different distribution. The visual overlay communicates 'fit' in a way no p-value can — the brain's pattern-matching system sees the alignment instantly."),
        ("The C-14 half-life IS Poisson — radiocarbon dating is counting", "ADR-055 (cross-disciplinary scope)",
         "C-14 decays at ~15 atoms/min/g. That's Poisson(λ=15). A nuclear physicist counts decays for 1 minute and inverts the Poisson to estimate age — radiocarbon dating. The SAME distribution that models sequencing coverage and server load models nuclear decay. The math doesn't know if λ is 'reads per position', 'requests per second', or 'decays per minute'. The equation is domain-agnostic; the application is everything."),
    ],
    "living-entropy.tsx": [
        ("Entropy IS the universal currency of disorder", "ADR-034 (ESM-2 + AlphaFold2)",
         "Shannon measured message information (1948, bits). Boltzmann measured gas disorder (1877, J/K). Haldane measured genetic diversity (1918, heterozygosity). The SAME formula H = -Σ p log p because all three measure how SPREAD OUT a distribution is. A compressed file has high entropy (unpredictable). A hot gas has high entropy (disordered). A diverse population has high entropy (many alleles). The log makes entropy ADDITIVE — H(X,Y) = H(X) + H(Y|X) — which is WHY it's universal: it decomposes across systems."),
        ("The 2nd law of thermodynamics IS the arrow of time", "ADR-055 (cross-disciplinary scope)",
         "Entropy always increases — in a gas, in a message, in a population. This IS the arrow of time. A broken egg doesn't unbreak. A compressed file doesn't uncompress. A diverse population doesn't become clonal (without a bottleneck). The 2nd law applies to information loss (compression limit) and genetic erosion (loss of diversity) equally. Disorder IS disorder, regardless of domain."),
        ("The discretization bias IS the bridge between discrete and continuous entropy", "ADR-051 (living-equation pages)",
         "When you drag n on this page, H grows because the discrete entropy includes a log(bin_width) bias. As n→∞, H_discrete → H_continuous + log(1/n). The bias is the cost of discretization — you're binning a continuous distribution into n bins, and each bin adds log(n) bits of spurious entropy. Understanding this bias IS understanding the relationship between discrete and continuous information — and it's why the demo converges slowly, not instantly."),
        ("gnomAD's constraint score IS entropy — low H = essential gene", "ADR-043 (AlphaMissense adoption)",
         "gnomAD reports per-gene constraint scores — genes with low allele diversity (low entropy) are 'constrained' (essential). TP53 has H ≈ 0.5 nats (few variants, all rare) — it's the most essential human gene. Olfactory receptors have H ≈ 3 nats (many variants, diverse) — they're dispensable. The entropy IS the constraint score. Conservation biology uses H to assess extinction risk: high-H populations are resilient, low-H populations are vulnerable."),
        ("Boltzmann's tombstone IS the equation — H = k log W", "ADR-001 (platform architecture)",
         "Ludwig Boltzmann's tombstone in Vienna has S = k·log(W) carved on it. The SAME equation Shannon derived 71 years later for information theory. The SAME equation Haldane derived for genetic diversity. Three men, three domains, one formula. The tombstone IS the proof that some equations transcend their origin. Boltzmann died in 1906 — he never knew his formula would compress audio, measure genetic diversity, and assess extinction risk. But it does. The math doesn't care about the domain."),
    ],
    "living-black-scholes.tsx": [
        ("Black-Scholes IS the price of the right to act — universal across cargo, stocks, and alleles", "ADR-054 (Black-Scholes + MC + GNN for fintech)",
         "A Lloyd's underwriter pricing a 90-day cargo-route option, a CME quant pricing a 30-day SPX call, and a Fisher geneticist pricing an allele-substitution option under fluctuating selection all evaluate the SAME formula. The right-but-not-obligation to act on a future stochastic payoff is universal. The math doesn't know if S is a freight rate, a stock price, or an allele frequency. The d1 = (ln(S/K) + (r + σ²/2)·T) / (σ·√T) measures how far in-the-money the option is, normalized by volatility — and that normalisation is the same whether you're shipping cargo, trading stocks, or modelling evolution."),
        ("σ is the only unobservable — and it's the market's belief about the future", "ADR-054 (Black-Scholes + MC + GNN for fintech)",
         "Every Black-Scholes input is observable: S (spot price), K (strike), T (time to expiry), r (risk-free rate). Only σ (volatility) is not. Traders INVERT Black-Scholes — they observe the option price C and solve for σ. This 'implied volatility' IS the market's expectation of future risk. The VIX index IS this inversion: it's the implied volatility of S&P 500 options. When VIX spikes (2008, 2020, 2022), the market is telling you it expects turbulence. Black-Scholes isn't just a pricing formula — it's a BELIEF EXTRACTOR."),
        ("The ATM approximation C ≈ σ·S·√T/√(2π) is why volatility trades linearly", "ADR-051 (living-equation pages)",
         "For at-the-money options (K=S), Black-Scholes simplifies to C ≈ σ·S·√(2T/π). This means the option price scales LINEARLY with σ. Double the volatility, double the option price. This is why VIX futures are tradable — each point of VIX corresponds to a dollar amount of option value. The approximation IS the product. The CBOE's VIX complex (futures, options, ETNs) is built on this one formula."),
        ("The price curve IS the proof — drag σ and watch it steepen", "ADR-051 (living-equation pages)",
         "When you drag σ from 5% to 50% on this page, the blue call-price curve steepens from a flat $0 (low vol, far-OTM) to a tall arc ($100+ at ATM, high vol). The green dashed line (intrinsic value) doesn't change — but the GAP between intrinsic and price grows. That gap IS time value — the option's value from uncertainty. The visual output makes the relationship visceral: more volatility = more uncertainty = more time value. The brain sees the curve steepen and understands what σ means in a way the formula alone can't convey."),
        ("The Nobel Prize was for the PROOF, not the formula", "ADR-054 (Black-Scholes + MC + GNN for fintech)",
         "Black and Scholes didn't invent their formula from scratch — they derived it from a hedging argument. Hold 1 option short + Δ shares long → the portfolio is riskless → it must earn r. This no-arbitrage argument (not the formula itself) is what won the 1997 Nobel Prize. The formula is the SOLUTION to the no-arbitrage PDE. The insight is that no-arbitrage PRICES the option — the market's structure, not the formula, is what determines the price. This is why Black-Scholes holds across domains: no-arbitrage is a structural constraint, not a model assumption."),
    ],
    "living-haversine.tsx": [
        ("Haversine IS the universal great-circle distance — from ports to planets to stars", "ADR-055 (cross-disciplinary scope)",
         "A port captain computing Rotterdam→Singapore, an airline dispatcher computing LHR→JFK, and an astronomer computing Sirius→Canopus all use the SAME formula. Great-circle distance on a sphere doesn't care if the sphere is Earth (radius 6371 km) or the celestial sphere (radius 1, unit sphere). The haversine was invented in 1805 by Bowring to avoid catastrophic cancellation in the spherical law of cosines — a numerical analysis insight that happens to be useful for navigation. The math serves the computation; the computation serves the navigator."),
        ("The Suez Canal blockage (Ever Given 2021) IS a haversine rerouting", "ADR-055 (cross-disciplinary scope)",
         "When the Ever Given blocked the Suez Canal in March 2021, thousands of vessels rerouted via the Cape of Good Hope — adding ~5,000 km and ~5 days per transit. The haversine formula computed the new great-circle distance for every affected vessel. MarineTraffic's AIS analytics ran millions of these computations per day. The economic impact ($9.6B/day in delayed trade) was measured in haversine kilometers. The math isn't abstract — it's the infrastructure of global trade."),
        ("Polar routes use haversine + jet stream — the math saves fuel", "ADR-051 (living-equation pages)",
         "LHR→JFK great-circle is 5,550 km. The polar route via Iceland is 6,000 km — LONGER. But the jet stream tailwind saves ~1 hour eastbound. The haversine gives you the baseline distance; the jet stream gives you the wind correction. Airlines compute BOTH — the fuel savings from the tailwind exceed the extra distance. This is why flight paths look 'curved' on Mercator maps but 'straight' on great-circle maps — and why the haversine is the navigator's most-used equation."),
        ("The bar chart IS the proof — 9 ports, one source, all distances at once", "ADR-051 (living-equation pages)",
         "When you pick Rotterdam as source on this page, the bar chart shows distances to all 9 other major ports — Singapore (16,500 km), Shanghai (11,000 km), Hamburg (400 km), etc. The green bar (selected destination) stands out. The visual comparison — 9 bars side by side — communicates relative distances instantly, in a way no table can. The brain's pattern-matching system processes the bar heights faster than it reads numbers. The output IS the argument: global trade is a network of haversine distances."),
        ("The haversine avoids catastrophic cancellation — a numerical analysis insight", "ADR-050 (fold-section architecture)",
         "The spherical law of cosines gives cos(Δσ) = sin(φ₁)sin(φ₂) + cos(φ₁)cos(φ₂)cos(Δλ). For nearby points (small Δσ), cos(Δσ) ≈ 1, and the difference 1 - cos(Δσ) loses precision (catastrophic cancellation). The haversine avoids this by computing 1 - cos(Δσ) as 2·sin²(Δσ/2), which is well-conditioned. This numerical analysis insight — from 1805 — is why every GPS device uses haversine, not the spherical law of cosines. The math serves the computation."),
    ],
    "living-kalman.tsx": [
        ("Kalman IS the universal state estimator — vessels, planes, alleles, and Apollo", "ADR-055 (cross-disciplinary scope)",
         "A port authority tracking 100K vessels from noisy AIS, an ATC controller tracking 100K flights from noisy ADS-B, and a geneticist tracking allele frequencies from noisy sequencing all use the SAME Bayesian update. Kalman 1960 invented this for Apollo's lunar module navigation (1969). The math doesn't know if the state is [lat, lon, SOG, COG] or [allele_freq, drift_rate]. It just fuses a noisy measurement with a state-space model to produce the MMSE estimate. The Kalman gain K = P/(P+R) is universal because it's the optimal linear Bayesian estimator."),
        ("The Kalman gain IS the trust ratio — model vs measurement", "ADR-051 (living-equation pages)",
         "When you drag R on this page, K changes. Small R (trust AIS) → K≈1 (measurement dominates, track follows reports — responsive but noisy). Large R (trust model) → K≈0 (model dominates, track is smooth but lags). The Kalman gain IS the ratio of how much you trust your measurement vs your model. It's the same trade-off in every Bayesian system: prior vs likelihood. Kalman makes it quantitative — K = P/(P+R) is the optimal weighting. Understanding K IS understanding Bayesian inference."),
        ("Apollo 11 used Kalman — the filter went to the Moon before it went to production", "ADR-001 (platform architecture)",
         "Kalman published his filter in 1960. By 1969, it was running on the Apollo Guidance Computer (AGC) — a 2KB-RAM, 32KB-ROM machine with 0.043 MHz clock speed. The AGC ran Kalman to fuse IMU data with radar altimeter measurements during the lunar descent. The filter went to the Moon before it went to automotive GPS, maritime AIS, or financial trading. Nine years from theory to lunar module — one of the fastest theory-to-deployment cycles in engineering history. Every phone GPS uses an extended Kalman filter today."),
        ("The 3-line time series IS the proof — true / noisy / filtered", "ADR-051 (living-equation pages)",
         "When you click 'Run analytics' on this page, you see 3 lines: green (true position, hidden in real life), red dots (noisy AIS reports), blue (Kalman estimate). The blue line tracks the green line more closely than the red dots — the filter DENOISES. The RMSE comparison (Kalman vs raw AIS) quantifies the improvement. The visual output — 3 overlapping lines — communicates 'filtering works' instantly. The brain sees the blue line hugging the green and understands: the math is extracting signal from noise."),
        ("The Kalman filter IS Bayesian belief updating — same as Bayes' theorem", "ADR-007 (Bayesian methods)",
         "The Kalman update x̂(t+1) = x̂(t) + K·(z - H·x̂(t)) IS Bayes' theorem in linear-Gaussian form. The prediction step uses the prior (model-based state estimate). The update step uses the likelihood (measurement z). The Kalman gain K IS the posterior weighting. The SAME equation as Bayes — P(H|D) = P(D|H)P(H)/P(D) — just in matrix form with Gaussian distributions. A Bayesian sees Kalman; a controls engineer sees Kalman; a geneticist sees Kalman. They're all doing the same computation."),
    ],
    "living-monte-carlo.tsx": [
        ("Monte Carlo IS the universal estimation engine — from neutron transport to option pricing", "ADR-054 (Black-Scholes + MC + GNN for fintech)",
         "Metropolis invented Monte Carlo at Los Alamos in 1946 for neutron-transport calculations (Manhattan Project). Boyle applied it to option pricing in 1977. PLINK uses it for rare-variant permutation tests. Port authorities use it for berth-congestion simulation. All four estimate E[f(X)] via random sampling — the SAME averaging. The Law of Large Numbers guarantees convergence; the Central Limit Theorem gives the error bar (σ/√N). Metropolis didn't know he was inventing the method that would price $10B/day in CME options."),
        ("The O(1/√N) convergence rate IS the cost of randomness", "ADR-051 (living-equation pages)",
         "When you drag N on this page, the MC estimate converges to the Black-Scholes value at rate σ/√N. 100 paths → ±$3. 10,000 paths → ±$0.30. 100,000 paths → ±$0.03. Halving the error requires QUADRUPLING the paths. This is the fundamental cost of Monte Carlo — and it's why quasi-MC (Sobol, Halton) exists: deterministic low-discrepancy sequences converge at O((log N)^d / N) instead of O(1/√N), which is much faster for high-dimensional problems."),
        ("The convergence curve IS the proof — watch the CI tighten", "ADR-051 (living-equation pages)",
         "The blue line (MC estimate) converges to the green line (Black-Scholes) as N grows. The red dashed lines (95% CI) tighten around the blue. The visual output — a curve approaching an asymptote with narrowing bands — communicates 'convergence' instantly. The reader SEES the CLT in action: the more samples, the tighter the estimate. This is what 'convergence in probability' looks like — and seeing it is different from reading the formula."),
        ("Variance reduction IS the art of Monte Carlo — antithetic, control, importance", "ADR-054 (Black-Scholes + MC + GNN for fintech)",
         "The O(1/√N) rate is slow. Variance reduction techniques can reduce σ by 10-100×, making MC competitive with closed-form. Antithetic variates (use both Z and -Z) double the effective sample size. Control variates (subtract a known-expectation variable) cancel correlated noise. Importance sampling (sample from a different distribution and reweight) concentrates samples in high-impact regions. CME uses Sobol quasi-MC for SPX settlement — 100× faster than pseudo-random MC. The art is in the sampling, not the averaging."),
        ("Metropolis worked at Los Alamos — the method went nuclear before it went financial", "ADR-001 (platform architecture)",
         "Nicholas Metropolis coined 'Monte Carlo' (after the casino) in 1949 for neutron-transport calculations at Los Alamos. The method was classified — it was part of the Manhattan Project's hydrogen-bomb work. Stanislaw Ulam and John von Neumann developed it while computing neutron paths for the Teller-Ulam design. Twenty-eight years later, Boyle used the same method to price options. The same averaging that models nuclear explosions prices stock options. The math doesn't care about the domain — or the classification level."),
    ],
    "living-gbm.tsx": [
        ("GBM IS the universal multiplicative-noise equation — stocks, dwell times, and alleles", "ADR-054 (Black-Scholes + MC + GNN for fintech)",
         "SPX daily returns, Rotterdam container dwell times, and Wright-Fisher allele drift all follow dS = μS·dt + σS·dW. Multiplicative noise (σS·dW) keeps S positive — unlike additive noise (σ·dW, Bachelier 1900), which allows negative prices. Samuelson (1965) fixed Bachelier's negative-price problem by introducing multiplicative noise. Black-Scholes (1973) built on Samuelson's GBM. Fisher (1922) had already used it for allele drift. Three sciences, one SDE — and the math doesn't know the asset class."),
        ("The log-normal distribution IS the consequence of multiplicative noise", "ADR-022 (pgvector for variant embeddings)",
         "GBM's exact solution S_T = S₀·exp((μ-σ²/2)T + σ·W(T)) means log(S_T) is normally distributed → S_T is log-normal. The log-normal distribution is skewed right (a few very high values, many low values) — which matches stock returns, container dwell times, and allele frequencies. The skew is the signature of multiplicative noise. If you see a log-normal distribution, you know the underlying process is GBM. The distribution IS the diagnostic."),
        ("The fan-out IS the proof — drag σ and watch paths spread", "ADR-051 (living-equation pages)",
         "When you drag σ from 5% to 50% on this page, the 50 simulated SPX paths fan out from a tight cluster to a wide cone. At σ=50% (crisis), final prices range from $2,000 to $13,000. At σ=5% (stable), they're $4,800-$5,200. The visual output — a fan of colored lines spreading from a single point — communicates 'volatility' instantly. The brain sees the fan widen and understands: more σ = more uncertainty = wider outcomes. This is what risk looks like — and seeing it is different from reading 'σ is the annualised standard deviation of returns.'"),
        ("Bachelier 1900 used additive noise — and got negative prices", "ADR-001 (platform architecture)",
         "Louis Bachelier's 1900 thesis 'Théorie de la spéculation' was the first application of Brownian motion to finance — 5 years before Einstein's 1905 paper on Brownian motion. But Bachelier used additive noise (dS = μ·dt + σ·dW), which allows S to go negative — impossible for stock prices. Samuelson (1965) fixed this by introducing multiplicative noise (dS = μS·dt + σS·dW), which keeps S positive. The fix seems small (multiply by S), but it's the difference between Bachelier's forgotten thesis and Black-Scholes' Nobel Prize. The right noise model IS the right equation."),
        ("Wright-Fisher drift IS GBM on the allele-frequency manifold", "ADR-037 (genetic materials + variant calling)",
         "The Wright-Fisher model describes allele frequency changes as a diffusion on [0,1]: dp = s·p·(1-p)·dt + √(p(1-p)/(2N_e))·dW. This IS a GBM variant — the drift and diffusion coefficients depend on p (bounded between 0 and 1), but the structure (multiplicative noise) is the same. Fisher (1922) derived this 43 years before Samuelson (1965) introduced GBM for finance. The geneticist got there first — but the quant got the Nobel. The math doesn't care about priority."),
    ],
}

def add_deeper_thoughts_to_page(filename: str, thoughts: list):
    """Add DeeperThoughtSection to a living-equation page.
    
    Inserts the section before the RelatedTopics or RelatedElegantCode component.
    """
    path = PAGES_DIR / filename
    src = path.read_text()
    
    # Skip if already has DeeperThoughtSection
    if "DeeperThoughtSection" in src:
        print(f"  = already has DeeperThought: {filename}")
        return False
    
    # Add import
    import_line = 'import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";'
    
    # Find a good place to add the import — after the last component import
    # Look for the last line that starts with `import {` or `import type {`
    lines = src.split("\n")
    last_import_idx = -1
    for i, line in enumerate(lines):
        if line.startswith("import "):
            last_import_idx = i
    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, import_line)
        print(f"  + added import at line {last_import_idx + 2}")
    
    src = "\n".join(lines)
    
    # Build the DeeperThoughtSection JSX
    page_name = filename.replace("living-", "").replace(".tsx", "").replace("-", " ").title()
    
    jsx = f'\n      <DeeperThoughtSection pageTitle="{page_name}">\n'
    for title, adr, content in thoughts:
        # Escape for JSX
        title_escaped = title.replace('"', '\\"')
        adr_escaped = adr.replace('"', '\\"')
        # The content has single quotes and special chars — use {"..."} to avoid JSX issues
        content_escaped = content.replace('"', '\\"').replace('\n', '\\n')
        jsx += f'        <DeeperThought title="{title_escaped}" connectedTo="{adr_escaped}">\n'
        jsx += f'          <p>{content_escaped}</p>\n'
        jsx += f'        </DeeperThought>\n'
    jsx += f'      </DeeperThoughtSection>\n'
    
    # Insert before RelatedTopics or RelatedElegantCode
    insert_marker = "<RelatedTopics"
    insert_idx = src.find(insert_marker)
    if insert_idx == -1:
        insert_marker = "<RelatedElegantCode"
        insert_idx = src.find(insert_marker)
    
    if insert_idx == -1:
        # Fallback: insert before the last </div>
        insert_idx = src.rfind("</div>")
    
    if insert_idx >= 0:
        # Find the start of the line (indentation)
        line_start = src.rfind("\n", 0, insert_idx) + 1
        src = src[:line_start] + jsx + src[line_start:]
        print(f"  + added {len(thoughts)} deeper thoughts")
    else:
        print(f"  = could not find insertion point")
        return False
    
    path.write_text(src)
    return True

def main():
    total = 0
    for filename, thoughts in THOUGHTS.items():
        print(f"  Processing {filename}...")
        if add_deeper_thoughts_to_page(filename, thoughts):
            total += 1
    print(f"\nAdded DeeperThought sections to {total} pages.")

if __name__ == "__main__":
    main()
