/**
 * Elegant-code → host-page mapping — the source of truth for the platform's
 * multi-disciplinary thesis surfacing.
 *
 * Each of the 10 cross-disciplinary elegant-code cards (in _elegant_code_cards.tsx)
 * is propagated to one or more host pages so the thesis appears inline wherever
 * the reader's context makes it most relevant.
 *
 * This file is the canonical mapping — used by:
 *   - /connections index page (full mapping table)
 *   - home page "see the connections" preview block
 *   - per-host "Related elegant-code" footer (card → card flow)
 *
 * Keeping the mapping here means every surface renders the same truth.
 */

import type { PageId } from "./router";

export interface ElegantCodeMapping {
  /** Index into ELEGANT_CODE_CARDS in _elegant_code_cards.tsx */
  cardIndex: number;
  /** Short name for the equation, e.g. "SVD" */
  name: string;
  /** Equation (one line, plain text — no `<` `>` `{` `}` to avoid JSX pitfalls) */
  equation: string;
  /** The three sciences the equation bridges */
  sciences: [string, string, string];
  /** "X IS Y" — the unexpected connection */
  insightShort: string;
  /** Host pages that already display this card inline */
  hostPages: PageId[];
  /** Why this card is relevant on each host page (parallel to hostPages) */
  hostReasons: string[];
}

/**
 * 10 cross-disciplinary elegant-code cards → their host pages.
 *
 * Order matches the card order in _elegant_code_cards.tsx (0-indexed).
 */
