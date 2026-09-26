#!/usr/bin/env python3
"""
Add math: string (LaTeX) fields to all 20 elegant-code cards.
Each card's math field contains the LaTeX derivation of its equation.
Renders in DeeperMathFold via KaTeXRenderer.

Idempotent: skips cards that already have a math: field.
"""
import re
from pathlib import Path

CARDS_FILE = Path("/home/z/my-project/src/app/_components/_elegant_code_cards.tsx")

# LaTeX derivations for each card (by card id).
LATEX_MATH = {
    "elegant-svd-cross-discipline": r"A = U \Sigma V^T \quad \text{where} \quad A \in \mathbb{R}^{m \times n}, \; U \in \mathbb{R}^{m \times m}, \; \Sigma \in \mathbb{R}^{m \times n}, \; V^T \in \mathbb{R}^{n \times n} \\ \Sigma = \text{diag}(\sigma_1, \sigma_2, \ldots, \sigma_r), \quad \sigma_1 \geq \sigma_2 \geq \cdots \geq \sigma_r \geq 0 \\ U^T U = I, \quad V^T V = I \quad \text{(orthogonal)} \\ \text{Eckart-Young:} \quad \min_{\text{rank}(B) \leq k} \|A - B\|_F = \|A - U_k \Sigma_k V_k^T\|_F = \sqrt{\sum_{i=k+1}^{r} \sigma_i^2}",
    "elegant-attention-cross-discipline": r"\text{Attention}(Q, K, V) = \text{softmax}\!\left(\frac{Q K^T}{\sqrt{d_k}}\right) V \\ Q = X W_Q, \quad K = X W_K, \quad V = X W_V \quad \text{where} \; X \in \mathbb{R}^{n \times d}, \; W_Q, W_K \in \mathbb{R}^{d \times d_k} \\ \text{softmax}(z)_i = \frac{e^{z_i}}{\sum_j e^{z_j}} \quad \text{(row-wise normalization)} \\ \text{Multi-head:} \quad \text{MultiHead}(Q,K,V) = \text{Concat}(\text{head}_1, \ldots, \text{head}_h) W^O \\ \text{where} \; \text{head}_i = \text{Attention}(Q W_i^Q, K W_i^K, V W_i^V)",
    "elegant-poisson-cross-discipline": r"P(k \mid \lambda) = \frac{\lambda^k e^{-\lambda}}{k!} \quad \text{for} \; k = 0, 1, 2, \ldots \\ \mathbb{E}[X] = \lambda, \quad \text{Var}(X) = \lambda \\ F(k) = P(X \leq k) = \sum_{i=0}^{k} \frac{\lambda^i e^{-\lambda}}{i!} = \frac{\Gamma(k+1, \lambda)}{k!} \\ \text{Law of rare events:} \quad \lim_{\substack{N \to \infty \\ p \to 0 \\ Np = \lambda}} \binom{N}{k} p^k (1-p)^{N-k} = \frac{\lambda^k e^{-\lambda}}{k!}",
    "elegant-fft-cross-discipline": r"X[k] = \sum_{n=0}^{N-1} x[n] \, e^{-2\pi i k n / N} \quad \text{for} \; k = 0, 1, \ldots, N-1 \\ \text{Cooley-Tukey (radix-2):} \quad X[k] = X_{\text{even}}[k] + \omega_N^k X_{\text{odd}}[k] \\ \text{where} \; \omega_N = e^{-2\pi i / N} \quad \text{(primitive Nth root of unity)} \\ \text{Complexity:} \quad T(N) = 2T(N/2) + O(N) = O(N \log N) \\ \text{Parseval:} \quad \sum_{n=0}^{N-1} |x[n]|^2 = \frac{1}{N} \sum_{k=0}^{N-1} |X[k]|^2",
    "elegant-verlet-cross-discipline": r"\mathbf{r}(t + \Delta t) = 2\mathbf{r}(t) - \mathbf{r}(t - \Delta t) + \frac{\mathbf{F}(t)}{m} \Delta t^2 \\ \text{Velocity (post-hoc):} \quad \mathbf{v}(t) = \frac{\mathbf{r}(t + \Delta t) - \mathbf{r}(t - \Delta t)}{2 \Delta t} \\ \text{Energy conservation:} \quad \text{Verlet is symplectic} \implies \text{phase-space volume preserved} \\ \implies \Delta H = 0 \quad \text{(no energy drift over long runs)}",
    "elegant-navier-stokes-cross-discipline": r"\rho \left( \frac{\partial \mathbf{u}}{\partial t} + \mathbf{u} \cdot \nabla \mathbf{u} \right) = -\nabla p + \mu \nabla^2 \mathbf{u} + \mathbf{f} \\ \nabla \cdot \mathbf{u} = 0 \quad \text{(incompressibility)} \\ \text{Reynolds number:} \quad Re = \frac{\rho v L}{\mu} \\ Re \ll 1: \text{laminar} \quad Re \gg 1: \text{turbulent} \\ \text{Clay Millennium Prize: existence and uniqueness of smooth solutions (unsolved)}",
    "elegant-gradient-descent-cross-discipline": r"\boldsymbol{\theta}_{t+1} = \boldsymbol{\theta}_t - \eta \nabla_{\theta} \mathcal{L}(\boldsymbol{\theta}_t) \\ \text{Convergence:} \quad \mathcal{L}(\theta_t) - \mathcal{L}(\theta^*) \leq \frac{\|\theta_0 - \theta^*\|^2}{2 \eta t} \quad \text{(convex, smooth)} \\ \text{Adam:} \quad m_t = \beta_1 m_{t-1} + (1-\beta_1) g_t \\ v_t = \beta_2 v_{t-1} + (1-\beta_2) g_t^2 \\ \theta_{t+1} = \theta_t - \eta \frac{\hat{m}_t}{\sqrt{\hat{v}_t} + \epsilon}",
    "elegant-bayes-cross-discipline": r"P(H \mid D) = \frac{P(D \mid H) \, P(H)}{P(D)} \\ \text{where:} \quad P(H) = \text{prior}, \; P(D \mid H) = \text{likelihood}, \; P(H \mid D) = \text{posterior} \\ \text{Marginal:} \quad P(D) = \sum_i P(D \mid H_i) P(H_i) \\ \text{Odds form:} \quad \underbrace{\frac{P(H_1 \mid D)}{P(H_0 \mid D)}}_{\text{posterior odds}} = \underbrace{\frac{P(D \mid H_1)}{P(D \mid H_0)}}_{\text{Bayes factor}} \times \underbrace{\frac{P(H_1)}{P(H_0)}}_{\text{prior odds}}",
    "elegant-euler-cross-discipline": r"y(t + \Delta t) = y(t) + f(t, y(t)) \, \Delta t \\ \text{Local truncation error:} \quad O(\Delta t^2) \\ \text{Global error:} \quad O(\Delta t) \\ \text{Stability (for } y' = \lambda y\text{):} \quad |1 + \lambda \Delta t| \leq 1 \\ \implies \Delta t \leq \frac{2}{|\lambda|} \quad \text{(stability limit)} \\ \text{Euler-Maruyama (SDE):} \quad \Delta S = \mu S \, \Delta t + \sigma S \, \Delta W",
    "elegant-entropy-cross-discipline": r"H(X) = -\sum_{i=1}^{n} p_i \log p_i \quad \text{(Shannon 1948)} \\ S = k_B \ln W \quad \text{(Boltzmann 1877)} \\ \text{Additivity:} \quad H(X, Y) = H(X) + H(Y \mid X) \\ \text{Max entropy (uniform):} \quad H_{\max} = \log n \\ \text{KL divergence:} \quad D_{\text{KL}}(P \| Q) = \sum_i p_i \log \frac{p_i}{q_i} \\ \text{Mutual information:} \quad I(X; Y) = H(X) + H(Y) - H(X, Y)",
    "elegant-black-scholes-cross-discipline": r"C = S \, N(d_1) - K e^{-rT} N(d_2) \\ d_1 = \frac{\ln(S/K) + (r + \sigma^2/2) T}{\sigma \sqrt{T}}, \quad d_2 = d_1 - \sigma \sqrt{T} \\ N(x) = \frac{1}{\sqrt{2\pi}} \int_{-\infty}^{x} e^{-t^2/2} dt \quad \text{(standard normal CDF)} \\ \text{Greeks:} \quad \Delta = N(d_1), \quad \Gamma = \frac{N'(d_1)}{S \sigma \sqrt{T}}, \quad \nu = S \sqrt{T} \, N'(d_1) \\ \text{ATM approx:} \quad C \approx \frac{S \sigma \sqrt{T}}{\sqrt{2\pi}} \quad \text{(linear in } \sigma\text{)}",
    "elegant-haversine-cross-discipline": r"d = 2R \arcsin\!\left(\sqrt{\sin^2\!\left(\frac{\Delta\varphi}{2}\right) + \cos\varphi_1 \cos\varphi_2 \sin^2\!\left(\frac{\Delta\lambda}{2}\right)}\right) \\ \text{where:} \quad \Delta\varphi = \varphi_2 - \varphi_1, \quad \Delta\lambda = \lambda_2 - \lambda_1 \\ R = 6371 \text{ km (Earth)} \quad \text{or} \quad R = 1 \text{ (unit sphere, celestial)} \\ \text{Avoids catastrophic cancellation in:} \\ \cos(\Delta\sigma) = \sin\varphi_1 \sin\varphi_2 + \cos\varphi_1 \cos\varphi_2 \cos(\Delta\lambda) \\ \text{For small } \Delta\sigma: \quad 1 - \cos(\Delta\sigma) \approx 0 \implies \text{precision lost} \\ \text{Haversine:} \quad \text{hav}(\theta) = \sin^2(\theta/2) = \frac{1 - \cos\theta}{2} \quad \text{(well-conditioned)}",
    "elegant-kelly-criterion-cross-discipline": r"f^* = \frac{bp - q}{b} = \frac{\mu}{\sigma^2} \\ \text{where:} \quad b = \text{odds (net)}, \; p = P(\text{win}), \; q = 1 - p \\ \text{Expected log-growth:} \quad g = f\mu - \frac{f^2 \sigma^2}{2} \\ \text{Maximise } g \implies f^* = \frac{\mu}{\sigma^2} \\ \text{Wealth dynamics:} \quad W_n = W_0 \prod_{i=1}^{n} (1 + f r_i) \\ \text{Long-run:} \quad \frac{1}{n}\ln W_n \xrightarrow{a.s.} g(f^*)",
    "elegant-markov-chain-cross-discipline": r"\boldsymbol{\pi}(t+1) = \boldsymbol{\pi}(t) \, P \\ \text{where} \; P_{ij} = P(X_{t+1} = j \mid X_t = i) \quad \text{(transition matrix)} \\ \sum_j P_{ij} = 1 \quad \text{(stochastic)} \\ \text{Stationary distribution:} \quad \boldsymbol{\pi}^* = \boldsymbol{\pi}^* P \\ \text{Detailed balance:} \quad \pi_i P_{ij} = \pi_j P_{ji} \\ \text{Spectral gap:} \quad \lambda_2(P) < 1 \implies \text{geometric convergence to } \pi^*",
    "elegant-value-at-risk-cross-discipline": r"\text{VaR}_\alpha = -(\mu + z_\alpha \sigma) \\ \text{where:} \quad z_\alpha = \Phi^{-1}(1 - \alpha), \quad \Phi = \text{standard normal CDF} \\ z_{0.99} = 2.326, \quad z_{0.95} = 1.645 \\ \text{Expected Shortfall (ES):} \quad \text{ES}_\alpha = \mu + \frac{\sigma \phi(z_\alpha)}{1 - \alpha} \\ \text{where} \; \phi = \text{standard normal PDF} \\ \text{Basel III: daily 99% VaR. Solvency II: weekly 95% VaR. FEMA: 100-year flood.}",
    "elegant-pagerank-cross-discipline": r"PR(p) = \frac{1-d}{N} + d \sum_{q \in M(p)} \frac{PR(q)}{L(q)} \\ \text{where:} \quad d = \text{damping factor (typically 0.85)}, \; N = |V| \\ M(p) = \text{set of pages linking to } p, \; L(q) = \text{out-degree of } q \\ \text{Matrix form:} \quad \mathbf{PR} = \frac{1-d}{N} \mathbf{1} + d \, M^T \mathbf{D}^{-1} \mathbf{PR} \\ \text{Convergence:} \quad \text{Perron-Frobenius theorem} \implies \text{unique positive eigenvector}",
    "elegant-kalman-filter-cross-discipline": r"\hat{\mathbf{x}}_{t+1|t} = F \hat{\mathbf{x}}_{t|t} \quad \text{(predict)} \\ P_{t+1|t} = F P_{t|t} F^T + Q \quad \text{(prior covariance)} \\ \mathbf{K}_t = P_{t+1|t} H^T (H P_{t+1|t} H^T + R)^{-1} \quad \text{(Kalman gain)} \\ \hat{\mathbf{x}}_{t+1|t+1} = \hat{\mathbf{x}}_{t+1|t} + \mathbf{K}_t (\mathbf{z}_t - H \hat{\mathbf{x}}_{t+1|t}) \quad \text{(update)} \\ P_{t+1|t+1} = (I - \mathbf{K}_t H) P_{t+1|t} \\ \text{MMSE optimal for linear-Gaussian systems}",
    "elegant-monte-carlo-cross-discipline": r"\mathbb{E}[f(X)] \approx \frac{1}{N} \sum_{i=1}^{N} f(X_i) \quad \text{where} \; X_i \stackrel{iid}{\sim} p(X) \\ \text{Law of Large Numbers:} \quad \frac{1}{N}\sum_{i=1}^{N} f(X_i) \xrightarrow{a.s.} \mathbb{E}[f(X)] \\ \text{Central Limit Theorem:} \quad \sqrt{N}\left(\hat{\mu}_N - \mu\right) \xrightarrow{d} \mathcal{N}(0, \sigma^2) \\ \text{Standard error:} \quad \text{SE} = \frac{\sigma}{\sqrt{N}} \quad \text{(halving error quadruples N)}",
    "elegant-gbm-cross-discipline": r"dS = \mu S \, dt + \sigma S \, dW \\ \text{Solution:} \quad S_T = S_0 \exp\!\left(\left(\mu - \frac{\sigma^2}{2}\right) T + \sigma W(T)\right) \\ \ln S_T \sim \mathcal{N}\!\left(\ln S_0 + \left(\mu - \frac{\sigma^2}{2}\right) T, \; \sigma^2 T\right) \\ \mathbb{E}[S_T] = S_0 e^{\mu T}, \quad \text{Var}[S_T] = S_0^2 e^{2\mu T}\left(e^{\sigma^2 T} - 1\right) \\ \text{Itô's lemma:} \quad d(\ln S) = \frac{dS}{S} - \frac{\sigma^2}{2} dt = \left(\mu - \frac{\sigma^2}{2}\right) dt + \sigma dW",
    "elegant-lloyd-kmeans-cross-discipline": r"\boldsymbol{\mu}_k \leftarrow \frac{1}{|S_k|} \sum_{\mathbf{x} \in S_k} \mathbf{x} \quad \text{where} \; S_k = \{\mathbf{x}_i : c(i) = k\} \\ c(i) = \argmin_{k} \|\mathbf{x}_i - \boldsymbol{\mu}_k\|^2 \quad \text{(assignment)} \\ \text{Objective:} \quad J = \sum_{i=1}^{N} \sum_{k=1}^{K} \mathbb{1}[c(i)=k] \|\mathbf{x}_i - \boldsymbol{\mu}_k\|^2 \\ \text{Convergence:} \quad J \text{ decreases monotonically (EM on isotropic GMM)} \\ \text{k-means++:} \quad D(\mathbf{x})^2\text{-weighted init} \implies O(\log k)\text{-approx guarantee}",
}


