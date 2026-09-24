// ============================================================
// Multi-language quant code constants — Part 5
// 3 more scenarios × 4 languages (Python / Rust / Scala / Elixir)
// Scenarios: Heston stochastic vol, Hull-White rates, SABR vol-surface
// Each Python example includes synthetic data + a hypothetical scenario.
// ============================================================
// NOTE: Python f-strings use "USD" or other text instead of "${...}" to
// avoid JS template-literal interpolation conflicts.

// ------------------------------------------------------------
// SCENARIO 9: Heston Stochastic Volatility (Heston 1993)
// ------------------------------------------------------------

export const HESTON_PYTHON = `import math
import random

# ============================================================
# Heston Stochastic Volatility Model (Heston 1993)
#
#   dv_t = κ·(θ - v_t)·dt + ξ·√v_t·dW_v  (variance SDE)
#   dS_t = μ·S_t·dt + √v_t·S_t·dW_s      (spot SDE)
#   Correlation: corr(dW_s, dW_v) = ρ
#
# Parameters: v0=0.04, κ=2.0, θ=0.04, ξ=0.3, ρ=-0.7
# These produce a "leverage smile" typical of equity indices.
#
# HYPOTHETICAL SCENARIO:
#   An exotic-derivatives desk prices a 1-year European call on
#   AAPL under Heston. Their synthetic market data: a Bloomberg-style
#   implied-vol smile on 7 strikes — the desk needs to fit the Heston
#   params and compute the model price via Monte Carlo.
# ============================================================

def norm_cdf(x):
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2)))

def bs_call_price(S, K, T, r, sigma):
    if T <= 0 or sigma <= 0:
        return max(S - K, 0.0)
    d1 = (math.log(S/K) + (r + 0.5*sigma**2)*T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    return S * norm_cdf(d1) - K * math.exp(-r*T) * norm_cdf(d2)

def heston_simulate(S0, v0, mu, kappa, theta, xi, rho, T, n_steps, n_paths, seed=42):
    """Euler-Maruyama simulation of Heston with full truncation (neg-var fix)."""
    random.seed(seed)
    dt = T / n_steps
    paths_S = []
    paths_v = []
    for _ in range(n_paths):
        S, v = S0, v0
        path_S = [S]; path_v = [v]
        for _ in range(n_steps):
            Z1 = random.gauss(0, 1)
            # Correlated Brownian: Z2 = ρ·Z1 + √(1-ρ²)·Z_perp
            Z_perp = random.gauss(0, 1)
            Z2 = rho * Z1 + math.sqrt(1 - rho**2) * Z_perp
            # Variance SDE (full truncation: max(v, 0) inside sqrt)
            v_new = v + kappa * (theta - v) * dt + xi * math.sqrt(max(v, 0)) * math.sqrt(dt) * Z2
            v_new = max(v_new, 0.0)  # truncate negative variance
            # Spot SDE
            S_new = S * math.exp((mu - 0.5 * v) * dt + math.sqrt(max(v, 0)) * math.sqrt(dt) * Z1)
            S, v = S_new, v_new
            path_S.append(S); path_v.append(v)
        paths_S.append(path_S); paths_v.append(path_v)
    return paths_S, paths_v

# --- Heston parameters (equity-index typical) ---
S0, v0 = 100.0, 0.04
kappa, theta, xi, rho = 2.0, 0.04, 0.3, -0.7
mu, r, T = 0.05, 0.05, 1.0
K = 100.0

# --- HYPOTHETICAL SCENARIO: synthetic market implied vols ---
# These are the "Bloomberg quotes" the desk is trying to fit
random.seed(123)
market_vols = {80: 0.28, 85: 0.24, 90: 0.21, 95: 0.19, 100: 0.18,
               105: 0.19, 110: 0.21, 115: 0.235, 120: 0.26}

print("=== Heston Stochastic Volatility Pricing ===")
print(f"  Heston params: v0={v0}, κ={kappa}, θ={theta}, ξ={xi}, ρ={rho}")
print(f"  Hypothetical: 1y ATM European call on AAPL, S0=USD {S0}, K=USD {K}")
print()
print(f"  Synthetic market implied vol smile:")
for k, v in market_vols.items():
    print(f"    K={k}:  {v*100:.1f}%")
print()

# --- Monte Carlo pricing under Heston ---
paths_S, paths_v = heston_simulate(S0, v0, mu, kappa, theta, xi, rho, T, 252, 5000, seed=42)
final_S = [p[-1] for p in paths_S]
final_v = [p[-1] for p in paths_v]
mean_payoff = sum(max(s - K, 0.0) for s in final_S) / len(final_S)
heston_price = math.exp(-r * T) * mean_payoff

# --- Compare with BS (constant vol = theta) ---
bs_price = bs_call_price(S0, K, T, r, math.sqrt(theta))

print(f"  Heston MC price (5000 paths, 252 steps):  USD {heston_price:.4f}")
print(f"  BS price (constant vol=sqrt(θ)={math.sqrt(theta)*100:.1f}%):  USD {bs_price:.4f}")
print(f"  Diff: Heston - BS = USD {heston_price - bs_price:.4f}")
print(f"  Reason: Heston with negative ρ produces a left-skewed smile →")
print(f"          OTM puts more expensive than BS, ATM ≈ BS.")
print()

# --- Variance statistics ---
mean_v = sum(final_v) / len(final_v)
print(f"  Terminal variance: mean={mean_v:.4f} (long-run θ={theta})")
print(f"  Vol-of-vol (ξ={xi}) makes tails fatter than lognormal BS.")
print()
print("Key insight: Heston's ρ<0 produces the equity-index leverage smile")
print("(spot down → vol up). The ξ parameter controls vol-of-vol and tail fatness.")
print("Production: Heston calibrated to SPX option surface every minute at JPM/GS.")`;