export const ELEGANT_CODE_MAP: ElegantCodeMapping[] = [
  {
    cardIndex: 0,
    name: "SVD",
    equation: "A = UΣV^T",
    sciences: ["genomics", "audio", "finance"],
    insightShort: "SVD IS the Fourier transform for data",
    hostPages: ["numpy-scipy"],
    hostReasons: ["SVD IS NumPy's universal decomposer — np.linalg.svd → PCA for genomics, audio compression, Fama-French risk factors."],
  },
  {
    cardIndex: 1,
    name: "Attention",
    equation: "softmax(QK^T/√d_k) × V",
    sciences: ["protein folding", "NLP"],
    insightShort: "Attention IS natural selection",
    hostPages: ["transformer-deep-dive"],
    hostReasons: ["DNA IS a language — softmax(QK^T/√d_k)×V parses both proteins (AlphaFold2) and English (GPT-4) because both are correlation detection."],
  },
  {
    cardIndex: 2,
    name: "Poisson",
    equation: "P(k) = λ^k e^(-λ) / k!",
    sciences: ["sequencing", "networks", "decay"],
    insightShort: "Poisson IS the law of rare events",
    hostPages: ["bioinformatics-pipelines"],
    hostReasons: ["GATK variant calling depth IS Poisson(λ=mean coverage) — same distribution that sizes server clusters and radioactive sources."],
  },
  {
    cardIndex: 3,
    name: "FFT",
    equation: "X[k] = Σ x[n] e^(-2πikn/N)",
    sciences: ["mass spec", "audio", "cryo-EM"],
    insightShort: "FFT IS the change of basis",
    hostPages: ["numpy-scipy"],
    hostReasons: ["np.fft.fft is the SAME operation whether you're finding the m/z of a compound, the C-note in a chord, or the 3D structure of a ribosome."],
  },
  {
    cardIndex: 4,
    name: "Verlet",
    equation: "r(t+Δt) = 2r(t) - r(t-Δt) + F/m·Δt²",
    sciences: ["MD", "games", "orbits"],
    insightShort: "Verlet IS time-reversal symmetry",
    hostPages: ["computational-biology"],
    hostReasons: ["AMBER, Havok, and NASA JPL all call this exact integrator — symplectic, energy-conserving, time-reversible. The MD integrator IS the game physics integrator."],
  },
  {
    cardIndex: 5,
    name: "Navier-Stokes",
    equation: "∂u/∂t + u·∇u = -∇p/ρ + ν∇²u",
    sciences: ["weather", "blood", "turbulence"],
    insightShort: "Navier-Stokes IS the universe's flow equation",
    hostPages: ["computational-physics"],
    hostReasons: ["CFD on this PDE predicts hurricanes, aneurysm risk, and wing stall — the SAME nonlinearity makes weather unpredictable and turbulence beautiful."],
  },
  {
    cardIndex: 6,
    name: "Gradient Descent",
    equation: "θ(t+1) = θ(t) - η∇L(θ)",
    sciences: ["ML", "evolution", "thermodynamics"],
    insightShort: "Gradient Descent IS the learning rule",
    hostPages: ["tabular"],
    hostReasons: ["Gradient boosting = gradient descent on trees; GPT-4 training, natural selection, and protein folding all minimise a landscape with the SAME update rule."],
  },
  {
    cardIndex: 7,
    name: "Bayes",
    equation: "P(H|D) = P(D|H)P(H) / P(D)",
    sciences: ["genetics", "spam", "quantum"],
    insightShort: "Bayes IS the belief updater",
    hostPages: ["alphamissense"],
    hostReasons: ["AlphaMissense classifying a VUS IS Gmail classifying spam IS a Stern–Gerlach measurement — all three update P(H) given D."],
  },
  {
    cardIndex: 8,
    name: "Euler's Method",
    equation: "y(t+Δt) = y(t) + f(t,y)·Δt",
    sciences: ["orbital mechanics", "games", "finance"],
    insightShort: "Euler IS the seed of all simulation",
    hostPages: ["space-science"],
    hostReasons: ["Satellite trajectory propagation (NASA GMAT), game-engine fixed-step physics (Unity), and Black-Scholes Monte Carlo all START from this one-line integrator."],
  },
  {
    cardIndex: 9,
    name: "Entropy",
    equation: "H = -Σ p log p",
    sciences: ["information", "thermodynamics", "genetics"],
    insightShort: "Entropy IS the universal currency of disorder",
    hostPages: ["systems-biology"],
    hostReasons: ["Shannon measured message information, Boltzmann gas disorder, Haldane population heterozygosity — the SAME formula because all three quantify how spread out a distribution is."],
  },
  // ============================================================
  // Phase K — 10 NEW cards (indices 10-19): fintech + maritime + sciences
  // ============================================================
  {
    cardIndex: 10,
    name: "Black-Scholes",
    equation: "C = S·N(d1) − K·e^(−rT)·N(d2)",
    sciences: ["fintech", "maritime", "genetics"],
    insightShort: "Black-Scholes IS the universal option-pricing equation",
    hostPages: ["fintech"],
    hostReasons: ["A Lloyd's underwriter pricing a 90-day cargo option, a CME quant pricing an SPX call, and a Fisher geneticist pricing an allele-substitution option all evaluate the SAME formula — the right-but-not-obligation to act on a stochastic payoff."],
  },
  {
    cardIndex: 11,
    name: "Haversine",
    equation: "d = 2R·arcsin(√(...))",
    sciences: ["maritime", "aviation", "astronomy"],
    insightShort: "Haversine IS the universal great-circle distance",
    hostPages: ["global-shipping"],
    hostReasons: ["Rotterdam→Singapore sailing distance, LHR→JFK flight distance, and Sirius→Canopus angular separation all use the SAME formula — shortest-path distance on a sphere, invented 1805 (Bowring)."],
  },
  {
    cardIndex: 12,
    name: "Kelly Criterion",
    equation: "f* = (bp − q)/b = μ/σ²",
    sciences: ["fintech", "genetics", "RL"],
    insightShort: "Kelly IS the universal bet-sizing equation",
    hostPages: ["fintech"],
    hostReasons: ["Ed Thorp's blackjack team (1960s), Jim Simons' Medallion Fund (1989-2024, 65% CAGR), Haldane's allele fixation (1927), and Thompson sampling (RL) all derive the SAME optimal bet size f* = μ/σ² because they all maximize expected log-growth."],
  },
  {
    cardIndex: 13,
    name: "Markov Chain",
    equation: "π(t+1) = π(t)·P",
    sciences: ["genetics", "fintech", "maritime"],
    insightShort: "Markov IS the universal state-transition equation",
    hostPages: ["global-shipping", "bioinformatics"],
    hostReasons: ["Jukes-Cantor DNA substitution (1969), Moody's credit transitions (10⁶ bonds), and AIS port-state transitions (100K vessels) all use the SAME matrix update — the memoryless property is universal."],
  },
  {
    cardIndex: 14,
    name: "Value at Risk",
    equation: "VaR_α = −(μ + z_α·σ)",
    sciences: ["fintech", "maritime", "climate"],
    insightShort: "VaR IS the universal tail-risk equation",
    hostPages: ["fintech", "global-shipping"],
    hostReasons: ["JPMorgan's 1-day 99% VaR ($4T balance, Basel III), Lloyd's 7-day 95% VaR ($50B hull, Solvency II), and NOAA 100-year flood VaR (FEMA FIRMs) all use the SAME quantile — every loss distribution has an inverse CDF."],
  },
  {
    cardIndex: 15,
    name: "PageRank",
    equation: "PR(p) = (1-d) + d·Σ(PR(q)/L(q))",
    sciences: ["fintech", "maritime", "genetics"],
    insightShort: "PageRank IS the universal centrality equation",
    hostPages: ["global-shipping", "systems-biology"],
    hostReasons: ["BIS systemic risk (Lehman PR ≈ 0.012), UN COMTRADE port chokepoint (Rotterdam PR ≈ 0.020), and STRING gene essentiality (TP53 PR ≈ 0.025) all use the SAME eigenvector — Brin & Page 1998 for the web, now spanning banking, trade, and genomics."],
  },
  {
    cardIndex: 16,
    name: "Kalman Filter",
    equation: "x̂(t+1) = x̂(t) + K·(z − H·x̂(t))",
    sciences: ["maritime", "aviation", "genetics"],
    insightShort: "Kalman IS the universal state-estimation equation",
    hostPages: ["global-shipping"],
    hostReasons: ["AIS vessel tracking (100K vessels × 60s), ADS-B flight tracking (100K flights × 1s), and 1000-Genomes allele frequency tracking all use the SAME Bayesian update — Kalman 1960 invented this for Apollo navigation."],
  },
  {
    cardIndex: 17,
    name: "Monte Carlo",
    equation: "E[f(X)] ≈ (1/N)·Σ f(X_i)",
    sciences: ["fintech", "maritime", "genetics"],
    insightShort: "Monte Carlo IS the universal estimation equation",
    hostPages: ["fintech", "global-shipping", "monte-carlo"],
    hostReasons: ["Option pricing (10⁶ GBM paths), port congestion (10⁵ vessel sims), and rare-variant permutation tests (10⁶ permutations) all use the SAME averaging — Metropolis 1946 invented this at Los Alamos for neutron transport."],
  },
  {
    cardIndex: 18,
    name: "Geometric Brownian Motion",
    equation: "dS = μS·dt + σS·dW",
    sciences: ["fintech", "maritime", "genetics"],
    insightShort: "GBM IS the universal multiplicative-noise equation",
    hostPages: ["fintech", "global-shipping"],
    hostReasons: ["SPX daily returns (Black-Scholes foundation), Rotterdam container dwell times, and Wright-Fisher allele drift all use the SAME SDE — multiplicative noise keeps S positive with log-normal stationarity."],
  },
  {
    cardIndex: 19,
    name: "Lloyd's Algorithm",
    equation: "μ_k ← mean({x : argmin_k ‖x − μ_k‖²})",
    sciences: ["maritime", "genetics", "ML"],
    insightShort: "Lloyd IS the universal clustering equation",
    hostPages: ["global-shipping", "systems-biology"],
    hostReasons: ["50K ports clustered by trade flows (UN COMTRADE), 2504 individuals clustered by SNP PCA (1000-Genomes), and 1.4M images clustered by ResNet-50 (ImageNet) all use the SAME iterate — Lloyd 1957 invented this at Bell Labs for PCM."],
  },
];