def add_math_to_card(src: str, card_id: str, latex: str) -> tuple[str, bool]:
    """Add math: field to a card if not already present."""
    # Skip if already has math:
    id_marker = f'id: "{card_id}"'
    id_idx = src.find(id_marker)
    if id_idx == -1:
        return src, False
    
    # Find the closing of this card object
    close_idx = src.find("},", id_idx)
    if close_idx == -1:
        return src, False
    
    # Check if math: already exists
    card_block = src[id_idx:close_idx]
    if "math:" in card_block:
        return src, False
    
    # Escape the LaTeX for TS backtick string
    escaped = latex.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")
    
    # Insert math: field before the closing },
    math_field = f'    math: `{escaped}`,\n'
    
    new_src = src[:close_idx] + math_field + src[close_idx:]
    return new_src, True


def main():
    src = CARDS_FILE.read_text()
    total = 0
    for card_id, latex in LATEX_MATH.items():
        new_src, modified = add_math_to_card(src, card_id, latex)
        if modified:
            src = new_src
            total += 1
            print(f"  + added math: to {card_id}")
        else:
            print(f"  = already has math: {card_id}")
    if total > 0:
        CARDS_FILE.write_text(src)
    print(f"\nAdded LaTeX math to {total} cards.")


if __name__ == "__main__":
    main()
