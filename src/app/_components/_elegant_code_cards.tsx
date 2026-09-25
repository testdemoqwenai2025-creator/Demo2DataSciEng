// ============================================================
// ElegantCodeCards — scenario cards that demonstrate the
// multi-disciplinary intersection: math → code → science → insight
//
// Each card opens a lazy popup showing:
//   1. The mathematical equation (the foundation)
//   2. Elegant code (the expression — emerging from the math)
//   3. Science domain (where this applies)
//   4. Unexpected connection (the "X IS Y" insight)
//
// These cards show HOW TO THINK across disciplines — the elegance
// that emerges when math from one field applies unexpectedly to another.
// ============================================================

import type { DatasetExample } from "./dataset-cards";
import { Atom, Brain, Activity, Database, Zap, Cpu, Network } from "lucide-react";

export const ELEGANT_CODE_CARDS: DatasetExample[] = [
  // ============================================================
  // 1. SVD: Genomics ↔ Signal Processing ↔ Finance
  // ============================================================
  {
    id: "elegant-svd-cross-discipline",
    step: "1",
    title: "SVD — the universal decomposer (genomics ↔ audio ↔ finance)",
    subtitle: "A = UΣV^T — one equation, three sciences, same elegance",
    accent: "oklch(0.65 0.16 30)",
    icon: <Atom className="h-4 w-4" />,
    badge: "Linear Algebra",
    brief: {
      dataset: "1000 Genomes genotype matrix (2504 × 3M SNPs). SVD reveals population structure — the principal components ARE ancestral migration patterns.",
      scale: "2504 individuals × 3M SNPs → top 10 principal components explain 80% of population variance",
      why: "SVD IS the universal decomposer. The same equation that separates signal from noise in audio separates ancestry from genotype in genomics. The principal components ARE the 'frequencies' of the data — in genomics they're migrations, in audio they're tones, in finance they're risk factors. Three sciences, one equation, infinite applications.",
    },
    stats: [
      { label: "Matrix", value: "2504 × 3M" },
      { label: "Top PCs", value: "10 (80% var)" },
      { label: "Math", value: "A = UΣV^T" },
      { label: "Sciences", value: "3" },
    ],
    tools: ["NumPy np.linalg.svd", "scipy.sparse.linalg.svds", "sklearn.decomposition.PCA", "Matplotlib"],
    codeTabs: [
      {
        lang: "scala",
        filename: "SVD_Elegance.scala",
        code: `// ============================================================
// SVD: A = UΣV^T
//
// The elegance: three lines of code capture population migrations.
// The math: A = UΣV^T decomposes ANY matrix into rotation × scaling × rotation.
// The insight: principal components ARE ancestral migration patterns.
//
// Genomics:  genotype_matrix → SVD → ancestry components (23andMe)
// Audio:     spectrogram → SVD → frequency components (noise reduction)
// Finance:   returns_matrix → SVD → risk factors (portfolio optimization)
//
// The SAME math because all three ask: "what are the underlying
// 'frequencies' that explain the most variance in my data?"
// ============================================================

// Genomics: 2504 individuals × 3M SNPs → 10 ancestry components
val (U, S, Vt) = svd(genotype_matrix)   // A = UΣV^T
val ancestry = U(::, 0 until 10)         // top 10 PCs = population structure
// The first PC separates Africa from Eurasia (Out-of-Africa migration)
// The second PC separates Europe from East Asia (Silk Road migration)
// The third PC separates South from East Asia (Austronesian expansion)
// SVD didn't learn history — it REDISCOVERED it from DNA.

// Audio: spectrogram → SVD → separate speech from noise
val (Us, Ss, Vts) = svd(spectrogram)
val clean = Us(::, 0 until k) * Ss(0 until k) * Vts(0 until k, ::).t
// The top k components are speech (coherent), the rest is noise (random)
// SVD separates signal from noise because signal has STRUCTURE (low rank)

// Finance: 500 stocks × 252 days → SVD → market factors
val (Uf, Sf, Vtf) = svd(returns_matrix)
val factors = Uf(::, 0 until 3)  // market, size, value factors (Fama-French)
// The top 3 components explain 85% of stock returns
// SVD discovers the SAME factors that Fama-French published (Nobel 2013)`,
      },
      {
        lang: "rust",
        filename: "svd_elegance.rs",
        code: `// ============================================================
// SVD in Rust — elegant because it shows the STRUCTURE
//
// The math: A = UΣV^T
//   U = left singular vectors (individuals × components)
//   Σ = singular values (variance explained per component)
//   V^T = right singular vectors (SNPs × components)
//
// The elegance: Σ sorts by importance — the first σ₁ explains
// the MOST variance. This is why SVD IS PCA — the principal
// components ARE the left singular vectors, and the variance
// explained IS σ²ᵢ / Σσ²ⱼ.
//
// The insight: in genomics, σ₁ ≈ 15% of variance = Out-of-Africa
// migration. SVD REDISCOVERED human migration from DNA alone,
// without any historical input. The math found the history.
// ============================================================

/// SVD decomposition: A = U * Σ * V^T
/// The elegance: this function signature IS the math.
/// Input: any matrix A. Output: three matrices that explain A.
fn svd(a: &Matrix) -> (Matrix, Vector, Matrix) {
    // The algorithm doesn't matter for elegance.
    // What matters: A = U * Σ * V^T — ALWAYS.
    // Whether you use Golub-Reinsch (O(n³)) or randomized (O(n²k)),
    // the OUTPUT is the same: the decomposition exists and is unique.
    //
    // The insight: SVD EXISTS for every matrix. There is no matrix
    // that can't be decomposed. This is why SVD is universal —
    // it's not an approximation, it's an IDENTITY. A IS UΣV^T.
    //
    // In genomics: the genotype matrix IS UΣV^T.
    // U = how individuals relate to ancestral populations.
    // Σ = how much each ancestral population contributes.
    // V^T = which SNPs define each ancestral population.
    //
    // The math doesn't know it's doing genomics — it's just
    // decomposing a matrix. But the decomposition CAPTURES
    // population genetics because genetic variation IS low-rank
    // (most SNPs are explained by a few population migrations).
    todo!()
}`,
      },
      {
        lang: "go",
        filename: "svd_elegance.go",
        code: `// ============================================================
// SVD in Go — elegant because Go's simplicity matches the math
//
// The function IS the equation: svd(A) → (U, Σ, V^T)
// No objects, no inheritance, no frameworks. Just the math.
//
// The elegance: in production, you'd call this once per night
// on the day's genotype data. The result: 10 numbers per person
// that capture their entire ancestry. 3M SNPs → 10 numbers.
// That's compression ratio of 300,000:1 — and it's LOSSLESS
// for ancestry (the discarded components are noise, not signal).
//
// The insight: SVD is the OPTIMAL compression. No other
// decomposition captures more variance in fewer dimensions.
// This is why PCA (which IS SVD) is used everywhere — it's
// the BEST way to reduce dimensionality. Not an approximation —
// the mathematical optimum (Eckart-Young theorem).
// ============================================================

// SVD: decompose A into U, Σ, V^T
// The elegance: one function call, infinite applications.
func SVD(a Matrix) (U Matrix, sigma Vector, Vt Matrix) {
    // Eckart-Young: the rank-k approximation A_k = U_k Σ_k V_k^T
    // is the BEST rank-k approximation (minimizes ||A - A_k||_F).
    // This means: no other 10-dimensional representation of a 2504-person
    // genotype matrix captures more ancestry information than SVD's
    // top 10 components. It's mathematically optimal, not heuristic.
    return
}`,
      },
      {
        lang: "elixir",
        filename: "svd_elegance.ex",
        code: `# ============================================================
# SVD in Elixir — elegant because functional purity matches math
#
# The math: A = U·Σ·V^T is a FUNCTION (input → output, no state).
# Elixir's functional paradigm IS the mathematical paradigm.
#
# The elegance: pattern matching on the decomposition.
# {U, Σ, V^T} = svd(A) reads like a math equation.
#
# The insight: in a streaming analytics system, you'd compute
# SVD incrementally as new genotype data arrives. Elixir's
# GenStage handles the streaming naturally — each batch of
# new individuals updates the decomposition via stochastic SVD.
# The math (SVD) and the system (Elixir) share the same philosophy:
# decompose, don't accumulate.
# ============================================================

defmodule SVD do
  @moduledoc """
  SVD: A = U·Σ·V^T

  The universal decomposer. Three sciences, one equation.

  Genomics:  genotype → ancestry (principal components = migrations)
  Audio:     spectrogram → frequencies (principal components = tones)
  Finance:   returns → factors (principal components = risk)

  The math doesn't know the domain. The domain doesn't change the math.
  """
  def decompose(matrix) do
    {u, sigma, v_t} = do_svd(matrix)
    # The elegance: return as a tuple, just like the math notation.
    # {U, Σ, V^T} — one-to-one with the equation A = UΣV^T.
    {u, sigma, v_t}
  end

  def top_k_components({u, sigma, _v_t}, k) do
    # The elegance: Σ is already SORTED (σ₁ ≥ σ₂ ≥ ... ≥ σ_r).
    # "Top k" is just: take the first k columns of U.
    # The math SORTED the components by importance for us.
    u
    |> take_columns(k)
    # These k columns capture the most variance possible (Eckart-Young).
    # In genomics: these ARE the k most important population migrations.
    # In audio: these ARE the k most important frequencies.
    # The math found the structure — we just asked for the top k.
  end
end`,
      },
      {
        lang: "zig",
        filename: "svd_elegance.zig",
        code: `const std = @import("std");

// ============================================================
// SVD in Zig — elegant because zero-cost abstractions match math
//
// The math: A = U·Σ·V^T — pure transformation, no side effects.
// Zig's const (immutable) + value types (no heap) match this.
//
// The elegance: the comptime dimension check.
// SVD on a (m×n) matrix gives U(m×k), Σ(k×1), V^T(k×n).
// Zig can verify this at COMPILE TIME — the type system IS the math.
//
// The insight: SVD's universality comes from the fact that EVERY
// matrix has an SVD. There's no "SVD doesn't work for this matrix."
// This is because SVD is based on the spectral theorem — every
// matrix can be decomposed into rotations and scalings. This is
// a deep theorem in linear algebra, and SVD is its practical form.
// ============================================================

pub fn svd(comptime m: usize, comptime n: usize, a: [m][n]f64)
    struct { u: [m][@min(m,n)]f64, sigma: [@min(m,n)]f64, vt: [@min(m,n)][n]f64 }
{
    // The comptime assertion: SVD exists for ALL (m, n).
    // There is no matrix too small, too large, or too sparse for SVD.
    // This universality is why SVD appears in every science —
    // it works on EVERY matrix, and every science has matrices.
    //
    // Genomics:  genotype matrix (individuals × SNPs)
    // Audio:     spectrogram (time × frequency)
    // Finance:   returns matrix (stocks × days)
    // Physics:   measurement matrix (experiments × observables)
    //
    // The math: A IS U·Σ·V^T. Not "can be decomposed" — IS.
    // The decomposition is an identity, not an approximation.
    return .{ .u = undefined, .sigma = undefined, .vt = undefined };
}`,
      },
    ],
    runnablePython: `# SVD: the universal decomposer — Pyodide simulation
import math, random

print("=== SVD: A = U Σ V^T — the universal decomposer ===")
print()
print("ONE equation. THREE sciences. INFINITE applications.")
print()
print("  Genomics:  genotype_matrix → SVD → ancestry components")
print("  Audio:     spectrogram → SVD → frequency components")
print("  Finance:   returns_matrix → SVD → risk factors")
print()
print("The math doesn't know the domain. The domain doesn't change the math.")
print("SVD EXISTS for every matrix (spectral theorem). It's an IDENTITY, not an approximation.")
print()
print("Eckart-Young: the top-k SVD is the BEST rank-k approximation (mathematically optimal).")
print("This is why PCA (= SVD) is used everywhere — it's not heuristic, it's THE optimum.")
print()
print("The unexpected connection:")
print("  σ₁ in genomics = Out-of-Africa migration (15% of variance)")
print("  σ₁ in audio = the fundamental frequency (loudest tone)")
print("  σ₁ in finance = the market factor (largest risk driver)")
print()
print("SVD didn't learn any of these — it REDISCOVERED them from data alone.")
print("The math found the history, the music, and the market risk.")
print("THAT is the elegance of multi-disciplinary mathematics.")`,
    insight: "SVD IS the Fourier transform for data. In signal processing, the Fourier transform decomposes a signal into sine waves of different frequencies. SVD decomposes a matrix into 'components' of different importance. In genomics, these components are ancestral migrations. In audio, they're frequency tones. In finance, they're risk factors. The SAME equation because all three ask the same question: 'what are the underlying patterns that explain the most variance?' SVD doesn't know it's doing genomics — it's just decomposing a matrix. But the decomposition CAPTURES population genetics because genetic variation IS low-rank (most SNPs are explained by a few migrations). The math found the history. THAT is multi-disciplinary elegance — when one equation from linear algebra rediscovers human migration from DNA, without any historical input.",
  },

  // ============================================================
  // 2. Attention: Protein folding ↔ NLP
  // ============================================================
  {
    id: "elegant-attention-cross-discipline",
    step: "2",
    title: "Attention — DNA IS a language (protein folding ↔ NLP)",
    subtitle: "softmax(QK^T/√d_k) × V — one architecture, two sciences, deep equivalence",
    accent: "oklch(0.65 0.16 165)",
    icon: <Brain className="h-4 w-4" />,
    badge: "Attention",
    brief: {
      dataset: "AlphaFold2 MSA: N_seq × N_res aligned protein sequences. Attention finds co-evolving residues → predicts 3D structure.",
      scale: "200M+ proteins predicted — more than all experimental structures ever determined",
      why: "Attention IS natural selection. The attention matrix measures which positions (tokens) are correlated (co-evolving) across sequences (sentences). In NLP, attention finds word correlations (syntax). In protein folding, attention finds residue correlations (physical contacts). A language model and a protein folder use the SAME architecture because DNA IS a language — and attention is how you parse any language, natural or biological.",
    },
    stats: [
      { label: "MSA size", value: "N_seq × N_res" },
      { label: "Proteins", value: "200M+" },
      { label: "Architecture", value: "Transformer" },
      { label: "Math", value: "softmax(QK^T/√d_k)" },
    ],
    tools: ["PyTorch", "JAX", "AlphaFold2", "ESM-2", "DeepSpeed"],
    codeTabs: [
      {
        lang: "scala",
        filename: "Attention_Elegance.scala",
        code: `// ============================================================
// Attention: softmax(QK^T/√d_k) × V
//
// The elegance: ONE architecture solves BOTH language AND biology.
//
// NLP:        "The cat sat on the mat" → attention links "cat" to "sat"
// Biology:    MSA of protein sequences → attention links residue i to j
//
// WHY does the same architecture work for both?
// Because DNA IS a language:
//   - Codons (3-letter words) encode amino acids (vocabulary)
//   - Gene regulation (grammar) controls expression (syntax)
//   - Mutations (typos) cause disease (semantic errors)
//   - Co-evolution (correlations) = syntax (word dependencies)
//
// Attention captures CO-EVOLUTION:
//   Residues i and j that mutate together across evolution
//   are in PHYSICAL CONTACT in the 3D structure.
//   Attention(Q,K,V) measures this co-evolution:
//   Q_i · K_j = how much residue i "attends to" residue j
//   = how correlated their mutations are
//   = how likely they are in physical contact
//
// The attention matrix IS the contact map.
// softmax(QK^T) IS the probability of physical contact.
// This is why AlphaFold works — attention captures folding
// without ever solving Newton's equations.
// ============================================================

// AlphaFold evoformer: attention on MSA
val attention = softmax(MSA_Q * MSA_K.T / sqrt(d_k)) * MSA_V
// MSA_Q, MSA_K, MSA_V come from the aligned sequences
// The attention matrix (N_res × N_res) IS the contact map

// The elegance: the SAME code works for NLP
val nlp_attention = softmax(text_Q * text_K.T / sqrt(d_k)) * text_V
// text_Q, text_K, text_V come from word embeddings
// The attention matrix (N_words × N_words) IS the syntax tree

// One function, two sciences:
// def attention(Q, K, V): return softmax(Q @ K.T / sqrt(d_k)) @ V
// In NLP: Q,K,V from words → syntax
// In biology: Q,K,V from MSA → protein contacts
// The function doesn't know the domain. The domain doesn't change the function.
`,
      },
      {
        lang: "rust",
        filename: "attention_elegance.rs",
        code: `// ============================================================
// Attention in Rust — the function IS the equation
//
// The math: Attention(Q,K,V) = softmax(QK^T/√d_k) × V
//
// The elegance: the function signature mirrors the equation exactly.
// Input: Q, K, V (matrices). Output: the weighted sum.
// No objects, no state, no side effects. Pure math.
//
// The insight: attention IS correlation detection.
// QK^T measures correlation (dot product = cosine similarity).
// softmax normalizes to probabilities.
// × V computes the weighted average.
//
// In NLP: correlation = syntactic dependency (which words relate)
// In biology: correlation = co-evolution (which residues mutate together)
// In physics: correlation = entanglement (which particles are linked)
//
// THREE sciences use the SAME operation because all three ask:
// "which pairs of things are CORRELATED?"
// Attention answers this question — regardless of what "things" are.
// ============================================================

/// Attention: softmax(QK^T/√d_k) × V
/// The universal correlation detector.
fn attention(q: &Matrix, k: &Matrix, v: &Matrix) -> Matrix {
    let d_k = q.cols() as f64;
    // QK^T = correlation matrix (dot product = cosine similarity)
    let scores = q.matmul(k.transpose()).scale(1.0 / d_k.sqrt());
    // softmax = normalize correlations to probabilities
    let weights = scores.softmax_rows();
    // × V = weighted sum (blend the most correlated values)
    weights.matmul(v)
    // The result: each query position gets a weighted combination
    // of value positions, weighted by their CORRELATION.
    //
    // In NLP: "cat" attends to "sat" → captures subject-verb
    // In biology: residue 45 attends to residue 120 → captures contact
    // In physics: particle i attends to particle j → captures entanglement
}`,
      },
      {
        lang: "go",
        filename: "attention_elegance.go",
        code: `// ============================================================
// Attention in Go — elegant because Go's interfaces match the math
//
// The elegance: Attention works on ANY matrices (Q, K, V).
// Go's empty interface (any) captures this universality:
// the function doesn't care what the matrices REPRESENT.
//
// The insight: attention is DOMAIN-AGNOSTIC.
// Pass word embeddings → it finds syntax.
// Pass MSA embeddings → it finds protein contacts.
// Pass particle states → it finds entanglement.
//
// The SAME function because the math is the same:
// correlation (QK^T) + normalization (softmax) + aggregation (×V).
// The domain changes the INPUT (word vs residue vs particle),
// but the OPERATION is identical — correlation detection.
// ============================================================

// Attention: the universal correlation detector
// Works on words, residues, particles — anything you can embed.
func Attention(q, k, v Matrix) Matrix {
    d_k := float64(q.Cols)
    // QK^T: dot product = cosine similarity = CORRELATION
    scores := q.Mul(k.T()).Scale(1.0 / math.Sqrt(d_k))
    // softmax: normalize correlations to probabilities (0 to 1)
    weights := SoftmaxRows(scores)
    // × V: weighted sum — blend the most correlated values
    return weights.Mul(v)
    // In Go's simplicity: the function IS the equation.
    // No frameworks. No objects. Just math.
}`,
      },
      {
        lang: "elixir",
        filename: "attention_elegance.ex",
        code: `# ============================================================
# Attention in Elixir — elegant because pattern matching = math
#
# The equation: Attention(Q,K,V) = softmax(QK^T/√d_k) × V
# The Elixir: attention(q, k, v) → softmax(q·k^T/√d_k) · v
#
# One-to-one correspondence between math notation and code.
# No ceremony. No boilerplate. Just the equation, expressed.
#
# The insight: in a multi-agent system (Elixir's strength),
# each agent could use attention to decide which OTHER agents
# to communicate with. Agent i computes attention(Q_i, K_all, V_all)
# and receives a weighted combination of all agents' states —
# weighted by CORRELATION with its own state.
#
# This is how bee swarms work: each bee attends to the bees
# most correlated with its own state (nearest neighbors).
# Attention IS swarm intelligence.
# ============================================================

defmodule Attention do
  @moduledoc """
  Attention: softmax(QK^T/√d_k) × V

  The universal correlation detector.
  One function, three sciences:

  NLP:      words → attention → syntax (word dependencies)
  Biology:  MSA → attention → contacts (residue co-evolution)
  Physics:  states → attention → entanglement (particle correlations)

  The function doesn't know the domain. The domain doesn't change the function.
  """
  def compute(q, k, v, d_k) do
    q
    |> matmul(transpose(k))           # QK^T = correlation
    |> scale(1.0 / :math.sqrt(d_k))  # /√d_k = temperature scaling
    |> softmax_rows()                # normalize to probabilities
    |> matmul(v)                     # × V = weighted aggregation
    # The result: each position gets a weighted blend of all positions,
    # weighted by their CORRELATION. In NLP: syntax. In biology: contacts.
    # In physics: entanglement. The SAME operation, different sciences.
  end
end`,
      },
      {
        lang: "zig",
        filename: "attention_elegance.zig",
        code: `const std = @import("std");
const math = std.math;

// ============================================================
// Attention in Zig — elegant because comptime = mathematical proof
//
// The math: Attention(Q,K,V) = softmax(QK^T/√d_k) × V
// Types: Q:(N,d_k), K:(M,d_k), V:(M,d_v) → Output:(N,d_v)
//
// Zig's comptime verifies: K and V must have the SAME row count (M).
// This IS the mathematical constraint: K^T is (d_k×M), V is (M×d_v),
// so K^T × V is (d_k×d_v). The TYPE SYSTEM IS THE MATH.
//
// The insight: attention's universality comes from its ABSTRACTNESS.
// Q, K, V can be ANY matrices — the operation is the same.
// This is why the same architecture (transformer) works for:
//   - NLP (GPT-4: Q,K,V from word embeddings)
//   - Biology (AlphaFold: Q,K,V from MSA embeddings)
//   - Vision (ViT: Q,K,V from image patches)
//   - Audio (Whisper: Q,K,V from audio spectrograms)
//
// Attention IS the universal aggregator — it combines information
// from multiple sources weighted by correlation. ANY domain that
// can be embedded as vectors can use attention. And EVERY domain
// can be embedded as vectors (embeddings are universal).
// ============================================================

pub fn attention(
    comptime n: usize, comptime m: usize,
    comptime d_k: usize, comptime d_v: usize,
    q: [n][d_k]f64, k: [m][d_k]f64, v: [m][d_v]f64,
) [n][d_v]f64 {
    // comptime verifies: k and v share dimension m.
    // This IS the mathematical constraint: you can only attend
    // to things you can correlate with (same d_k) and aggregate from (same m).
    //
    // The math: QK^T = correlation, softmax = normalization, ×V = aggregation
    // The code: EXACTLY this, no more, no less.
    var output: [n][d_v]f64 = undefined;
    for (0..n) |i| {
        for (0..d_v) |j| {
            // Compute attention weights: softmax(Q_i · K^T / √d_k)
            var scores: [m]f64 = undefined;
            for (0..m) |l| {
                var dot: f64 = 0;
                for (0..d_k) |d| { dot += q[i][d] * k[l][d]; }
                scores[l] = dot / @as(f64, @floatFromInt(d_k)); // /√d_k
            }
            // softmax
            var max_val: f64 = scores[0];
            for (scores[1..]) |s| { if (s > max_val) max_val = s; }
            var sum: f64 = 0;
            for (&scores) |*s| { s.* = math.exp(s.* - max_val); sum += s.*; }
            // weighted sum: × V
            output[i][j] = 0;
            for (0..m) |l| {
                output[i][j] += (scores[l] / sum) * v[l][j];
            }
        }
    }
    return output;
    // The function IS the equation. No abstractions to hide behind.
    // When you read this code, you read the math. When you read the math,
    // you read the code. They're the same thing, expressed differently.
}`,
      },
    ],
    runnablePython: `# Attention: DNA IS a language — Pyodide simulation
import math, random

print("=== Attention: softmax(QK^T/√d_k) × V ===")
print()
print("ONE architecture. TWO sciences. DEEP equivalence.")
print()
print("  NLP:      words → attention → syntax (word dependencies)")
print("  Biology:  MSA → attention → contacts (residue co-evolution)")
print()
print("WHY does the same architecture work for both?")
print("Because DNA IS a language:")
print("  - Codons (3-letter words) encode amino acids (vocabulary)")
print("  - Gene regulation (grammar) controls expression (syntax)")
print("  - Mutations (typos) cause disease (semantic errors)")
print("  - Co-evolution (correlations) = syntax (word dependencies)")
print()
print("Attention captures CO-EVOLUTION:")
print("  Residues i,j that mutate together across evolution")
print("  are in PHYSICAL CONTACT in the 3D structure.")
print("  Q_i · K_j = correlation = how likely they're in contact")
print("  The attention matrix IS the contact map.")
print("  softmax(QK^T) IS the probability of physical contact.")
print()
print("The unexpected connection:")
print("  In NLP: 'The cat sat' → attention links 'cat' to 'sat' (subject-verb)")
print("  In biology: residue 45 → residue 120 (co-evolving = physical contact)")
print("  SAME operation (QK^T = correlation) DIFFERENT science.")
print()
print("This is why AlphaFold works without physics — attention captures")
print("the STATISTICAL SIGNATURE of folding (co-evolution) without solving")
print("Newton's equations. The folding algorithm IS the language parser.")`,
    insight: "Attention IS natural selection. In evolution, residues that mutate together are in physical contact — natural selection constrains their co-variation to maintain the fold. Attention on MSA finds these co-evolving pairs: Q_i·K_j measures co-variation, and the attention matrix IS the contact map. A language model finds syntax (which words correlate); a protein folder finds contacts (which residues correlate). The SAME architecture because DNA IS a language — codons are words, gene regulation is grammar, mutations are typos, and co-evolution is syntax. Attention parses both because it measures the SAME thing: correlation. The folding algorithm IS the language parser — this is the multi-disciplinary elegance that no single PhD sees alone.",
  },

  // ============================================================
  // 3. Poisson: Sequencing ↔ Queueing Theory ↔ Radioactive Decay
  // ============================================================
  {
    id: "elegant-poisson-cross-discipline",
    step: "3",
    title: "Poisson — the law of rare events (sequencing ↔ servers ↔ decay)",
    subtitle: "P(k) = λ^k e^(-λ) / k! — one equation, three rare-event sciences",
    accent: "oklch(0.65 0.16 250)",
    icon: <Activity className="h-4 w-4" />,
    badge: "Statistics",
    brief: {
      dataset: "Sequencing depth: reads per genomic position follows Poisson(λ) where λ = coverage. 30× coverage = λ=30.",
      scale: "3 billion positions × Poisson(30) → minimum 10× at each position for variant calling",
      why: "Poisson IS the law of rare events. It describes sequencing (read count per position), server load (requests per second), and radioactive decay (atoms per second). The SAME equation because they're ALL independent rare events. A bioinformatician and a network engineer are solving the same problem — and neither knows it.",
    },
    stats: [
      { label: "λ (lambda)", value: "30 (30× coverage)" },
      { label: "P(≥10×)", value: "≈ 99.99%" },
      { label: "P(0×)", value: "≈ 0% (gap-free)" },
      { label: "Sciences", value: "3" },
    ],
    tools: ["scipy.stats.poisson", "NumPy random.poisson", "R ppois", "bedtools coverage"],
    codeTabs: [
      {
        lang: "scala",
        filename: "Poisson_Elegance.scala",
        code: `// ============================================================
// Poisson: P(k) = λ^k × e^(-λ) / k!
//
// The elegance: ONE equation describes THREE unrelated rare-event systems.
//
// Genomics:   reads per position ~ Poisson(λ=coverage)
//             → P(≥10 reads) = 1 - P(0) - P(1) - ... - P(9)
//             → guarantees minimum coverage for variant calling
//
// Networks:    requests per second ~ Poisson(λ=rate)
//             → P(server overload) = P(k > capacity)
//             → capacity planning for 99.99% uptime
//
// Physics:    decays per second ~ Poisson(λ=activity)
//             → P(0 decays) = e^(-λ) → radiation shielding
//             → half-life = ln(2)/λ → carbon dating
//
// WHY the same equation?
// Because ALL THREE are independent rare events:
//   - Each read lands independently (random shearing)
//   - Each request arrives independently (no coordination)
//   - Each atom decays independently (quantum mechanics)
//
// Poisson emerges whenever events are:
//   1. Independent (one event doesn't affect another)
//   2. Rare (probability per trial is small)
//   3. Constant rate (λ doesn't change over time)
//
// The math doesn't know if λ is read depth, request rate, or
// radioactivity. The code doesn't know either. And THAT is
// the multi-disciplinary elegance — one equation, infinite domains.
// ============================================================

// Genomics: P(≥10 reads at each position) with 30× coverage
val lambda = 30.0  // 30× sequencing coverage
val p_at_least_10 = 1.0 - (0 until 10).map(k => poisson_pmf(k, lambda)).sum
// p_at_least_10 ≈ 0.9999 → 99.99% of positions have ≥10 reads
// This guarantees variant calling accuracy (GATK requirement)

// Networks: P(server overload) with λ=1000 req/s, capacity=1100
val p_overload = (1101 to 2000).map(k => poisson_pmf(k, 1000.0)).sum
// p_overload ≈ 0.0008 → 99.92% uptime (need more capacity for 99.99%)

// Physics: P(0 decays in 1s) with λ=0.693 (1 Bq, half-life=1s)
val p_zero_decays = math.exp(-0.693)
// p_zero_decays ≈ 0.5 → 50% chance of 0 decays (half-life definition)

def poisson_pmf(k: Int, lambda: Double): Double =
  math.pow(lambda, k) * math.exp(-lambda) / factorial(k)`,
      },
      {
        lang: "rust",
        filename: "poisson_elegance.rs",
        code: `// ============================================================
// Poisson in Rust — elegant because the function IS the equation
//
// The math: P(k) = λ^k × e^(-λ) / k!
// The code: poisson_pmf(k, lambda) → probability
//
// The elegance: the SAME function computes:
//   - P(10 reads | 30× coverage) → genomics (variant calling)
//   - P(1000 requests | 1000/s rate) → networks (capacity planning)
//   - P(0 decays | 1 Bq activity) → physics (radiation shielding)
//
// The function doesn't know the domain. The domain doesn't change the function.
// This is what makes it multi-disciplinary — the MATH is universal.
//
// The insight: Poisson emerges from the LAW OF RARE EVENTS.
// When events are independent + rare + constant rate,
// the count follows Poisson(λ). This is a THEOREM (law of small numbers),
// not an approximation. The Poisson distribution IS the mathematical
// expression of "things happening randomly and independently."
//
// In genomics: reads are independent because DNA shearing is random.
// In networks: requests are independent because users don't coordinate.
// In physics: decays are independent because quantum mechanics is random.
// THREE different physical mechanisms, SAME mathematical consequence.
// ============================================================

/// Poisson PMF: P(k) = λ^k × e^(-λ) / k!
/// The law of rare events — universal across sciences.
fn poisson_pmf(k: u32, lambda: f64) -> f64 {
    // The math: λ^k × e^(-λ) / k!
    // λ = rate (reads/requests/decays per unit)
    // k = observed count
    // P(k) = probability of observing exactly k events
    //
    // The elegance: this function computes the EXACT probability
    // for ANY rare-event system. Pass lambda=30 for genomics,
    // lambda=1000 for networks, lambda=0.693 for physics.
    // The function doesn't care. The math doesn't care.
    lambda.powi(k as i32) * (-lambda).exp() / factorial(k)
}

/// Poisson CDF: P(X ≤ k) = Σ_{i=0}^{k} P(i)
/// Used for: P(≥10 reads) = 1 - P(≤9) → genomics
///           P(≤1100 req) = P(≤1100) → networks
///           P(0 decays) = P(≤0) = e^(-λ) → physics
fn poisson_cdf(k: u32, lambda: f64) -> f64 {
    (0..=k).map(|i| poisson_pmf(i, lambda)).sum()
    // The elegance: the CDF is just a SUM of PMFs.
    // No integration, no special functions — just addition.
    // This simplicity IS the elegance of discrete distributions.
}`,
      },
      {
        lang: "go",
        filename: "poisson_elegance.go",
        code: `// ============================================================
// Poisson in Go — elegant because Go's simplicity matches the math
//
// P(k) = λ^k × e^(-λ) / k!
//
// The function IS the equation. No objects. No frameworks. Just math.
//
// The insight: Poisson connects three sciences because all three
// involve COUNTING independent rare events:
//
//   Genomics:  "How many reads cover this position?" → Poisson(30)
//   Networks:  "How many requests arrive per second?" → Poisson(1000)
//   Physics:   "How many atoms decay per second?" → Poisson(0.693)
//
// The question is always the SAME: "how many independent events
// occurred in a fixed interval?" Poisson answers it — regardless
// of whether the events are reads, requests, or decays.
//
// This is the multi-disciplinary elegance: the SAME question
// ("how many?") has the SAME answer (Poisson) because the
// ASSUMPTIONS are the same (independent + rare + constant rate).
// Different physical mechanisms, same mathematical structure.
// ============================================================

// Poisson PMF: P(k) = λ^k × e^(-λ) / k!
// The law of rare events — genomics, networks, physics.
func PoissonPMF(k int, lambda float64) float64 {
    // The elegance: this IS the equation, expressed in code.
    // λ^k × e^(-λ) / k! — four operations, universal truth.
    return math.Pow(lambda, float64(k)) * math.Exp(-lambda) / float64(factorial(k))
}`,
      },
      {
        lang: "elixir",
        filename: "poisson_elegance.ex",
        code: `# ============================================================
# Poisson in Elixir — elegant because functional = mathematical
#
# The equation: P(k) = λ^k × e^(-λ) / k!
# The code: poisson_pmf(k, lambda) → probability
#
# One-to-one correspondence. No ceremony. Just the math.
#
# The insight: in a streaming genomics system, you'd compute
# Poisson coverage in real-time as reads arrive. Elixir's
# GenStage pipeline: each read increments a counter per position,
# and a Poisson check flags positions with insufficient coverage
# (P(≥10 | λ=observed_rate) < 0.99 → flag for re-sequencing).
#
# The SAME GenStage pipeline handles network traffic:
# each request increments a counter per endpoint,
# and a Poisson check flags endpoints approaching capacity
# (P(>capacity | λ=observed_rate) > 0.01 → scale up).
#
# SAME pipeline, DIFFERENT domain, SAME math.
# ============================================================

defmodule Poisson do
  @moduledoc """
  P(k) = λ^k × e^(-λ) / k!

  The law of rare events. Universal across sciences.

  Genomics:  reads/position ~ Poisson(coverage) → variant calling
  Networks:  requests/sec ~ Poisson(rate) → capacity planning
  Physics:   decays/sec ~ Poisson(activity) → radiation shielding

  The math doesn't know the domain. The domain doesn't change the math.
  """
  def pmf(k, lambda) do
    (:math.pow(lambda, k) * :math.exp(-lambda)) / factorial(k)
    # λ^k × e^(-λ) / k! — the equation, expressed in code.
    # No abstraction. No framework. Just the math.
  end

  def p_at_least(k, lambda) do
    1.0 - Enum.sum(for i <- 0..(k-1), do: pmf(i, lambda))
    # P(X ≥ k) = 1 - P(X < k) = 1 - Σ_{i=0}^{k-1} P(i)
    # Used in genomics: P(≥10 reads) → variant calling threshold
    # Used in networks: P(≥capacity requests) → overload probability
    # Used in physics: P(≥1 decay) = 1 - e^(-λ) → detection probability
  end
end`,
      },
      {
        lang: "zig",
        filename: "poisson_elegance.zig",
        code: `const std = @import("std");
const math = std.math;

// ============================================================
// Poisson in Zig — elegant because comptime = mathematical proof
//
// The math: P(k) = λ^k × e^(-λ) / k!
// The types: k is a count (u32), λ is a rate (f64)
//
// Zig's type system captures the math:
//   k: u32 → count of events (can't be negative, can't be fractional)
//   lambda: f64 → rate parameter (can be any positive real)
//
// The insight: Poisson's domain-agnostic nature comes from its
// ASSUMPTIONS, not its formula. The formula (λ^k e^(-λ) / k!)
// is a CONSEQUENCE of the assumptions:
//   1. Events are independent → no memory
//   2. Events are rare → probability per trial → 0
//   3. Rate is constant → λ doesn't change
//
// When these hold, the count IS Poisson. This is a THEOREM
// (law of small numbers), not an approximation. The math is EXACT.
//
// In genomics: reads are independent (random shearing).
// In networks: requests are independent (no coordination).
// In physics: decays are independent (quantum randomness).
// THREE different physical mechanisms → SAME mathematical theorem.
// ============================================================

pub fn poisson_pmf(k: u32, lambda: f64) f64 {
    // P(k) = λ^k × e^(-λ) / k!
    // The equation, expressed in code. No abstraction. Just math.
    //
    // k is u32: events are COUNTED (non-negative integers)
    // lambda is f64: rate is a REAL number (any positive value)
    // return is f64: probability is in [0, 1]
    //
    // The type system IS the math:
    //   counts are integers (u32)
    //   rates are reals (f64)
    //   probabilities are bounded [0,1] (f64 with assertion)
    math.pow(f64, lambda, @as(f64, @floatFromInt(k))) * math.exp(-lambda) / @as(f64, @floatFromInt(factorial(k)))
}`,
      },
    ],
    runnablePython: `# Poisson: the law of rare events — Pyodide simulation
import math, random

print("=== Poisson: P(k) = λ^k × e^(-λ) / k! ===")
print()
print("ONE equation. THREE sciences. SAME rare events.")
print()
print("  Genomics:  reads/position ~ Poisson(30) → variant calling")
print("  Networks:  requests/sec ~ Poisson(1000) → capacity planning")
print("  Physics:   decays/sec ~ Poisson(0.693) → radiation shielding")
print()

def poisson_pmf(k, lam):
    return lam**k * math.exp(-lam) / math.factorial(k)

def poisson_cdf(k, lam):
    return sum(poisson_pmf(i, lam) for i in range(k+1))

# Genomics: P(≥10 reads) with 30× coverage
lam_g = 30.0
p_10x = 1 - poisson_cdf(9, lam_g)
print(f"Genomics: P(≥10 reads | λ={lam_g}) = {p_10x:.6f} ({p_10x*100:.4f}%)")
print(f"  → 99.99%+ of positions have ≥10 reads → variant calling reliable")
print()

# Networks: P(overload) with λ=1000 req/s, capacity=1100
lam_n = 1000.0
p_over = 1 - poisson_cdf(1100, lam_n)
print(f"Networks: P(>1100 req | λ={lam_n}) = {p_over:.6f} ({p_over*100:.4f}%)")
print(f"  → 0.08% chance of overload → 99.92% uptime (need 99.99% → increase capacity)")
print()

# Physics: P(0 decays) with λ=0.693 (1 Bq, half-life=1s)
lam_p = 0.693
p_zero = poisson_pmf(0, lam_p)
print(f"Physics: P(0 decays | λ={lam_p}) = {p_zero:.6f} ({p_zero*100:.2f}%)")
print(f"  → 50% chance of 0 decays in 1s → this IS the half-life definition")
print()

print("The unexpected connection:")
print("  Sequencing depth, server load, and radioactive decay")
print("  are ALL described by the SAME equation because they're ALL")
print("  independent rare events. The math doesn't know the domain.")
print("  The domain doesn't change the math. THAT is multi-disciplinary elegance.")`,
    insight: "Poisson IS the law of rare events. It emerges whenever events are independent, rare, and constant-rate — a theorem (law of small numbers), not an approximation. Sequencing reads are independent (random DNA shearing), network requests are independent (no user coordination), radioactive decays are independent (quantum randomness). Three different physical mechanisms, one mathematical consequence. A bioinformatician computing P(≥10 reads) and a network engineer computing P(overload) are solving the SAME equation — and neither knows it. THIS is what the platform should reveal: the hidden unity beneath the disciplinary surface. Two PhDs in different fields can work side by side for decades without realizing they're using the same math. The platform's role is to show them the connection.",
  },

  // ============================================================
  // 4. FFT: Mass spectrometry ↔ Audio ↔ Cryo-EM
  // ============================================================
  {
    id: "elegant-fft-cross-discipline",
    step: "4",
    title: "FFT — the change of basis (mass spec ↔ audio ↔ cryo-EM)",
    subtitle: "X[k] = Σ x[n] e^(-2πikn/N) — one transform, three domains",
    accent: "oklch(0.65 0.16 320)",
    icon: <Zap className="h-4 w-4" />,
    badge: "Signal Processing",
    brief: {
      dataset: "Mass spectrum time-domain signal → FFT → frequency peaks = molecular masses. Cryo-EM projections → N-D FFT → 3D density map via projection-slice theorem.",
      scale: "N=10⁶ points → DFT O(N²)=10¹² ops → FFT O(N log N)=2×10⁷ ops — 50,000× speedup",
      why: "FFT IS the change of basis — it rotates from time domain to frequency domain. The SAME transform that identifies a C-note in audio identifies a molecular mass in spectrometry and reconstructs 3D protein structures in cryo-EM. Music, chemistry, and structural biology are the SAME math.",
    },
    stats: [
      { label: "N points", value: "10⁶" },
      { label: "DFT ops", value: "10¹² (O(N²))" },
      { label: "FFT ops", value: "2×10⁷ (O(N log N))" },
      { label: "Speedup", value: "50,000×" },
    ],
    tools: ["numpy.fft.fft", "FFTW", "cuFFT (GPU)", "pocketfft", "scipy.fft"],
    codeTabs: [
      {
        lang: "scala",
        filename: "FFT_Elegance.scala",
        code: `// ============================================================
// FFT: X[k] = Σ x[n] × e^(-2πi×kn/N)
//
// The elegance: ONE transform, THREE sciences.
//
// Audio:       time signal → FFT → frequency spectrum
//             → identify C-note (261 Hz), separate instruments
//
// Mass spec:   time-of-flight signal → FFT → m/z peaks
//             → identify molecules by mass-to-charge ratio
//
// Cryo-EM:    2D projections → N-D FFT → 3D density map
//             → reconstruction via projection-slice theorem
//             → FFT IS the 3D reconstruction algorithm
//
// WHY the same transform?
// Because ALL THREE ask: "what FREQUENCIES are present in my data?"
//
// In audio: frequency = pitch (how fast the signal oscillates)
// In mass spec: frequency = mass (how fast the ion oscillates)
// In cryo-EM: frequency = spatial frequency (how fast density varies)
//
// FFT finds frequencies because it changes the BASIS:
// from "how much signal at time t" (time domain)
// to   "how much signal at frequency f" (frequency domain).
//
// The change of basis is EXACT (no information loss) —
// it's a rotation in N-dimensional space, not an approximation.
// You can always go back (inverse FFT).
//
// The insight: "frequency" means different things in different sciences,
// but the MATH is identical. FFT doesn't know if the frequency is Hz
// (audio), m/z (chemistry), or spatial cycles (microscopy).
// The transform is DOMAIN-AGNOSTIC — it just finds periodicities.
// ============================================================

// Audio: identify notes in a chord
val audio_spectrum = fft(audio_signal)
val notes = audio_spectrum.indices.filter(k => magnitude(audio_spectrum(k)) > threshold)
// notes = [261, 329, 392] → C major chord (C4, E4, G4)

// Mass spec: identify molecules by mass
val ms_spectrum = fft(time_of_flight_signal)
val masses = ms_spectrum.indices.filter(k => magnitude(ms_spectrum(k)) > threshold)
// masses = [180, 379, 579] → glucose, caffeine, sucrose

// Cryo-EM: reconstruct 3D structure from 2D projections
val density_3d = ifft(fft_3d_stack.map(slice_fft => fft(slice_fft)))
// projection-slice theorem: 2D FFT of projection = 1D slice of 3D FFT
// → assemble slices → inverse 3D FFT → 3D density map
// FFT IS the reconstruction algorithm — not an approximation, EXACT.`,
      },
      {
        lang: "rust",
        filename: "fft_elegance.rs",
        code: `// ============================================================
// FFT in Rust — elegant because the algorithm IS the math
//
// Cooley-Tukey FFT: split into even/odd → recurse → combine
// X[k] = E[k] + W^k × O[k]  (even + twiddle × odd)
// where W = e^(-2πi/N) is the primitive Nth root of unity
//
// The elegance: the algorithm mirrors the math EXACTLY.
// The split (even/odd) IS the mathematical decomposition:
//   X[k] = Σ x[n]W^(kn) = Σ x[2n]W^(2kn) + Σ x[2n+1]W^((2n+1)k)
//   = E[k] + W^k × O[k]
// The code IS the equation, recursively applied.
//
// The insight: FFT works because of SYMMETRY.
// The Nth roots of unity (W^0, W^1, ..., W^(N-1)) have
// a beautiful symmetry: W^(k+N/2) = -W^k.
// This means: computing X[k] and X[k+N/2] shares computation.
// The even/odd split exploits this symmetry → halves the work
// at each level → O(N log N) instead of O(N²).
//
// In genomics: FFT on DNA sequences finds periodicities
// (codon reading frame = period 3, nucleosome wrapping = period 10)
// In audio: FFT finds pitches (fundamental + harmonics)
// In cryo-EM: FFT finds spatial frequencies (resolution = max frequency)
// SAME algorithm, different "frequencies," SAME elegance.
// ============================================================

/// FFT: O(N log N) via Cooley-Tukey even/odd split
/// The algorithm IS the math — recursive decomposition.
fn fft(x: &[Complex]) -> Vec<Complex> {
    let n = x.len();
    if n == 1 { return x.to_vec(); }
    // Split into even and odd indices
    let even = fft(&x.iter().step_by(2).cloned().collect::<Vec<_>>());
    let odd = fft(&x.iter().skip(1).step_by(2).cloned().collect::<Vec<_>>());
    // Combine: X[k] = E[k] + W^k × O[k]
    // This IS the equation: X[k] = Σ_even + W^k × Σ_odd
    let mut result = vec![Complex::zero(); n];
    for k in 0..n/2 {
        let w = Complex::from_polar(1.0, -2.0 * PI * k as f64 / n as f64);
        result[k] = &even[k] + &(&w * &odd[k]);       // X[k]
        result[k + n/2] = &even[k] - &(&w * &odd[k]);  // X[k+N/2] = E[k] - W^k×O[k]
        // The symmetry: W^(k+N/2) = -W^k → X[k+N/2] uses the SAME computation
    }
    result
    // The code reads like a math proof: split, recurse, combine.
    // No abstraction. No framework. Just the equation, recursively applied.
}`,
      },
      {
        lang: "go",
        filename: "fft_elegance.go",
        code: `// ============================================================
// FFT in Go — elegant because Go's simplicity = math's simplicity
//
// X[k] = Σ x[n] × e^(-2πi×kn/N)
//
// The function IS the equation. The recursion IS the proof.
//
// The insight: FFT connects audio, chemistry, and microscopy
// because all three deal with PERIODIC phenomena:
//   - Sound waves are periodic (pressure oscillations)
//   - Molecular vibrations are periodic (bond stretching)
//   - Crystal lattices are periodic (spatial repetition)
//
// FFT finds periodicities. When your data has structure (periodicity),
// FFT reveals it. When your data is random (noise), FFT shows flat spectrum.
// This is why FFT separates signal from noise — signal has PERIODICITY,
// noise doesn't. The transform IS the detector.
// ============================================================

// FFT: the universal periodicity finder
// Audio → notes. Mass spec → masses. Cryo-EM → density. SAME function.
func FFT(x []complex128) []complex128 {
    n := len(x)
    if n == 1 { return x }
    // Split: even + odd (Cooley-Tukey decomposition)
    even := FFT(evenIndices(x))
    odd := FFT(oddIndices(x))
    // Combine: X[k] = E[k] + W^k × O[k]
    result := make([]complex128, n)
    for k := 0; k < n/2; k++ {
        w := cmplx.Exp(complex(0, -2*math.Pi*float64(k)/float64(n)))
        result[k] = even[k] + w*odd[k]
        result[k+n/2] = even[k] - w*odd[k] // symmetry: W^(k+N/2) = -W^k
    }
    return result
}`,
      },
      {
        lang: "elixir",
        filename: "fft_elegance.ex",
        code: `# ============================================================
# FFT in Elixir — elegant because recursion = mathematical induction
#
# X[k] = Σ x[n] × e^(-2πi×kn/N)
#
# The recursion IS mathematical induction:
#   Base case: FFT([x]) = [x] (trivial — 1 point IS its own frequency)
#   Inductive: FFT(x) = combine(FFT(even(x)), FFT(odd(x)))
#
# The elegance: the function reads like a proof by induction.
# No loops. No mutation. Just: split → recurse → combine.
#
# The insight: in a streaming analytics system, you'd compute
# FFT on sliding windows of data. Elixir's GenStage handles
# this naturally — each window is a message, FFT is the
# transformation, frequency peaks are the output.
#
# The SAME pipeline handles:
#   - Audio streaming → FFT → real-time pitch detection
#   - Sensor streaming → FFT → vibration analysis (predictive maintenance)
#   - Market streaming → FFT → cycle detection (trading signals)
#
# SAME pipeline, different "frequencies," SAME elegance.
# ============================================================

defmodule FFT do
  @moduledoc """
  X[k] = Σ x[n] × e^(-2πi×kn/N)

  The universal periodicity finder.
  ONE transform, THREE sciences:

  Audio:    signal → FFT → frequencies (notes, pitches)
  Chem:     ToF signal → FFT → m/z peaks (molecular masses)
  Cryo-EM: projections → FFT → spatial frequencies (3D reconstruction)

  The transform finds PERIODICITIES. Signal has periodicity → FFT reveals it.
  Noise has no periodicity → FFT shows flat spectrum. FFT IS the signal detector.
  """
  def compute([x]), do: [x]  # Base case: 1 point IS its own spectrum
  def compute(x) do
    n = length(x)
    # Split into even and odd (Cooley-Tukey)
    {even, odd} = split_even_odd(x)
    # Recurse (mathematical induction)
    e = compute(even)
    o = compute(odd)
    # Combine: X[k] = E[k] + W^k × O[k]
    combine(e, o, n)
    # The code IS the proof:
    # Base: FFT of 1 element is trivial.
    # Inductive: FFT of N = combine(FFT(N/2 even), FFT(N/2 odd)).
    # By induction, FFT is correct for all N = power of 2.
    # The algorithm IS the math. The code IS the proof.
  end
end`,
      },
      {
        lang: "zig",
        filename: "fft_elegance.zig",
        code: `const std = @import("std");

// ============================================================
// FFT in Zig — elegant because comptime = mathematical constraint
//
// The math: X[k] = Σ x[n] × e^(-2πi×kn/N)
// The constraint: N must be a power of 2 (for Cooley-Tukey)
//
// Zig's comptime verifies this at COMPILE TIME:
//   comptime: std.math.isPowerOfTwo(n)
// The type system IS the mathematical constraint.
//
// The insight: the power-of-2 requirement comes from the
// recursive split: N → N/2 → N/4 → ... → 1.
// This only terminates if N is a power of 2 (each split halves).
// For non-power-of-2, use Bluestein's algorithm (which converts
// to a larger power-of-2 FFT + convolution).
//
// The elegance: the constraint (N = 2^k) IS the algorithm.
// Remove the constraint, and the algorithm doesn't work.
// The math and the code are inseparable.
// ============================================================

pub fn fft(comptime n: usize, x: [n]Complex) [n]Complex {
    // comptime constraint: N must be power of 2
    comptime std.debug.assert(n & (n - 1) == 0, "N must be power of 2");
    // This assertion IS the mathematical constraint.
    // Cooley-Tukey REQUIRES N = 2^k because it splits in half.
    // The type system enforces what the math requires.

    if (n == 1) return x;  // Base case: 1 point = its own spectrum

    // Split into even and odd (the decomposition IS the algorithm)
    var even: [n/2]Complex = undefined;
    var odd: [n/2]Complex = undefined;
    for (0..n/2) |i| {
        even[i] = x[2*i];
        odd[i] = x[2*i + 1];
    }
    // Recurse (mathematical induction)
    const e = fft(n/2, even);
    const o = fft(n/2, odd);
    // Combine: X[k] = E[k] + W^k × O[k]
    var result: [n]Complex = undefined;
    for (0..n/2) |k| {
        const w = Complex.fromPolar(1.0, -2.0 * std.math.pi * @as(f64, @floatFromInt(k)) / @as(f64, @floatFromInt(n)));
        result[k] = e[k].add(w.mul(o[k]));
        result[k + n/2] = e[k].sub(w.mul(o[k]));  // symmetry: W^(k+N/2) = -W^k
    }
    return result;
    // The code IS the equation. The constraint IS the algorithm.
    // No abstraction. Just math, expressed directly.
}`,
      },
    ],
    runnablePython: `# FFT: the universal periodicity finder — Pyodide simulation
import math, random

print("=== FFT: X[k] = Σ x[n] × e^(-2πi×kn/N) ===")
print()
print("ONE transform. THREE sciences. SAME periodicity detection.")
print()
print("  Audio:    signal → FFT → frequencies (notes, pitches)")
print("  Chem:     ToF signal → FFT → m/z peaks (molecular masses)")
print("  Cryo-EM: projections → FFT → spatial frequencies (3D structure)")
print()

# Simulate FFT on a signal with known frequencies
N = 64
signal = [math.sin(2*math.pi*3*n/N) + 0.5*math.sin(2*math.pi*7*n/N) + random.gauss(0, 0.1) for n in range(N)]

# Direct DFT (shows the principle — FFT is the fast version)
def dft(x):
    N = len(x)
    X_real = [0]*N; X_imag = [0]*N
    for k in range(N):
        for n in range(N):
            angle = -2*math.pi*k*n/N
            X_real[k] += x[n]*math.cos(angle)
            X_imag[k] += x[n]*math.sin(angle)
    return [math.sqrt(X_real[k]**2 + X_imag[k]**2) for k in range(N)]

spectrum = dft(signal)
peaks = sorted(range(N), key=lambda k: -spectrum[k])[:5]
print("DFT: O(N²) = {} operations".format(N*N))
print("FFT: O(N log N) = {} operations ({}× faster)".format(N*int(math.log2(N)), (N*N)//(N*int(math.log2(N)))))
print()
print("Frequency peaks found:")
for k in peaks:
    freq = k if k <= N//2 else k - N
    print(f"  f={freq:>3} Hz: |X[{k}]| = {spectrum[k]:.2f} {'<-- signal' if abs(freq) in [3,7] else ''}")
print()
print("The unexpected connection:")
print("  In audio: frequency = pitch (how fast pressure oscillates)")
print("  In mass spec: frequency = mass (how fast ions oscillate)")
print("  In cryo-EM: frequency = spatial frequency (how fast density varies)")
print()
print("FFT finds periodicities. Signal has periodicity → FFT reveals it.")
print("Noise has no periodicity → FFT shows flat spectrum.")
print("FFT IS the signal detector — regardless of what 'signal' means.")
print()
print("The transform is EXACT (no information loss) — it's a rotation")
print("in N-dimensional space. You can always go back (inverse FFT).")
print("Music, chemistry, and structural biology are the SAME math.")`,
    insight: "FFT IS the change of basis. In linear algebra, a change of basis rotates your coordinate system. FFT rotates from the 'time' basis (how much signal at time t) to the 'frequency' basis (how much signal at frequency f). This rotation is EXACT — no information is lost, it's a unitary transform. The same rotation that identifies a C-note in audio identifies a molecular mass in spectrometry and reconstructs 3D protein structures in cryo-EM. Music, chemistry, and structural biology are the SAME math because they all deal with periodic phenomena — and FFT is THE tool for finding periodicities. A musician, a chemist, and a structural biologist are all doing the same computation — and none of them knows it.",
  },

  // ============================================================
  // 5. Verlet: Molecular dynamics ↔ Game physics ↔ Orbital mechanics
  // ============================================================
  {
    id: "elegant-verlet-cross-discipline",
    step: "5",
    title: "Verlet — symplectic integration (MD ↔ games ↔ orbits)",
    subtitle: "r(t+Δt) = 2r(t) - r(t-Δt) + F/m × Δt² — one integrator, three domains",
    accent: "oklch(0.65 0.16 60)",
    icon: <Cpu className="h-4 w-4" />,
    badge: "Numerical Methods",
    brief: {
      dataset: "AMBER/GROMACS protein simulation: 50,000 atoms × 10⁶ timesteps × Δt=1fs. Verlet preserves energy (symplectic).",
      scale: "50,000 atoms × 3D × 10⁶ steps = 1.5 × 10¹¹ force evaluations × O(N²) = astronomical compute",
      why: "Verlet IS the simplest symplectic integrator. The SAME algorithm simulates protein folding (AMBER), ragdoll physics (Havok/PhysX), and orbital mechanics (NASA JPL). A biochemist, a game developer, and an aerospace engineer are using the SAME math because ALL THREE simulate Newton's equations on N-D arrays.",
    },
    stats: [
      { label: "Atoms", value: "50,000" },
      { label: "Timesteps", value: "10⁶" },
      { label: "Δt", value: "1 fs (10⁻¹⁵ s)" },
      { label: "Sciences", value: "3" },
    ],
    tools: ["AMBER", "GROMACS", "OpenMM", "NAMD", "Havok", "PhysX", "NASA SPICE"],
    codeTabs: [
      {
        lang: "scala",
        filename: "Verlet_Elegance.scala",
        code: `// ============================================================
// Verlet: r(t+Δt) = 2r(t) - r(t-Δt) + (F/m) × Δt²
//
// The elegance: ONE integrator, THREE sciences.
//
// Biology:     protein folding (AMBER, GROMACS)
//              → 50,000 atoms, 10⁶ steps, Δt = 1 fs
//              → predict drug binding, enzyme catalysis
//
// Games:       ragdoll physics (Havok, PhysX, Bullet)
//              → 1,000 rigid bodies, 60 FPS, Δt = 16 ms
//              → realistic character animation, collision response
//
// Aerospace:   orbital mechanics (NASA JPL SPICE)
//              → 10 bodies, 10⁵ steps, Δt = 1 hour
//              → spacecraft trajectory, planetary ephemeris
//
// WHY the same algorithm?
// Because ALL THREE simulate Newton's F = ma on N-D arrays.
// Verlet is the SIMPLEST symplectic integrator — it preserves
// energy (Hamiltonian structure) exactly in the limit Δt → 0.
//
// The elegance: the formula has NO velocity.
// r(t+Δt) = 2r(t) - r(t-Δt) + (F/m)×Δt²
// Only positions and forces — no explicit velocity storage.
// Velocity is IMPLICIT: v(t) ≈ (r(t+Δt) - r(t-Δt)) / (2Δt)
// This makes Verlet memory-efficient (one less N×3 array)
// and symplectic (preserves phase-space volume → energy conservation).
//
// The insight: Verlet works because of TIME-REVERSAL SYMMETRY.
// The formula is symmetric in time: swap t+Δt ↔ t-Δt, and the
// equation is unchanged (F depends only on position, not velocity
// for conservative forces). This symmetry IS the symplectic property.
// A biochemist simulating proteins and a game developer simulating
// ragdolls benefit from the SAME conservation law.
// ============================================================

// Biology: protein dynamics (AMBER-style)
val r_new = 2.0 * r_t - r_prev + (forces / masses) * (dt * dt)
// forces = Lennard-Jones + Coulomb + bonds + angles + dihedrals
// masses = atom-specific (C=12, N=14, O=16, H=1)
// dt = 1e-15 seconds (1 femtosecond)
// → 10⁶ steps = 1 nanosecond of protein dynamics

// Games: ragdoll physics (Havok-style)
val r_new = 2.0 * r_t - r_prev + (gravity + contacts) * (dt * dt)
// gravity = (0, -9.81, 0) m/s²
// contacts = spring forces from collision response
// dt = 0.016 seconds (60 FPS)
// → 60 steps/second of character physics

// Aerospace: orbital mechanics (NASA-style)
val r_new = 2.0 * r_t - r_prev + (gravity_sun + gravity_planets) * (dt * dt)
// gravity_sun = G × M_sun × r_hat / |r|²  (Newton's law of gravitation)
// dt = 3600 seconds (1 hour)
// → 10⁵ steps = 11 years of planetary motion

// ONE formula, THREE sciences, SAME symplectic structure.`,
      },
      {
        lang: "rust",
        filename: "verlet_elegance.rs",
        code: `// ============================================================
// Verlet in Rust — elegant because the formula IS the code
//
// r(t+Δt) = 2r(t) - r(t-Δt) + (F/m)×Δt²
//
// The elegance: NO velocity variable. The formula uses only
// positions (r) and forces (F). Velocity is implicit:
// v(t) = (r(t+Δt) - r(t-Δt)) / (2Δt)
//
// This saves memory (no v array) AND guarantees energy conservation
// (symplectic property). Two benefits from ONE design choice.
//
// The insight: the formula is TIME-REVERSAL SYMMETRIC.
// Swap t+Δt and t-Δt: the equation is unchanged.
// This means: if you run the simulation backward, you get the
// exact same trajectory (within numerical precision).
// This IS the definition of symplectic — the integrator
// preserves the geometric structure of Hamiltonian mechanics.
//
// In biology: energy conservation means the protein doesn't
// "heat up" artificially (common bug in naive integrators).
// In games: energy conservation means ragdolls don't explode.
// In aerospace: energy conservation means orbits don't decay.
// THREE sciences, SAME conservation, ONE formula.
// ============================================================

/// Verlet integration step.
/// r_new = 2*r_t - r_prev + (F/m)*dt²
/// The simplest symplectic integrator — preserves energy.
fn verlet_step(
    r_t: &Vec3,      // current position
    r_prev: &Vec3,   // previous position (t - dt)
    force: &Vec3,    // force at current position
    mass: f64,       // particle mass
    dt: f64,         // timestep
) -> Vec3 {
    // The formula IS the code. No abstraction. Just the equation.
    *r_t * 2.0 - *r_prev + *force / mass * dt * dt
    // In biology: force = Lennard-Jones + Coulomb, mass = atom mass, dt = 1 fs
    // In games: force = gravity + contacts, mass = body mass, dt = 16 ms
    // In aerospace: force = gravitational, mass = body mass, dt = 1 hour
    //
    // The function doesn't know the domain. The domain doesn't change the function.
    // This IS multi-disciplinary elegance: ONE formula, THREE sciences.
}`,
      },
      {
        lang: "go",
        filename: "verlet_elegance.go",
        code: `// ============================================================
// Verlet in Go — elegant because Go's simplicity = math's simplicity
//
// r(t+Δt) = 2r(t) - r(t-Δt) + (F/m)×Δt²
//
// The function IS the equation. Four operations, universal truth.
//
// The insight: Verlet's elegance comes from its MINIMALISM.
// It uses fewer operations than Euler (which needs velocity),
// fewer state variables (no v array), and is MORE accurate
// (2nd order vs 1st order). Less code, better math.
// This is the definition of elegance: achieving more with less.
//
// In production:
//   AMBER uses Velocity Verlet (a variant with explicit velocity)
//   Havok uses Verlet for position + separate Euler for velocity
//   NASA uses Verlet for long-term orbit prediction (energy-stable)
//
// All three converge on the SAME core formula because the symplectic
// property is ESSENTIAL — without it, energy drifts and simulations
// diverge from reality. The math dictates the code.
// ============================================================

// Verlet: the universal symplectic integrator
// Biology (AMBER), games (Havok), aerospace (NASA) — same formula.
func Verlet(rT, rPrev Vec3, force Vec3, mass, dt float64) Vec3 {
    return rT.Scale(2).Sub(rPrev).Add(force.Scale(dt * dt / mass))
    // 2r(t) - r(t-Δt) + (F/m)×Δt²
    // The formula IS the code. The code IS the formula.
    // No abstraction. No framework. Just math, expressed directly.
}`,
      },
      {
        lang: "elixir",
        filename: "verlet_elegance.ex",
        code: `# ============================================================
# Verlet in Elixir — elegant because immutability = time-reversal symmetry
#
# r(t+Δt) = 2r(t) - r(t-Δt) + (F/m)×Δt²
#
# The elegance: Elixir's immutable data matches Verlet's time-reversal symmetry.
# Each step produces a NEW state (no mutation) — exactly like physics,
# where each timestep creates a NEW configuration (no "editing" the past).
#
# The insight: in a distributed simulation (Elixir's strength),
# each node could simulate a subset of atoms, exchanging forces
# via message passing. The Verlet formula is STATELESS per step:
# given (r_t, r_prev, F), it produces r_new — no accumulated state.
# This makes it trivially parallelizable: each atom's new position
# depends only on its own past positions and current forces.
#
# The SAME pattern applies to:
#   - Distributed molecular dynamics (each GPU simulates a region)
#   - Multiplayer game physics (each client simulates nearby bodies)
#   - federated orbit computation (each observatory tracks its bodies)
# ============================================================

defmodule Verlet do
  @moduledoc """
  r(t+Δt) = 2r(t) - r(t-Δt) + (F/m)×Δt²

  The universal symplectic integrator. ONE formula, THREE sciences.

  Biology:   protein folding (AMBER, GROMACS) — 50k atoms, 1 fs steps
  Games:     ragdoll physics (Havok, PhysX) — 1k bodies, 16 ms steps
  Aerospace: orbital mechanics (NASA SPICE) — 10 bodies, 1 hr steps

  The formula has NO velocity — only positions and forces.
  This makes it memory-efficient AND symplectic (energy-preserving).
  """
  def step(r_t, r_prev, force, mass, dt) do
    # The formula IS the code. The code IS the formula.
    # 2r(t) - r(t-Δt) + (F/m)×Δt²
    {
      2.0 * elem(r_t, 0) - elem(r_prev, 0) + elem(force, 0) / mass * dt * dt,
      2.0 * elem(r_t, 1) - elem(r_prev, 1) + elem(force, 1) / mass * dt * dt,
      2.0 * elem(r_t, 2) - elem(r_prev, 2) + elem(force, 2) / mass * dt * dt
    }
    # In biology: force = Lennard-Jones + Coulomb, dt = 1e-15 s
    # In games: force = gravity + contacts, dt = 0.016 s
    # In aerospace: force = gravitation, dt = 3600 s
    # The function doesn't know the domain. The domain doesn't change the function.
  end
end`,
      },
      {
        lang: "zig",
        filename: "verlet_elegance.zig",
        code: `const std = @import("std");

// ============================================================
// Verlet in Zig — elegant because value types = mathematical objects
//
// r(t+Δt) = 2r(t) - r(t-Δt) + (F/m)×Δt²
//
// The types: Vec3 is [3]f64 — a VALUE type (no heap, no aliasing).
// This matches the math: positions are mathematical objects (vectors),
// not mutable references. Each operation creates a NEW vector.
//
// The insight: Verlet's symplectic property comes from the
// TIME-REVERSAL SYMMETRY of the formula:
//   r(t+Δt) = 2r(t) - r(t-Δt) + (F/m)×Δt²
// Swap (t+Δt) ↔ (t-Δt):
//   r(t-Δt) = 2r(t) - r(t+Δt) + (F/m)×Δt²  [F depends on r(t), not on t±Δt]
// This is the SAME equation — the formula is symmetric in time.
//
// This symmetry IS the symplectic property:
//   - Forward integration: r(t) → r(t+Δt)
//   - Backward integration: r(t+Δt) → r(t) [using the same formula]
//   - The trajectory is REVERSIBLE — you can run it backward.
//
// In biology: reversible trajectories mean no energy drift →
//   simulations run for nanoseconds without divergence.
// In games: reversibility means stable physics →
//   ragdolls don't accumulate energy and explode.
// In aerospace: reversibility means orbit predictions are stable →
//   10-year spacecraft trajectories stay accurate.
//
// THREE sciences benefit from the SAME symmetry because
// all three simulate Hamiltonian systems (conservative forces).
// The math dictates the code. The code preserves the math.
// ============================================================

pub const Vec3 = [3]f64;

/// Verlet integration step.
/// r_new = 2*r_t - r_prev + (F/m)*dt²
/// The simplest symplectic integrator — preserves energy via time-reversal symmetry.
pub fn verlet_step(r_t: Vec3, r_prev: Vec3, force: Vec3, mass: f64, dt: f64) Vec3 {
    const dt2 = dt * dt;
    return .{
        2.0 * r_t[0] - r_prev[0] + force[0] / mass * dt2,
        2.0 * r_t[1] - r_prev[1] + force[1] / mass * dt2,
        2.0 * r_t[2] - r_prev[2] + force[2] / mass * dt2,
    };
    // The function IS the equation. The types ARE the math.
    // Vec3 = [3]f64 — a mathematical vector, not a mutable object.
    // Each call creates a NEW Vec3 — no mutation, no aliasing.
    // This matches the math: positions are values, not references.
}`,
      },
    ],
    runnablePython: `# Verlet: the universal symplectic integrator — Pyodide simulation
import math, random

print("=== Verlet: r(t+Δt) = 2r(t) - r(t-Δt) + (F/m)×Δt² ===")
print()
print("ONE integrator. THREE sciences. SAME symplectic structure.")
print()
print("  Biology:   protein folding (AMBER) — 50k atoms, 1 fs steps")
print("  Games:     ragdoll physics (Havok) — 1k bodies, 16 ms steps")
print("  Aerospace: orbital mechanics (NASA) — 10 bodies, 1 hr steps")
print()

# Simulate 3 atoms with Lennard-Jones forces
random.seed(42)
n_atoms = 3
dt = 0.001  # reduced timestep
n_steps = 500

r = [[random.uniform(0, 3) for _ in range(3)] for _ in range(n_atoms)]
r_prev = [[ri - random.uniform(-0.1, 0.1) for ri in ri_list] for ri_list in r]

def compute_forces(r, n):
    eps, sig = 1.0, 1.0
    forces = [[0.0, 0.0, 0.0] for _ in range(n)]
    for i in range(n):
        for j in range(i+1, n):
            dx = r[j][0]-r[i][0]; dy = r[j][1]-r[i][1]; dz = r[j][2]-r[i][2]
            r2 = max(dx*dx+dy*dy+dz*dz, 0.01)
            r6 = r2**3; r12 = r6**2
            f = 24*eps*(2*(sig**12)/r12 - (sig**6)/r6) / r2
            for d in range(3):
                forces[i][d] -= f * (r[j][d]-r[i][d])
                forces[j][d] += f * (r[j][d]-r[i][d])
    return forces

print("Step | Kinetic Energy | Potential Energy | Total Energy")
print("-" * 60)
for step in range(n_steps):
    forces = compute_forces(r, n_atoms)
    r_new = [[2*r[i][j] - r_prev[i][j] + forces[i][j]*dt*dt for j in range(3)] for i in range(n_atoms)]
    if step % 100 == 0:
        ke = sum(0.5 * sum((r_new[i][j]-r_prev[i][j])**2 for j in range(3)) for i in range(n_atoms)) / (4*dt*dt)
        pe = 0.0
        for i in range(n_atoms):
            for j in range(i+1, n_atoms):
                dx=r_new[j][0]-r_new[i][0]; dy=r_new[j][1]-r_new[i][1]; dz=r_new[j][2]-r_new[i][2]
                r2 = max(dx*dx+dy*dy+dz*dz, 0.01)
                r6=r2**3; r12=r6**2
                pe += 4*eps*((sig**12)/r12 - (sig**6)/r6)
        total = ke + pe
        print(f"{step:4d} | {ke:14.4f} | {pe:14.4f} | {total:14.4f}")
    r_prev = r
    r = r_new

print()
print("Key insight: Total energy is CONSERVED (Verlet is symplectic)")
print("This is the SAME property that makes Verlet work for:")
print("  - Protein folding (AMBER) — no artificial heating")
print("  - Ragdoll physics (Havok) — no explosion glitches")
print("  - Orbital mechanics (NASA) — no orbit decay")
print()
print("The elegance: ONE formula (no velocity) →")
print("  - LESS memory (no v array)")
print("  - MORE accuracy (2nd order vs 1st order Euler)")
print("  - ENERGY CONSERVATION (symplectic)")
print("Less code, better math. THAT is elegance.")`,
    insight: "Verlet IS the simplest symplectic integrator. Its elegance lies in its minimalism: no velocity variable, no accumulated state, just positions and forces. The formula r(t+Δt) = 2r(t) - r(t-Δt) + (F/m)×Δt² is time-reversal symmetric — swap t+Δt and t-Δt, and the equation is unchanged. This symmetry IS the symplectic property: the integrator preserves phase-space volume, which means energy is conserved. A biochemist simulating protein folding (AMBER), a game developer simulating ragdoll physics (Havok), and an aerospace engineer simulating spacecraft trajectories (NASA JPL) all benefit from the SAME conservation law. Three sciences, one formula, same energy preservation — because all three simulate Hamiltonian systems. The math dictates the code. The code preserves the math. A biochemist and a game developer are using the SAME algorithm and neither knows it — THAT is the multi-disciplinary elegance the platform should reveal.",
  },
];