export const HESTON_RUST = `use rand::{Rng, SeedableRng};
use rand::rngs::StdRng;
use rayon::prelude::*;
use statrs::distribution::{Normal, Distribution};

/// Heston stochastic volatility model.
/// dv_t = κ(θ - v_t) dt + ξ·√v_t·dW_v
/// dS_t = μ·S_t·dt + √v_t·S_t·dW_s   with corr(dW_s, dW_v) = ρ
pub struct HestonModel {
    pub v0: f64, pub kappa: f64, pub theta: f64,
    pub xi: f64, pub rho: f64, pub mu: f64,
}

#[derive(Clone)]
pub struct HestonPath {
    pub spot: Vec<f64>,
    pub variance: Vec<f64>,
}

impl HestonModel {
    /// Euler-Maruyama simulation with full truncation (variance >= 0).
    pub fn simulate(&self, s0: f64, t: f64, n_steps: usize,
                    n_paths: usize, seed: u64) -> Vec<HestonPath> {
        let dt = t / n_steps as f64;
        let n = Normal::new(0.0, 1.0).unwrap();
        (0..n_paths).map(|i| {
            let mut rng = StdRng::seed_from_u64(seed + i as u64);
            let mut s = s0;
            let mut v = self.v0;
            let mut path = HestonPath {
                spot: vec![s], variance: vec![v] };
            for _ in 0..n_steps {
                let z1: f64 = rng.gen();
                let z_perp: f64 = rng.gen();
                let z2 = self.rho * z1 + (1.0 - self.rho.powi(2)).sqrt() * z_perp;
                let v_new = v + self.kappa * (self.theta - v) * dt
                          + self.xi * v.max(0.0).sqrt() * dt.sqrt() * z2;
                let v_clamped = v_new.max(0.0);
                let s_new = s * ((self.mu - 0.5 * v) * dt
                          + v.max(0.0).sqrt() * dt.sqrt() * z1).exp();
                s = s_new; v = v_clamped;
                path.spot.push(s); path.variance.push(v);
            }
            path
        }).collect()
    }

    /// Price European call via Monte Carlo (parallel via Rayon).
    pub fn price_call(&self, s0: f64, k: f64, t: f64,
                      r: f64, n_paths: usize) -> f64 {
        let paths = self.simulate(s0, t, 252, n_paths, 42);
        let mean_payoff = paths.par_iter()
            .map(|p| (p.spot[252] - k).max(0.0))
            .sum::<f64>() / n_paths as f64;
        (-r * t).exp() * mean_payoff
    }
}`;

export const HESTON_SCALA = `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._
import org.apache.spark.sql.expressions.UserDefinedFunction

/**
 * Distributed Heston calibration across an option surface.
 * Used at JP Morgan/Goldman for index vol surface management.
 *
 * Calibration: minimize MSE between model and market implied vols
 * across all strikes/maturities. Joint optimization over (κ, θ, ξ, ρ, v0).
 */
object HestonModel {

  case class HestonParams(v0: Double, kappa: Double, theta: Double,
                          xi: Double, rho: Double)

  /** One-step Heston Euler-Maruyama (full truncation). */
  def step(s: Double, v: Double, mu: Double, kappa: Double,
           theta: Double, xi: Double, rho: Double, dt: Double,
           rng: scala.util.Random): (Double, Double) = {
    val z1 = rng.nextGaussian()
    val zPerp = rng.nextGaussian()
    val z2 = rho * z1 + math.sqrt(1 - rho * rho) * zPerp
    val vNew = math.max(0.0, v + kappa * (theta - v) * dt +
      xi * math.sqrt(math.max(v, 0)) * math.sqrt(dt) * z2)
    val sNew = s * math.exp((mu - 0.5 * v) * dt +
      math.sqrt(math.max(v, 0)) * math.sqrt(dt) * z1)
    (sNew, vNew)
  }

  /** One Heston path simulation. */
  def simulate(s0: Double, params: HestonParams, t: Double,
               nSteps: Int, seed: Long): (Array[Double], Array[Double]) = {
    val rng = new scala.util.Random(seed)
    val dt = t / nSteps
    val sPath = new Array[Double](nSteps + 1)
    val vPath = new Array[Double](nSteps + 1)
    sPath(0) = s0; vPath(0) = params.v0
    for (i <- 1 to nSteps) {
      val (s, v) = step(sPath(i-1), vPath(i-1), 0.05, params.kappa,
        params.theta, params.xi, params.rho, dt, rng)
      sPath(i) = s; vPath(i) = v
    }
    (sPath, vPath)
  }

  /** Distributed Monte Carlo price. */
  def priceCall(spark: SparkSession, s0: Double, k: Double, t: Double,
                r: Double, params: HestonParams, nPaths: Int): Double = {
    val paths = spark.sparkContext.parallelize(0L until nPaths, 200)
      .map { i => simulate(s0, params, t, 252, i + 42)._1 }
    val payoffs = paths.map(p => math.max(p.last - k, 0.0))
    val mean = payoffs.reduce(_ + _) / nPaths
    math.exp(-r * t) * mean
  }

  /** Calibrate Heston params to implied vol surface via Levenberg-Marquardt. */
  def calibrate(marketQuotes: Seq[(Double, Double, Double)],
                initial: HestonParams): HestonParams = {
    // Minimize Σ_i (σ_market(K_i, T_i) - σ_model(params, K_i, T_i))²
    // Implemented via Breeze LM — omitted for brevity
    initial
  }
}`;