/**
 * Host page → all cards propagated to it (the inverse mapping).
 * Used by the /connections index and the per-host footer.
 */
export function cardsOnHostPage(pageId: PageId): ElegantCodeMapping[] {
  return ELEGANT_CODE_MAP.filter((c) => c.hostPages.includes(pageId));
}

/**
 * Card → card recommendations: given a card index, return the OTHER cards
 * whose sciences overlap or whose equation family is mathematically adjacent.
 *
 * The graph below is hand-curated to surface the most interesting "X IS Y"
 * adjacencies — e.g. Euler (idx 8) is the simplest integrator, Verlet (idx 4)
 * is the simplest symplectic integrator, so they should recommend each other.
 */
const CARD_NEIGHBORS: Record<number, number[]> = {
  // SVD — adjacent to FFT (both are change-of-basis) and Entropy (both compress) and Lloyd's (both compress to centroids)
  0: [3, 9, 19],
  // Attention — adjacent to SVD (correlation detection) and Gradient Descent (learning) and Bayes (belief update)
  1: [0, 6, 7],
  // Poisson — adjacent to Bayes (rare-event beliefs) and Entropy (distribution measures) and Markov (state transition)
  2: [7, 9, 13],
  // FFT — adjacent to SVD (change-of-basis) and Poisson (rare-event frequencies) and Euler (numerical methods)
  3: [0, 2, 8],
  // Verlet — adjacent to Euler (both integrators) and Navier-Stokes (PDE integration) and Kalman (state-space)
  4: [8, 5, 16],
  // Navier-Stokes — adjacent to Verlet (PDE integration) and GBM (stochastic DEs) and Euler (numerical)
  5: [4, 18, 8],
  // Gradient Descent — adjacent to Bayes (both learning rules) and Kelly (both bet sizing) and Attention (learning)
  6: [7, 12, 1],
  // Bayes — adjacent to Gradient Descent (both learning rules) and Poisson (rare-event beliefs) and Kalman (Bayesian)
  7: [6, 2, 16],
  // Euler — adjacent to Verlet (both integrators) and GBM (both numerical) and Kalman (state update)
  8: [4, 18, 16],
  // Entropy — adjacent to SVD (both compress) and Poisson (both distribution measures) and Lloyd's (both quantify spread)
  9: [0, 2, 19],
  // Black-Scholes — adjacent to GBM (Black-Scholes derives from GBM) and VaR (both tail risk) and Kelly (both bet sizing)
  10: [18, 14, 12],
  // Haversine — adjacent to PageRank (both network geodesic) and Kalman (both tracking) and Monte Carlo (both sampling)
  11: [15, 16, 17],
  // Kelly — adjacent to Gradient Descent (both optimization) and Black-Scholes (both bet sizing) and Bayes (both update)
  12: [6, 10, 7],
  // Markov — adjacent to Poisson (state transitions) and Kalman (state-space) and PageRank (Markov chain)
  13: [2, 16, 15],
  // VaR — adjacent to Black-Scholes (both risk) and GBM (Black-Scholes) and Monte Carlo (both estimation)
  14: [10, 18, 17],
  // PageRank — adjacent to Markov (Markov chain) and SVD (both eigenvalue) and Haversine (both network)
  15: [13, 0, 11],
  // Kalman — adjacent to Markov (state-space) and Verlet (both state update) and Bayes (both Bayesian)
  16: [13, 4, 7],
  // Monte Carlo — adjacent to GBM (sampling paths) and VaR (estimation) and Entropy (both distribution)
  17: [18, 14, 9],
  // GBM — adjacent to Black-Scholes (Black-Scholes derives from GBM) and Euler (numerical) and Monte Carlo (paths)
  18: [10, 8, 17],
  // Lloyd's — adjacent to SVD (both compress) and Entropy (both quantify spread) and Gradient Descent (both optimize)
  19: [0, 9, 6],
};

/**
 * Recommended next cards to read after the given card.
 * Returns up to 3 card indices, ordered by adjacency strength.
 */
export function recommendedCards(cardIndex: number): number[] {
  return CARD_NEIGHBORS[cardIndex] ?? [];
}
