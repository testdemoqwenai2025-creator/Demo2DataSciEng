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
  // SVD — adjacent to FFT (both are change-of-basis) and Entropy (both compress)
  0: [3, 9, 1],
  // Attention — adjacent to SVD (correlation detection) and Gradient Descent (learning)
  1: [0, 6, 7],
  // Poisson — adjacent to Bayes (rare-event beliefs) and Entropy (distribution measures)
  2: [7, 9, 3],
  // FFT — adjacent to SVD (change-of-basis) and Poisson (rare-event frequencies)
  3: [0, 2, 8],
  // Verlet — adjacent to Euler (both integrators) and Navier-Stokes (PDE integration)
  4: [8, 5, 6],
  // Navier-Stokes — adjacent to Verlet (PDE integration) and Gradient Descent (landscape descent)
  5: [4, 6, 2],
  // Gradient Descent — adjacent to Bayes (both learning rules) and Attention (both learning rules)
  6: [7, 1, 5],
  // Bayes — adjacent to Gradient Descent (both learning rules) and Poisson (rare-event beliefs)
  7: [6, 2, 1],
  // Euler — adjacent to Verlet (both integrators) and FFT (both numerical methods)
  8: [4, 3, 5],
  // Entropy — adjacent to SVD (both compress) and Poisson (both distribution measures)
  9: [0, 2, 7],
};

/**
 * Recommended next cards to read after the given card.
 * Returns up to 3 card indices, ordered by adjacency strength.
 */
export function recommendedCards(cardIndex: number): number[] {
  return CARD_NEIGHBORS[cardIndex] ?? [];
}