export const HESTON_ELIXIR = `defmodule Quant.Heston do
  @moduledoc """
  Heston stochastic volatility model — streaming Monte Carlo inference
  via Nx (BEAM JIT). Each tick triggers a fresh path simulation.

  HYPOTHETICAL SCENARIO: an exotic desk prices a barrier option under
  Heston, recalculating every 30 seconds as spot/vol params shift.
  """

  use GenServer
  alias Nx, as: N

  defstruct [:params, :n_paths, :cache]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    {:ok, %__MODULE__{
      params: %{v0: 0.04, kappa: 2.0, theta: 0.04, xi: 0.3, rho: -0.7, mu: 0.05},
      n_paths: 5000,
      cache: %{}
    }}
  end

  @impl true
  def handle_call({:price_call, s0, k, t, r}, _from, state) do
    # Simulate n_paths Heston paths in parallel via Flow
    paths = simulate_paths(s0, state.params, t, 252, state.n_paths)
    final_S = Enum.map(paths, fn {s_path, _v_path} -> List.last(s_path) end)
    mean_payoff = final_S
      |> Enum.map(&max(&1 - k, 0.0))
      |> Enum.sum()
      |> Kernel./(state.n_paths)
    price = :math.exp(-r * t) * mean_payoff
    {:reply, price, state}
  end

  # Euler-Maruyama with full truncation (parallel via Flow)
  defp simulate_paths(s0, params, t, n_steps, n_paths) do
    0..(n_paths - 1)
    |> Flow.from_enumerable(stages: System.schedulers_online() * 4)
    |> Flow.map(fn i -> simulate_one_path(s0, params, t, n_steps, i + 42) end)
    |> Enum.to_list()
  end

  defp simulate_one_path(s0, params, t, n_steps, seed) do
    :rand.seed(:exsss, seed)
    dt = t / n_steps

    Enum.reduce(1..n_steps, {[s0], [params.v0]}, fn _, {s_acc, v_acc} ->
      s_prev = List.last(s_acc)
      v_prev = List.last(v_acc)
      z1 = :rand.normal()
      z_perp = :rand.normal()
      z2 = params.rho * z1 + :math.sqrt(1 - params.rho * params.rho) * z_perp
      v_new = max(0.0, v_prev + params.kappa * (params.theta - v_prev) * dt +
        params.xi * :math.sqrt(max(v_prev, 0)) * :math.sqrt(dt) * z2)
      s_new = s_prev * :math.exp((params.mu - 0.5 * v_prev) * dt +
        :math.sqrt(max(v_prev, 0)) * :math.sqrt(dt) * z1)
      {s_acc ++ [s_new], v_acc ++ [v_new]}
    end)
  end
end`;

// ------------------------------------------------------------
// SCENARIO 10: Hull-White Interest Rate Model (Hull-White 1990)
// ------------------------------------------------------------

export const HULL_WHITE_PYTHON = `import math
import random

# ============================================================
# Hull-White One-Factor Interest Rate Model (Hull-White 1990)
#
#   dr_t = (θ(t) - a·r_t)·dt + σ·dW_t
#
# Where:
#   a   = mean reversion speed (typical 0.1-0.5)
#   σ   = vol of short rate (typical 0.005-0.02)
#   θ(t) = time-dependent drift calibrated to current yield curve
#
# HYPOTHETICAL SCENARIO:
#   A corporate treasurer at Acme Corp needs to value a 5-year
#   interest rate swap: receive fixed 4%, pay floating 3M LIBOR,
#   notional USD 10M. The yield curve is upward-sloping (3M=3.5%,
#   5y=4.2%). Hull-White is calibrated to this curve; the swap
#   value is the PV of (fixed - floating) cashflows.
# ============================================================

def hull_white_simulate(r0, a, sigma, theta_t_fn, T, n_steps, n_paths, seed=42):
    """Euler-Maruyama simulation of Hull-White short rate."""
    random.seed(seed)
    dt = T / n_steps
    paths = []
    for _ in range(n_paths):
        r = r0
        path = [r]
        for i in range(n_steps):
            t = i * dt
            theta = theta_t_fn(t)
            r_new = r + (theta - a * r) * dt + sigma * math.sqrt(dt) * random.gauss(0, 1)
            r = r_new
            path.append(r)
        paths.append(path)
    return paths

def discount_factor_hull_white(paths, t, dt):
    """Compute zero-coupon bond P(0,T) = E[exp(-∫r dt)] from rate paths."""
    # Numerical integration of rate path: discount each path then average
    n_paths = len(paths)
    disc_factors = []
    for path in paths:
        # Trapezoid integration of r from 0 to t
        steps = int(t / dt)
        if steps >= len(path):
            steps = len(path) - 1
        integral = 0.5 * (path[0] + path[steps]) * dt
        for i in range(1, steps):
            integral += path[i] * dt
        disc_factors.append(math.exp(-integral))
    return sum(disc_factors) / n_paths

def swap_value(notional, fixed_rate, paths, dt, payment_dates):
    """Value a fixed-vs-floating swap from simulated rate paths.
    payment_dates: list of year fractions [0.25, 0.5, ..., 5.0].
    """
    pv_fixed = 0.0
    pv_float = 0.0
    for i in range(len(payment_dates) - 1):
        t_start = payment_dates[i]
        t_end = payment_dates[i + 1]
        tau = t_end - t_start  # accrual period
        # Fixed leg: notional * fixed_rate * tau, discounted
        disc = discount_factor_hull_white(paths, t_end, dt)
        pv_fixed += notional * fixed_rate * tau * disc
        # Floating leg: r(t_start) * tau, discounted
        # r(t_start) = average short rate at t_start across paths
        step_idx = int(t_start / dt)
        avg_r = sum(p[step_idx] for p in paths) / len(paths)
        pv_float += notional * avg_r * tau * disc
    return pv_fixed - pv_float

# --- Hypothetical scenario parameters ---
r0 = 0.035  # initial short rate (3.5%)
a = 0.10    # mean reversion speed (slow)
sigma = 0.012  # 1.2% short-rate vol
T = 5.0     # 5-year horizon
notional = 10_000_000  # USD 10M
fixed_rate = 0.04  # receive 4% fixed

# Synthetic yield curve (upward-sloping)
yield_curve = {0.25: 0.035, 0.5: 0.037, 1.0: 0.039, 2.0: 0.041, 3.0: 0.042, 5.0: 0.042}

# Theta(t) calibrated to fit yield curve (simplified: constant 0.04)
def theta_t(t):
    # In production: solve ODE theta'(t) = a * d/dt[ln P(0,t)] + d²/dt²[ln P(0,t)]
    # Here: use a piecewise approximation
    return 0.04 + 0.001 * t  # slight upward drift

print("=== Hull-White Interest Rate Swap Valuation ===")
print(f"  Hypothetical: 5y IRS, receive fixed {fixed_rate*100:.1f}% vs 3M float")
print(f"  Notional: USD {notional:,}")
print(f"  Hull-White params: r0={r0*100:.1f}%, a={a}, σ={sigma*100:.2f}%")
print()
print(f"  Synthetic yield curve (3M to 5Y):")
for t, y in yield_curve.items():
    print(f"    {t}y: {y*100:.2f}%")
print()

# --- Simulate 1000 paths, 252 steps ---
n_steps = 252
dt = T / n_steps
paths = hull_white_simulate(r0, a, sigma, theta_t, T, n_steps, 1000, seed=42)

# --- Compute discount factors ---
for t_check in [0.5, 1.0, 2.0, 5.0]:
    disc = discount_factor_hull_white(paths, t_check, dt)
    print(f"  P(0,{t_check}y) = {disc:.4f}  (implied yield: {(1/disc - 1)/t_check * 100:.2f}%)")

# --- Value the swap ---
payment_dates = [0.25 * i for i in range(1, 21)]  # quarterly payments
swap_pv = swap_value(notional, fixed_rate, paths, dt, payment_dates)
print()
print(f"  Swap value (receive fixed): USD {swap_pv:,.2f}")
print(f"  {'Payer' if swap_pv < 0 else 'Receiver'} perspective: {'gain' if swap_pv > 0 else 'loss'}")
print()
print("Key insight: Hull-White mean-reversion (a) controls how fast rates")
print("return to θ(t). With a=0.10 (slow), 5y rates can drift far from r0.")
print("Production: θ(t) calibrated via strip of market zero-coupon yields.")`;

export const HULL_WHITE_RUST = `use rand::{Rng, SeedableRng};
use rand::rngs::StdRng;
use rayon::prelude::*;

/// Hull-White one-factor interest-rate model.
/// dr_t = (θ(t) - a·r_t)·dt + σ·dW_t
pub struct HullWhiteModel {
    pub a: f64,        // mean reversion speed
    pub sigma: f64,    // short-rate volatility
    pub theta_fn: Box<dyn Fn(f64) -> f64 + Sync + Send>,  // time-dependent drift
}

impl HullWhiteModel {
    /// Euler-Maruyama simulation of short-rate paths.
    pub fn simulate(&self, r0: f64, t: f64, n_steps: usize,
                    n_paths: usize, seed: u64) -> Vec<Vec<f64>> {
        let dt = t / n_steps as f64;
        (0..n_paths).map(|i| {
            let mut rng = StdRng::seed_from_u64(seed + i as u64);
            let mut r = r0;
            let mut path = Vec::with_capacity(n_steps + 1);
            path.push(r);
            for step in 0..n_steps {
                let time = step as f64 * dt;
                let theta = (self.theta_fn)(time);
                let z: f64 = rng.gen();
                r = r + (theta - self.a * r) * dt
                    + self.sigma * dt.sqrt() * z;
                path.push(r);
            }
            path
        }).collect()
    }

    /// Zero-coupon bond P(0, t) = E[exp(-∫r dt)] via pathwise integration.
    pub fn discount_factor(&self, paths: &[Vec<f64>], t: f64,
                            dt: f64) -> f64 {
        let n_paths = paths.len() as f64;
        let steps = (t / dt) as usize;
        paths.iter().map(|p| {
            let integral: f64 = (0..steps).map(|i| p[i] * dt).sum::<f64>()
                + 0.5 * (p[0] + p[steps]) * dt;
            (-integral).exp()
        }).sum::<f64>() / n_paths
    }

    /// Value fixed-vs-floating swap via Monte Carlo.
    pub fn swap_value(&self, notional: f64, fixed_rate: f64,
                      paths: &[Vec<f64>], dt: f64,
                      payment_dates: &[f64]) -> f64 {
        let n_paths = paths.len() as f64;
        let mut pv_fixed = 0.0;
        let mut pv_float = 0.0;
        for i in 0..payment_dates.len() - 1 {
            let t_start = payment_dates[i];
            let t_end = payment_dates[i + 1];
            let tau = t_end - t_start;
            let disc = self.discount_factor(paths, t_end, dt);
            pv_fixed += notional * fixed_rate * tau * disc;
            let step_idx = (t_start / dt) as usize;
            let avg_r: f64 = paths.iter().map(|p| p[step_idx]).sum::<f64>() / n_paths;
            pv_float += notional * avg_r * tau * disc;
        }
        pv_fixed - pv_float
    }
}`;

export const HULL_WHITE_SCALA = `import org.apache.spark.sql.SparkSession
import org.apache.spark.rdd.RDD

/**
 * Distributed Hull-White calibration + swap valuation.
 * Used at fixed-income desks (PIMCO, BlackRock) for IR swap books.
 *
 * Theta(t) calibrated to the stripped zero curve; MC simulates rate
 * paths distributed across the Spark cluster.
 */
object HullWhiteModel {

  case class HWParams(a: Double, sigma: Double)

  /** One-step Euler-Maruyama. */
  def step(r: Double, params: HWParams, theta: Double, dt: Double,
           rng: scala.util.Random): Double = {
    val z = rng.nextGaussian()
    r + (theta - params.a * r) * dt + params.sigma * math.sqrt(dt) * z
  }

  /** One path simulation. */
  def simulate(r0: Double, params: HWParams, thetaFn: Double => Double,
               t: Double, nSteps: Int, seed: Long): Array[Double] = {
    val rng = new scala.util.Random(seed)
    val dt = t / nSteps
    val path = new Array[Double](nSteps + 1)
    path(0) = r0
    for (i <- 1 to nSteps) {
      val time = (i - 1) * dt
      path(i) = step(path(i - 1), params, thetaFn(time), dt, rng)
    }
    path
  }

  /** Distributed rate simulation across the cluster. */
  def simulateDistributed(spark: SparkSession, r0: Double,
                          params: HWParams, thetaFn: Double => Double,
                          t: Double, nPaths: Int): RDD[Array[Double]] = {
    spark.sparkContext.parallelize(0L until nPaths, 200)
      .map { i => simulate(r0, params, thetaFn, t, 252, i + 42) }
  }

  /** Distributed discount factor E[exp(-∫r dt)] from rate paths. */
  def discountFactor(paths: RDD[Array[Double]], t: Double,
                     dt: Double): Double = {
    val nSteps = (t / dt).toInt
    val sum = paths.map { p =>
      val integral = (0 until nSteps).map(i => p(i) * dt).sum +
                     0.5 * (p(0) + p(nSteps)) * dt
      math.exp(-integral)
    }.reduce(_ + _)
    sum / paths.count()
  }

  /** Value fixed-vs-floating IRS from rate paths. */
  def swapValue(paths: RDD[Array[Double]], params: HWParams,
                notional: Double, fixedRate: Double, dt: Double,
                paymentDates: Array[Double]): Double = {
    var pvFixed = 0.0
    var pvFloat = 0.0
    val nPaths = paths.count()
    for (i <- 0 until paymentDates.length - 1) {
      val tStart = paymentDates(i)
      val tEnd = paymentDates(i + 1)
      val tau = tEnd - tStart
      val disc = discountFactor(paths, tEnd, dt)
      pvFixed += notional * fixedRate * tau * disc
      val stepIdx = (tStart / dt).toInt
      val avgR = paths.map(p => p(stepIdx)).reduce(_ + _) / nPaths
      pvFloat += notional * avgR * tau * disc
    }
    pvFixed - pvFloat
  }
}`;

export const HULL_WHITE_ELIXIR = `defmodule Quant.HullWhite do
  @moduledoc """
  Hull-White one-factor rate model — streaming IR swap valuation
  over a live rate-tick feed.

  HYPOTHETICAL SCENARIO: a fixed-income desk values a USD 10M IRS
  every 30s as the curve shifts. The model recalibrates theta(t)
  from the live strip, then runs a 1000-path MC for the swap PV.
  """

  use GenServer

  defstruct [:params, :theta_fn, :cache]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    {:ok, %__MODULE__{
      params: %{a: 0.10, sigma: 0.012},
      theta_fn: fn t -> 0.04 + 0.001 * t end,
      cache: %{}
    }}
  end

  @impl true
  def handle_call({:swap_value, notional, fixed_rate, payment_dates, t}, _from, state) do
    # Simulate 1000 rate paths in parallel via Flow
    paths = simulate_paths(0.035, state.params, state.theta_fn, t, 252, 1000)
    dt = t / 252

    # PV fixed + PV float leg
    {pv_fixed, pv_float} =
      Enum.reduce(0..(length(payment_dates) - 2), {0.0, 0.0}, fn i, {pf, pl} ->
        t_start = Enum.at(payment_dates, i)
        t_end = Enum.at(payment_dates, i + 1)
        tau = t_end - t_start
        disc = discount_factor(paths, t_end, dt)
        step_idx = trunc(t_start / dt)
        avg_r = Enum.map(paths, &Enum.at(&1, step_idx))
                |> Enum.sum() |> Kernel./(length(paths))
        {pf + notional * fixed_rate * tau * disc,
         pl + notional * avg_r * tau * disc}
      end)
    {:reply, pv_fixed - pv_float, state}
  end

  defp simulate_paths(r0, params, theta_fn, t, n_steps, n_paths) do
    0..(n_paths - 1)
    |> Flow.from_enumerable(stages: System.schedulers_online() * 4)
    |> Flow.map(fn i -> simulate_one(r0, params, theta_fn, t, n_steps, i + 42) end)
    |> Enum.to_list()
  end

  defp simulate_one(r0, params, theta_fn, t, n_steps, seed) do
    :rand.seed(:exsss, seed)
    dt = t / n_steps
    Enum.reduce(1..n_steps, [r0], fn i, acc ->
      time = (i - 1) * dt
      theta = theta_fn.(time)
      z = :rand.normal()
      r_prev = List.last(acc)
      r_new = r_prev + (theta - params.a * r_prev) * dt +
        params.sigma * :math.sqrt(dt) * z
      acc ++ [r_new]
    end)
  end

  defp discount_factor(paths, t, dt) do
    n_steps = trunc(t / dt)
    n_paths = length(paths)
    sum = Enum.reduce(paths, 0.0, fn p, acc ->
      integral = Enum.reduce(0..(n_steps - 1), 0.0, fn i, s ->
        s + Enum.at(p, i) * dt
      end) + 0.5 * (Enum.at(p, 0) + Enum.at(p, n_steps)) * dt
      acc + :math.exp(-integral)
    end)
    sum / n_paths
  end
end`;

// ------------------------------------------------------------
// SCENARIO 11: SABR Volatility Model (Hagan 2002)
// ------------------------------------------------------------

export const SABR_PYTHON = `import math
import random

# ============================================================
# SABR Volatility Model (Hagan 2002)
#   dF = α·F^β·dW_F           (forward SDE)
#   dα = ν·α·dW_α             (vol-of-vol SDE)
#   Correlation: corr(dW_F, dW_α) = ρ
#
# Hagan's asymptotic implied vol formula (leading order):
#   σ_imp(K,F) ≈ α / (F^(1-β)) · (1 + correction terms)
#
# Parameters: α (initial vol), β (CEV exponent), ρ (corr), ν (vol of vol)
# Typical rates: β=0.5, ρ=-0.2, ν=0.3
# Typical equities: β=1.0, ρ=-0.7, ν=0.5
#
# HYPOTHETICAL SCENARIO:
#   A rates desk prices a swaption book. They have 7 synthetic
#   swaption quotes across strikes; they need to fit SABR params
#   and price the off-strip strikes.
# ============================================================

def sabr_implied_vol(F, K, T, alpha, beta, rho, nu):
    """Hagan 2002 approximate implied vol for SABR model.

    F     forward rate
    K     strike
    T     expiry (years)
    alpha initial vol (α)
    beta  CEV exponent (0 = normal, 1 = lognormal, 0.5 = typical rates)
    rho   correlation (typically -0.5 to -0.2 for rates)
    nu    vol of vol (typically 0.2 to 0.4)
    """
    if F == K:
        # ATM formula
        term1 = (1 - beta)**2 / 24 * alpha**2 / (F**(2 - 2*beta))
        term2 = rho * beta * nu * alpha / (4 * F**(1 - beta))
        term3 = (2 - 3*rho**2) / 24 * nu**2
        return alpha / F**(1 - beta) * (1 + (term1 + term2 + term3) * T)
    # Off-strike formula (Hagan's eq 2.17a, simplified)
    z = nu / alpha * (F * K)**((1 - beta)/2) * math.log(F / K)
    x_z = math.log((math.sqrt(1 - 2*rho*z + z**2) + z - rho) / (1 - rho))
    term1 = (1 - beta)**2 / 24 * alpha**2 / ((F*K)**((1 - beta)/2))**2
    term2 = rho * beta * nu * alpha / (4 * (F*K)**((1 - beta)/2))
    term3 = (2 - 3*rho**2) / 24 * nu**2
    multiplier = 1 + (term1 + term2 + term3) * T
    sigma = alpha / ((F*K)**((1 - beta)/2) * (1 + (1 - beta)**2/24 * math.log(F/K)**2
                  + (1 - beta)**4/1920 * math.log(F/K)**4)) * z / x_z * multiplier
    return sigma

# --- SABR params (typical rates desk) ---
F = 0.04   # 4% forward rate
alpha = 0.003   # 30bp initial vol
beta = 0.5
rho = -0.2
nu = 0.3
T = 5.0   # 5-year swaption

# --- Hypothetical market swaption quotes ---
# Strikes relative to ATM (basis points)
market_quotes = {
    F - 0.02: 0.28,   # 200bp OTM payer
    F - 0.01: 0.30,   # 100bp OTM payer
    F:         0.32,  # ATM
    F + 0.01: 0.31,   # 100bp OTM receiver
    F + 0.02: 0.30,   # 200bp OTM receiver
}

print("=== SABR Volatility Surface Calibration ===")
print(f"  Hypothetical: 5y10y swaption, forward F={F*100:.1f}%")
print(f"  SABR params: α={alpha}, β={beta}, ρ={rho}, ν={nu}")
print()
print(f"  Synthetic market swaption vol quotes:")
for k, v in market_quotes.items():
    print(f"    K={k*100:.1f}%:  σ_mkt={v*100:.1f}%")
print()

# --- Compute SABR implied vols and compare to market ---
print(f"  {'K':>6} | {'σ_mkt':>7} | {'σ_SABR':>7} | {'diff(bp)':>9}")
print("-" * 38)
total_sq = 0.0
for k, mkt_vol in market_quotes.items():
    sabr_vol = sabr_implied_vol(F, k, T, alpha, beta, rho, nu)
    diff_bp = (mkt_vol - sabr_vol) * 10000
    total_sq += (mkt_vol - sabr_vol) ** 2
    print(f"  {k*100:>5.1f}% | {mkt_vol*100:>6.2f}% | {sabr_vol*100:>6.2f}% | {diff_bp:>+8.1f}")

rmse = math.sqrt(total_sq / len(market_quotes)) * 10000
print(f"  RMSE: {rmse:.2f} bp")
print()

# --- Plot the SABR smile across a strike range ---
print("  SABR smile (K from 1% to 7%):")
print(f"  {'K':>6} | {'σ_imp':>7}")
for k_pct in [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0]:
    k = k_pct / 100
    vol = sabr_implied_vol(F, k, T, alpha, beta, rho, nu)
    print(f"  {k*100:>5.1f}% | {vol*100:>6.2f}%")
print()
print("Key insight: SABR's β controls backbone shape:")
print("  β=0   → normal model (good for low/negative rates, JGB, Bund)")
print("  β=0.5 → typical rates (Bermudan swaptions)")
print("  β=1.0 → lognormal (good for high-rate envs, equities)")
print("ρ controls skew, ν controls convexity (smile curvature).")
print("Production: SABR calibrated per bucket (e.g. 5y10y, 10y10y)")`;

export const SABR_RUST = `use statrs::distribution::{Normal, Distribution};

/// SABR stochastic volatility model (Hagan 2002).
/// dF = α·F^β·dW_F
/// dα = ν·α·dW_α
/// Corr(dW_F, dW_α) = ρ
#[derive(Clone, Debug)]
pub struct SABRParams {
    pub alpha: f64,  // initial vol
    pub beta: f64,   // CEV exponent (0..1)
    pub rho: f64,    // correlation
    pub nu: f64,     // vol of vol
}

impl SABRParams {
    /// Hagan 2002 asymptotic implied vol formula (eq 2.17a + ATM).
    pub fn implied_vol(&self, f: f64, k: f64, t: f64) -> f64 {
        if (f - k).abs() < 1e-10 {
            // ATM formula
            let term1 = (1.0 - self.beta).powi(2) / 24.0
                      * self.alpha.powi(2) / f.powf(2.0 - 2.0 * self.beta);
            let term2 = self.rho * self.beta * self.nu * self.alpha
                      / (4.0 * f.powf(1.0 - self.beta));
            let term3 = (2.0 - 3.0 * self.rho.powi(2)) / 24.0 * self.nu.powi(2);
            return self.alpha / f.powf(1.0 - self.beta)
                * (1.0 + (term1 + term2 + term3) * t);
        }
        // Off-strike
        let z = self.nu / self.alpha
              * (f * k).powf((1.0 - self.beta) / 2.0)
              * (f / k).ln();
        let x_z = ((1.0 - 2.0 * self.rho * z + z.powi(2)).sqrt() + z - self.rho)
            .ln() / (1.0 - self.rho).ln();
        let fk_pow = (f * k).powf((1.0 - self.beta) / 2.0);
        let term1 = (1.0 - self.beta).powi(2) / 24.0
                  * self.alpha.powi(2) / fk_pow.powi(2);
        let term2 = self.rho * self.beta * self.nu * self.alpha
                  / (4.0 * fk_pow);
        let term3 = (2.0 - 3.0 * self.rho.powi(2)) / 24.0 * self.nu.powi(2);
        let log_fk = (f / k).ln();
        let denom = fk_pow * (1.0 + (1.0 - self.beta).powi(2) / 24.0 * log_fk.powi(2)
            + (1.0 - self.beta).powi(4) / 1920.0 * log_fk.powi(4));
        self.alpha / denom * z / x_z.exp() * (1.0 + (term1 + term2 + term3) * t)
    }

    /// Check SABR no-arbitrage constraints.
    pub fn is_valid(&self) -> bool {
        self.alpha > 0.0
            && (0.0..=1.0).contains(&self.beta)
            && self.rho.abs() < 1.0
            && self.nu >= 0.0
    }
}

/// Calibrate SABR params to market swaption quotes via Levenberg-Marquardt.
pub fn calibrate_sabr(
    quotes: &[(f64, f64)],  // (strike, market_vol)
    initial: &SABRParams,
    forward: f64,
    t: f64,
) -> Result<SABRParams, Box<dyn std::error::Error>> {
    // Minimize Σ (σ_market - σ_SABR(params))² via LM
    let mut params = initial.clone();
    let mut lambda = 1e-3;
    for _ in 0..100 {
        let residuals: Vec<f64> = quotes.iter()
            .map(|&(k, mkt_vol)| mkt_vol - params.implied_vol(forward, k, t))
            .collect();
        let loss: f64 = residuals.iter().map(|r| r * r).sum();
        // LM update step (omitted — uses nalgebra SVD)
        if loss < 1e-10 { break; }
        let _ = lambda;  // placeholder for LM damping update
    }
    Ok(params)
}`;

export const SABR_SCALA = `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

/**
 * Distributed SABR calibration across swaption book.
 * Production use: OTC rates desks at major banks (JPM, GS, DB).
 *
 * Calibrate (α, β, ρ, ν) per swaption bucket (e.g. 5y10y, 10y10y).
 * Joint calibration via Levenberg-Marquardt in Breeze.
 */
object SABRModel {

  case class SABRParams(alpha: Double, beta: Double,
                        rho: Double, nu: Double)

  /** Hagan 2002 asymptotic implied vol formula. */
  def impliedVol(f: Double, k: Double, t: Double,
                params: SABRParams): Double = {
    if (math.abs(f - k) < 1e-10) {
      // ATM formula
      val term1 = math.pow(1 - params.beta, 2) / 24 *
                  math.pow(params.alpha, 2) / math.pow(f, 2 - 2 * params.beta)
      val term2 = params.rho * params.beta * params.nu * params.alpha /
                  (4 * math.pow(f, 1 - params.beta))
      val term3 = (2 - 3 * params.rho * params.rho) / 24 *
                  params.nu * params.nu
      params.alpha / math.pow(f, 1 - params.beta) *
        (1 + (term1 + term2 + term3) * t)
    } else {
      // Off-strike (Hagan eq 2.17a)
      val z = params.nu / params.alpha *
              math.pow(f * k, (1 - params.beta) / 2) *
              math.log(f / k)
      val xZ = math.log((math.sqrt(1 - 2 * params.rho * z + z * z) +
                         z - params.rho) / (1 - params.rho))
      val fkPow = math.pow(f * k, (1 - params.beta) / 2)
      val term1 = math.pow(1 - params.beta, 2) / 24 *
                  math.pow(params.alpha, 2) / (fkPow * fkPow)
      val term2 = params.rho * params.beta * params.nu * params.alpha /
                  (4 * fkPow)
      val term3 = (2 - 3 * params.rho * params.rho) / 24 *
                  params.nu * params.nu
      val logFk = math.log(f / k)
      val denom = fkPow * (1 + math.pow(1 - params.beta, 2) / 24 *
                           logFk * logFk +
                           math.pow(1 - params.beta, 4) / 1920 *
                           math.pow(logFk, 4))
      params.alpha / denom * z / xZ * (1 + (term1 + term2 + term3) * t)
    }
  }

  /** Distributed calibration across the swaption book. */
  def calibrateBook(spark: SparkSession, bookPath: String,
                    forward: Double, t: Double): DataFrame = {
    import spark.implicits._
    val book = spark.read.parquet(bookPath).as[(String, Double, Double)]
    book.groupByKey { case (bucket, _, _) => bucket }
      .mapGroups { (bucket, iter) =>
        val quotes = iter.map { case (_, k, vol) => (k, vol) }.toSeq
        val initial = SABRParams(0.003, 0.5, -0.2, 0.3)
        val calibrated = calibrateLM(quotes, initial, forward, t)
        (bucket, calibrated.alpha, calibrated.beta,
         calibrated.rho, calibrated.nu)
      }.toDF("bucket", "alpha", "beta", "rho", "nu")
  }

  /** LM calibration (placeholder — uses Breeze in production). */
  def calibrateLM(quotes: Seq[(Double, Double)], initial: SABRParams,
                  forward: Double, t: Double): SABRParams = initial
}`;

export const SABR_ELIXIR = `defmodule Quant.SABR do
  @moduledoc """
  SABR volatility model — streaming calibration + smile fitting
  across the swaption book.

  HYPOTHETICAL SCENARIO: a rates desk recalibrates SABR every minute
  as new swaption quotes arrive. Each bucket (e.g. 5y10y) has its
  own (α, β, ρ, ν) params. The calibrated smile is broadcast to the
  pricing layer for off-strip interpolation.
  """

  use GenServer

  defstruct [:book_table, :params, :listeners]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    # ETS table of swaption quotes: {bucket, strike, vol}
    book = :ets.new(:sabr_book, [:set, :public, read_concurrency: true])
    {:ok, %__MODULE__{book_table: book, params: %{}, listeners: []}}
  end

  @impl true
  def handle_cast({:quote, bucket, strike, vol}, state) do
    :ets.insert(state.book_table, {{bucket, strike}, vol})
    # Trigger re-calibration for this bucket
    new_params = recalibrate(state.book_table, bucket)
    state = put_in(state, [:params, bucket], new_params)

    # Broadcast updated SABR smile
    Phoenix.PubSub.broadcast(Quant.PubSub, "sabr:smile:#{bucket}",
      {:smile_update, bucket, new_params})
    {:noreply, state}
  end

  @impl true
  def handle_call({:smile, bucket, forward, t}, _from, state) do
    params = Map.get(state.params, bucket, %{alpha: 0.003, beta: 0.5,
                                              rho: -0.2, nu: 0.3})
    # Generate smile across strikes
    strikes = Enum.map(-200..200//10, fn bp -> forward + bp / 10000 end)
    smile = Enum.map(strikes, fn k ->
      {k, implied_vol(forward, k, t, params)}
    end)
    {:reply, smile, state}
  end

  # Hagan 2002 asymptotic formula
  def implied_vol(f, k, t, params) do
    if abs(f - k) < 1.0e-10 do
      # ATM
      term1 = :math.pow(1 - params.beta, 2) / 24 *
              :math.pow(params.alpha, 2) / :math.pow(f, 2 - 2 * params.beta)
      term2 = params.rho * params.beta * params.nu * params.alpha /
              (4 * :math.pow(f, 1 - params.beta))
      term3 = (2 - 3 * params.rho * params.rho) / 24 *
              params.nu * params.nu
      params.alpha / :math.pow(f, 1 - params.beta) *
        (1 + (term1 + term2 + term3) * t)
    else
      # Off-strike (Hagan eq 2.17a)
      z = params.nu / params.alpha *
          :math.pow(f * k, (1 - params.beta) / 2) *
          :math.log(f / k)
      x_z = :math.log((:math.sqrt(1 - 2 * params.rho * z + z * z) +
                      z - params.rho) / (1 - params.rho))
      fk_pow = :math.pow(f * k, (1 - params.beta) / 2)
      term1 = :math.pow(1 - params.beta, 2) / 24 *
              :math.pow(params.alpha, 2) / (fk_pow * fk_pow)
      term2 = params.rho * params.beta * params.nu * params.alpha /
              (4 * fk_pow)
      term3 = (2 - 3 * params.rho * params.rho) / 24 * params.nu * params.nu
      log_fk = :math.log(f / k)
      denom = fk_pow * (1 + :math.pow(1 - params.beta, 2) / 24 *
                        log_fk * log_fk +
                        :math.pow(1 - params.beta, 4) / 1920 *
                        :math.pow(log_fk, 4))
      params.alpha / denom * z / x_z * (1 + (term1 + term2 + term3) * t)
    end
  end

  defp recalibrate(book_table, bucket) do
    quotes = :ets.match_object(book_table, {{bucket, :_}, :_})
             |> Enum.map(fn {{^bucket, k}, v} -> {k, v} end)
    # LM calibration omitted — return initial params
    %{alpha: 0.003, beta: 0.5, rho: -0.2, nu: 0.3}
  end
end`;
