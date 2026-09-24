// ============================================================
// Multi-language quant code constants — Part 6
// 3 more scenarios × 4 languages (Python / Rust / Scala / Elixir)
// Scenarios: LOB replay (market microstructure), Black-76 commodity
//            futures, bond duration/convexity
// All Python examples include synthetic data + hypothetical scenarios.
// ============================================================

// ------------------------------------------------------------
// SCENARIO 12: Real-time Limit Order Book Replay (Cont 2010, Foucault 2010)
// ------------------------------------------------------------

export const LOB_PYTHON = `import math
import random
from collections import defaultdict

# ============================================================
# Real-time Limit Order Book (LOB) Replay
#
#   Market microstructure model: order book as a queue of
#   bid/ask levels (L2 data). Each tick is an event
#   (add/cancel/trade) that mutates the book.
#
# HYPOTHETICAL SCENARIO:
#   A market-making desk on E-mini S&P 500 futures (ES) replays
#   ITCH-style market data from CME. Each event mutates a price
#   level. The desk uses order-flow imbalance (OFI) to predict
#   short-term mid-price moves and quote skew.
# ============================================================

class OrderBook:
    """L2 order book — bid/ask ladders."""
    def __init__(self, symbol="ESM4"):
        self.symbol = symbol
        self.bids = defaultdict(float)  # price → size
        self.asks = defaultdict(float)
        self.last_trade_price = None
        self.event_count = 0

    def add(self, side, price, size):
        if side == 'B':
            self.bids[price] += size
        else:
            self.asks[price] += size
        self.event_count += 1

    def cancel(self, side, price, size):
        book = self.bids if side == 'B' else self.asks
        book[price] = max(0, book[price] - size)
        if book[price] == 0:
            del book[price]
        self.event_count += 1

    def trade(self, side, price, size):
        book = self.bids if side == 'B' else self.asks
        book[price] = max(0, book[price] - size)
        if book[price] == 0:
            del book[price]
        self.last_trade_price = price
        self.event_count += 1

    def best_bid(self):
        return max(self.bids.keys()) if self.bids else None

    def best_ask(self):
        return min(self.asks.keys()) if self.asks else None

    def mid_price(self):
        bb = self.best_bid(); ba = self.best_ask()
        return (bb + ba) / 2 if bb and ba else None

    def spread(self):
        bb = self.best_bid(); ba = self.best_ask()
        return ba - bb if bb and ba else None

    def bid_size_at_top(self):
        bb = self.best_bid()
        return self.bids[bb] if bb else 0

    def ask_size_at_top(self):
        ba = self.best_ask()
        return self.asks[ba] if ba else 0

    def order_flow_imbalance(self):
        """OFI = bid_top_size / (bid_Top_size + ask_Top_size)."""
        b = self.bid_size_at_top()
        a = self.ask_size_at_top()
        return b / (b + a) if (b + a) > 0 else 0.5

# --- Synthetic ITCH-style event stream ---
random.seed(42)
mid_start = 5400.00  # ES at 5400
tick_size = 0.25    # ES tick size

book = OrderBook("ESM4")

# Initialize: 5 levels of bids/asks around mid
for i in range(1, 6):
    book.add('B', mid_start - i * tick_size, random.randint(50, 200))
    book.add('A', mid_start + i * tick_size, random.randint(50, 200))

print("=== Limit Order Book Replay — E-mini S&P 500 ===")
print(f"  Symbol: {book.symbol}")
print(f"  Initial mid: {book.mid_price()}")
print(f"  Initial spread: {book.spread()} (tick={tick_size})")
print(f"  Initial bid depth (top-5): {sum(sorted(book.bids.values(), reverse=True)[:5]):,}")
print(f"  Initial ask depth (top-5): {sum(sorted(book.asks.values(), reverse=True)[:5]):,}")
print()

# --- Replay 1000 synthetic events ---
n_events = 1000
events = []
for _ in range(n_events):
    event_type = random.choices(['add', 'cancel', 'trade'],
                                  weights=[0.6, 0.3, 0.1])[0]
    side = random.choice(['B', 'A'])
    # Price: random walk around mid
    mid = book.mid_price() or mid_start
    level_offset = random.choice([-2, -1, -1, 0, 1, 1, 2]) * tick_size
    if side == 'B':
        price = round(mid - tick_size + level_offset, 2)  # below mid
    else:
        price = round(mid + tick_size + level_offset, 2)  # above mid
    size = random.randint(1, 100)
    events.append((event_type, side, price, size))

# Replay + track mid evolution
mid_history = []
for ev_type, side, price, size in events:
    if ev_type == 'add':
        book.add(side, price, size)
    elif ev_type == 'cancel':
        book.cancel(side, price, size)
    elif ev_type == 'trade':
        book.trade(side, price, size)
    mid = book.mid_price()
    if mid:
        mid_history.append(mid)

# --- Final book state ---
print(f"After {n_events} events:")
print(f"  Final mid: {book.mid_price():.2f}  (Δ={book.mid_price() - mid_start:+.2f})")
print(f"  Final spread: {book.spread()}")
print(f"  Final OFI: {book.order_flow_imbalance():.3f}")
print(f"  OFI > 0.5: more bid pressure → mid likely to rise")
print()

# --- Top 5 levels ---
print("  Top 5 bid levels:")
sorted_bids = sorted(book.bids.items(), reverse=True)[:5]
for price, size in sorted_bids:
    print(f"    {price:>8.2f}  ×{size:>5}")
print("  Top 5 ask levels:")
sorted_asks = sorted(book.asks.items())[:5]
for price, size in sorted_asks:
    print(f"    {price:>8.2f}  ×{size:>5}")
print()

# --- Mid-price evolution ---
n_up = sum(1 for i in range(1, len(mid_history)) if mid_history[i] > mid_history[i-1])
n_dn = sum(1 for i in range(1, len(mid_history)) if mid_history[i] < mid_history[i-1])
print(f"  Mid moves: {n_up} up, {n_dn} down (out of {len(mid_history)-1} events with mid)")
print(f"  Volatility: {mid_history[-1] - mid_history[0]:+.2f} (start→end)")
print()
print("Key insight: order-flow imbalance (OFI) is a leading indicator")
print("of mid-price moves. OFI > 0.5 → bid pressure → mid rises (Cont 2010).")
print("Production: HFT firms use OFI with microsecond latency at CME/Nasdaq.")`;

export const LOB_RUST = `use std::collections::BTreeMap;
use crossbeam_channel::{unbounded, Receiver, Sender};

/// L2 limit order book — sorted bid/ask ladders via BTreeMap.
/// Each event (add/cancel/trade) is processed in <100ns.
pub struct OrderBook {
    pub symbol: String,
    bids: BTreeMap<i64, i64>,   // price (in ticks) → size
    asks: BTreeMap<i64, i64>,
    pub last_trade_price: Option<i64>,
    pub event_count: u64,
}

#[derive(Debug, Clone)]
pub enum LobEvent {
    Add { side: char, price: i64, size: i64 },
    Cancel { side: char, price: i64, size: i64 },
    Trade { side: char, price: i64, size: i64 },
}

impl OrderBook {
    pub fn new(symbol: &str) -> Self {
        Self {
            symbol: symbol.to_string(),
            bids: BTreeMap::new(), asks: BTreeMap::new(),
            last_trade_price: None, event_count: 0,
        }
    }

    pub fn add(&mut self, side: char, price: i64, size: i64) {
        let book = if side == 'B' { &mut self.bids } else { &mut self.asks };
        *book.entry(price).or_insert(0) += size;
        self.event_count += 1;
    }

    pub fn cancel(&mut self, side: char, price: i64, size: i64) {
        let book = if side == 'B' { &mut self.bids } else { &mut self.asks };
        if let Some(qty) = book.get_mut(&price) {
            *qty = (*qty - size).max(0);
            if *qty == 0 { book.remove(&price); }
        }
        self.event_count += 1;
    }

    pub fn trade(&mut self, side: char, price: i64, size: i64) {
        let book = if side == 'B' { &mut self.bids } else { &mut self.asks };
        if let Some(qty) = book.get_mut(&price) {
            *qty = (*qty - size).max(0);
            if *qty == 0 { book.remove(&price); }
        }
        self.last_trade_price = Some(price);
        self.event_count += 1;
    }

    pub fn best_bid(&self) -> Option<i64> {
        self.bids.keys().next_back().copied()
    }
    pub fn best_ask(&self) -> Option<i64> {
        self.asks.keys().next().copied()
    }
    pub fn mid_price(&self) -> Option<i64> {
        match (self.best_bid(), self.best_ask()) {
            (Some(b), Some(a)) => Some((b + a) / 2),
            _ => None,
        }
    }
    pub fn spread(&self) -> Option<i64> {
        match (self.best_bid(), self.best_ask()) {
            (Some(b), Some(a)) => Some(a - b),
            _ => None,
        }
    }

    /// Order-flow imbalance at the top of book.
    pub fn ofi(&self) -> f64 {
        let b = self.bids.values().next_back().copied().unwrap_or(0) as f64;
        let a = self.asks.values().next().copied().unwrap_or(0) as f64;
        if b + a > 0.0 { b / (b + a) } else { 0.5 }
    }
}

/// Streaming LOB processor — consumes ITCH/Mold messages from a
/// crossbeam channel, processes events in real-time.
pub fn run_lob_processor(rx: Receiver<LobEvent>) {
    let mut book = OrderBook::new("ESM4");
    while let Ok(event) = rx.recv() {
        match event {
            LobEvent::Add { side, price, size } => book.add(side, price, size),
            LobEvent::Cancel { side, price, size } => book.cancel(side, price, size),
            LobEvent::Trade { side, price, size } => book.trade(side, price, size),
        }
        // Sub-microsecond processing loop — no I/O, no allocations
        if book.event_count % 1000 == 0 {
            let mid = book.mid_price().unwrap_or(0);
            let ofi = book.ofi();
            // Signal generation: if OFI > 0.6, send buy signal
            if ofi > 0.6 {
                // emit buy signal
            }
        }
    }
}`;

export const LOB_SCALA = `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._
import org.apache.spark.sql.expressions.UserDefinedFunction

/**
 * Distributed LOB replay + analytics across an exchange's full symbol
 * universe (e.g. all 2800 Nasdaq-100 names).
 *
 * Each symbol's LOB is reconstructed from ITCH P/S/X messages.
 * Aggregated OFI / liquidity metrics feed the alpha research layer.
 */
object LOBReplay {

  case class LobEvent(symbol: String, timestamp: Long,
                      eventType: String,  // "add", "cancel", "trade"
                      side: Char, price: Double, size: Long)

  /** Reconstruct L2 LOB from a stream of events. */
  def replay(spark: SparkSession, eventsPath: String,
             windowSec: Int): DataFrame = {
    import spark.implicits._

    val events = spark.read.parquet(eventsPath).as[LobEvent]

    // Group by symbol + tumbling window; reconstruct LOB at window end
    val windowed = events
      .withWatermark("timestamp", s"\${windowSec * 2} seconds")
      .groupBy(
        window(\$"timestamp", s"\${windowSec} seconds"),
        \$"symbol"
      )
      .agg(
        collect_list(
          struct(\$"timestamp", \$"eventType", \$"side",
                 \$"price", \$"size")
        ).as("events")
      )

    // For each window: replay events to get final LOB state
    windowed.mapPartitions { rows =>
      rows.map { row =>
        val symbol = row.getAs[String]("symbol")
        val win = row.getAs[org.apache.spark.sql.Row]("window")
        val eventsList = row.getAs[Seq[org.apache.spark.sql.Row]]("events")
        // Replay events in order
        val (bids, asks) = eventsList.foldLeft(
          (Map.empty[Double, Long], Map.empty[Double, Long])
        ) { case ((bs, as_), ev) =>
          val side = ev.getAs[String]("side").head
          val price = ev.getAs[Double]("price")
          val size = ev.getAs[Long]("size")
          ev.getAs[String]("eventType") match {
            case "add" =>
              if (side == 'B') (bs + (price -> (bs.getOrElse(price, 0L) + size)), as_)
              else (bs, as_ + (price -> (as_.getOrElse(price, 0L) + size)))
            case "cancel" =>
              if (side == 'B') (bs + (price -> (bs.getOrElse(price, 0L) - size).max(0L)), as_)
              else (bs, as_ + (price -> (as_.getOrElse(price, 0L) - size).max(0L)))
            case _ => (bs, as_)
          }
        }
        val bestBid = if (bids.nonEmpty) Some(bids.keys.max) else None
        val bestAsk = if (asks.nonEmpty) Some(asks.keys.min) else None
        val mid = for (b <- bestBid; a <- bestAsk) yield (b + a) / 2
        val bidTop = bids.getOrElse(bestBid.getOrElse(0.0), 0L)
        val askTop = asks.getOrElse(bestAsk.getOrElse(0.0), 0L)
        val ofi = if (bidTop + askTop > 0) bidTop.toDouble / (bidTop + askTop) else 0.5
        (symbol, win.getAs[Long]("start"), mid, bestBid, bestAsk, ofi)
      }
    }.toDF("symbol", "window_start", "mid", "best_bid",
          "best_ask", "ofi")
  }
}`;

export const LOB_ELIXIR = `defmodule Quant.LOBProcessor do
  @moduledoc """
  Real-time L2 order book processor — consumes ITCH/Mold UDP
  multicast from CME/Nasdaq, maintains order book state in ETS,
  emits OFI signals to strategy layer every 100 events.

  HYPOTHETICAL SCENARIO: HFT desk on E-mini S&P 500 futures.
  CME sends ITCH via UDP 224.0.0.x; we consume via :gen_udp.open
  with multicast membership. Target: <1μs from network packet to signal.
  """

  use GenServer

  defstruct [:book_table, :event_count, :last_signal]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    # ETS: {symbol, side} → %{price => size} sorted map
    book = :ets.new(:lob_book, [:set, :public, read_concurrency: true])
    # Spawn UDP listener for CME ITCH (port 15310 = CME market data)
    spawn_link(fn -> udp_listener(book) end)
    {:ok, %__MODULE__{book_table: book, event_count: 0, last_signal: nil}}
  end

  @impl true
  def handle_cast({:event, symbol, type, side, price, size}, state) do
    apply_event(state.book_table, symbol, type, side, price, size)
    new_count = state.event_count + 1
    state = %{state | event_count: new_count}

    # Every 100 events, emit OFI signal
    if rem(new_count, 100) == 0 do
      ofi = compute_ofi(state.book_table, symbol)
      if ofi > 0.6 do
        Phoenix.PubSub.broadcast(Quant.PubSub, "lob:signal:#{symbol}",
          {:ofi_signal, symbol, ofi, :buy})
      end
      if ofi < 0.4 do
        Phoenix.PubSub.broadcast(Quant.PubSub, "lob:signal:#{symbol}",
          {:ofi_signal, symbol, ofi, :sell})
      end
      %{state | last_signal: {ofi, System.monotonic_time(:nanosecond)}}
    else
      state
    end
  end

  # Apply ITCH event to the book
  defp apply_event(table, symbol, "add", side, price, size) do
    key = {symbol, side}
    :ets.update(table, key, fn %{^price => old} = m ->
      Map.put(m, price, old + size)
    end, fn -> %{price => size} end)
  end
  defp apply_event(table, symbol, "cancel", side, price, size) do
    key = {symbol, side}
    :ets.update(table, key, fn m ->
      new_size = max(0, Map.get(m, price, 0) - size)
      if new_size == 0, do: Map.delete(m, price), else: Map.put(m, price, new_size)
    end, fn -> %{} end)
  end
  defp apply_event(table, symbol, "trade", side, price, size) do
    apply_event(table, symbol, "cancel", side, price, size)
  end

  defp compute_ofi(table, symbol) do
    bids = :ets.lookup_element(table, {symbol, ?B}, 2, %{})
    asks = :ets.lookup_element(table, {symbol, ?A}, 2, %{})
    bid_top = bids |> Map.keys() |> Enum.max(fn -> 0 end)
                   |> then(fn k -> Map.get(bids, k, 0) end)
    ask_top = asks |> Map.keys() |> Enum.min(fn -> 0 end)
                   |> then(fn k -> Map.get(asks, k, 0) end)
    if bid_top + ask_top > 0, do: bid_top / (bid_top + ask_top), else: 0.5
  end

  # UDP multicast listener for ITCH market data
  defp udp_listener(book_table) do
    {:ok, socket} = :gen_udp.open(15310, [
      :binary, {:active, false}, {:reuseaddr, true},
      {:add_membership, {{224, 0, 0, 1}, {0, 0, 0, 0}}}
    ])
    loop(socket, book_table)
  end

  defp loop(socket, book_table) do
    case :gen_udp.recv(socket, 65536) do
      {:ok, {_ip, _port, packet}} ->
        # Parse ITCH message → emit event
        event = parse_itch(packet)
        GenServer.cast(__MODULE__, event)
      _ -> :ok
    end
    loop(socket, book_table)
  end

  defp parse_itch(_packet), do: {:event, "ESM4", "add", ?B, 5400.0, 100}
end`;

// ------------------------------------------------------------
// SCENARIO 13: Black-76 Commodity Futures Option (Black 1976)
// ------------------------------------------------------------

export const BLACK76_PYTHON = `import math
import random

# ============================================================
# Black-76 Model for Options on Futures (Black 1976)
#
#   C = e^(-rT) · [F·N(d1) - K·N(d2)]
#   d1 = (ln(F/K) + σ²/2·T) / (σ·√T)
#   d2 = d1 - σ·√T
#
# Difference from Black-Scholes: forward price F replaces spot S,
# and the entire formula is discounted at r (no continuous yield q).
#
# HYPOTHETICAL SCENARIO:
#   A commodity desk at an oil major prices a 3-month call option
#   on WTI crude oil futures (CL). The futures curve is in
#   backwardation (front-month > back-month). They price an
#   ATM call at strike K=F (the front-month futures price).
# ============================================================

def norm_cdf(x):
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2)))

def black_76_call(F, K, T, r, sigma):
    """Black-76 call on a futures contract."""
    if T <= 0 or sigma <= 0:
        return max(F - K, 0.0)
    d1 = (math.log(F/K) + 0.5 * sigma**2 * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    return math.exp(-r * T) * (F * norm_cdf(d1) - K * norm_cdf(d2))

def black_76_put(F, K, T, r, sigma):
    """Black-76 put on a futures contract (via put-call parity)."""
    if T <= 0 or sigma <= 0:
        return max(K - F, 0.0)
    d1 = (math.log(F/K) + 0.5 * sigma**2 * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    return math.exp(-r * T) * (K * norm_cdf(-d2) - F * norm_cdf(-d1))

def black_76_delta(F, K, T, r, sigma):
    """Black-76 call Delta = e^(-rT) · N(d1)."""
    if T <= 0 or sigma <= 0:
        return 1.0 if F > K else 0.0
    d1 = (math.log(F/K) + 0.5 * sigma**2 * T) / (sigma * math.sqrt(T))
    return math.exp(-r * T) * norm_cdf(d1)

# --- Hypothetical WTI futures curve (backwardation) ---
print("=== Black-76 Commodity Futures Option Pricing ===")
print("  Hypothetical: 3-month ATM call on WTI crude oil futures (CL)")
print()

# Synthetic WTI futures term structure (backwardation)
futures_curve = {
    "CLM4 (Jun'24)": 78.50,   # front month
    "CLN4 (Jul'24)": 78.20,
    "CLQ4 (Aug'24)": 77.90,
    "CLV4 (Sep'24)": 77.60,
    "CLX4 (Oct'24)": 77.30,
    "CLZ4 (Dec'24)": 76.80,
    "CLF5 (Jan'25)": 76.50,
    "CLG5 (Feb'25)": 76.20,
}
print(f"  Synthetic WTI futures curve (backwardation):")
for contract, price in futures_curve.items():
    print(f"    {contract}: USD {price:.2f}/bbl")
print()

# --- Price the option ---
F = 78.50  # front-month futures (CLM4)
K = 78.50  # ATM strike
T = 3.0 / 12.0   # 3 months to expiry
r = 0.05
sigma = 0.35  # 35% WTI vol (typical)

call_price = black_76_call(F, K, T, r, sigma)
put_price = black_76_put(F, K, T, r, sigma)
call_delta = black_76_delta(F, K, T, r, sigma)

print(f"  Option: ATM call on CLM4 (WTI Jun'24)")
print(f"    F = USD {F:.2f}  (front-month futures)")
print(f"    K = USD {K:.2f}  (ATM strike)")
print(f"    T = {T:.4f} years  (3 months)")
print(f"    r = {r}   σ = {sigma}  (35% WTI vol)")
print()
print(f"    Call price: USD {call_price:.4f}/bbl  (USD {call_price * 1000:.2f}/contract)")
print(f"    Put price:  USD {put_price:.4f}/bbl  (USD {put_price * 1000:.2f}/contract)")
print(f"    Call Δ:     {call_delta:.4f}  (per 1.0 move in F)")
print(f"    Put-call parity check: C-P = e^(-rT)(F-K) = {math.exp(-r*T) * (F - K):.4f}")
print()

# --- Volatility smile on CLM4 ---
print(f"  Synthetic implied vol smile on CLM4:")
print(f"    {'K':>8} | {'moneyness':>10} | {'σ_imp':>7} | {'call':>7}")
random.seed(99)
strikes = [F - 5, F - 2, F - 0.5, F, F + 0.5, F + 2, F + 5, F + 10]
# Synthetic vol smile (skew to the downside — typical commodity)
smile = {F - 10: 0.45, F - 5: 0.40, F - 2: 0.36, F - 0.5: 0.34, F: 0.35,
         F + 0.5: 0.34, F + 2: 0.33, F + 5: 0.32, F + 10: 0.31}
for k in strikes:
    sigma_k = smile.get(k, 0.35)
    price_k = black_76_call(F, k, T, r, sigma_k)
    moneyness = (k - F) / F * 100
    print(f"    USD {k:>5.2f} | {moneyness:>+9.1f}% | {sigma_k*100:>5.1f}% | USD {price_k:>5.3f}")
print()

# --- Futures curve analysis ---
front = futures_curve["CLM4 (Jun'24)"]
back_1y = futures_curve["CLG5 (Feb'25)"]
print(f"  Curve shape: front (CLM4)={front}, back (CLG5)={back_1y}")
print(f"  Backwardation: front > back by USD {front - back_1y:.2f}/bbl")
print(f"  Annualized roll yield: {(front / back_1y - 1) * 100:.2f}% (long front earns this)")
print()
print("Key insight: Black-76 differs from BS in two ways:")
print("  (1) Forward F replaces spot S (no need for cost-of-carry q)")
print("  (2) Discount factor e^(-rT) wraps the whole payoff")
print("Used for ALL commodity futures options (NYMEX, ICE, CBOT).")
print("Production: every oil major (BP, Shell, XOM) and commodity fund.");`;

export const BLACK76_RUST = `use statrs::distribution::{Normal, Distribution};
use rayon::prelude::*;

/// Black-76 model for options on futures.
/// C = e^(-rT) · [F·N(d1) - K·N(d2)]
/// Used for ALL exchange-traded commodity futures options.
pub struct Black76;

impl Black76 {
    #[inline]
    pub fn call(f: f64, k: f64, t: f64, r: f64, sigma: f64) -> f64 {
        if t <= 0.0 || sigma <= 0.0 {
            return (f - k).max(0.0);
        }
        let sqrt_t = t.sqrt();
        let d1 = ((f / k).ln() + 0.5 * sigma * sigma * t) / (sigma * sqrt_t);
        let d2 = d1 - sigma * sqrt_t;
        let n = Normal::new(0.0, 1.0).unwrap();
        (-r * t).exp() * (f * n.cdf(d1) - k * n.cdf(d2))
    }

    #[inline]
    pub fn put(f: f64, k: f64, t: f64, r: f64, sigma: f64) -> f64 {
        if t <= 0.0 || sigma <= 0.0 {
            return (k - f).max(0.0);
        }
        let sqrt_t = t.sqrt();
        let d1 = ((f / k).ln() + 0.5 * sigma * sigma * t) / (sigma * sqrt_t);
        let d2 = d1 - sigma * sqrt_t;
        let n = Normal::new(0.0, 1.0).unwrap();
        (-r * t).exp() * (k * n.cdf(-d2) - f * n.cdf(-d1))
    }

    #[inline]
    pub fn delta(f: f64, k: f64, t: f64, r: f64, sigma: f64) -> f64 {
        if t <= 0.0 || sigma <= 0.0 {
            return if f > k { 1.0 } else { 0.0 };
        }
        let d1 = ((f / k).ln() + 0.5 * sigma * sigma * t) / (sigma * t.sqrt());
        (-r * t).exp() * Normal::new(0.0, 1.0).unwrap().cdf(d1)
    }

    /// Batch price a whole commodity option book (parallel).
    pub fn price_book(options: &[(f64, f64, f64, f64, f64)])
        -> Vec<f64>
    {
        options.par_iter()
            .map(|&(f, k, t, r, sigma)| Self::call(f, k, t, r, sigma))
            .collect()
    }
}`;

export const BLACK76_SCALA = `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._
import org.apache.spark.sql.expressions.UserDefinedFunction

/**
 * Distributed Black-76 pricing across a commodity futures option book.
 * Used at oil majors (BP, Shell, XOM) and commodity hedge funds
 * (Citadel Commodities, Trafigura).
 *
 * HYPOTHETICAL SCENARIO: price a 100k-option book on CL, NG, Gold,
 * Wheat in parallel via Spark.
 */
object Black76 {

  def normCdf(x: Double): Double = 0.5 * (1.0 + erf(x / math.sqrt(2)))

  def erf(x: Double): Double = {
    val t = 1.0 / (1.0 + 0.3275911 * math.abs(x))
    val y = 1.0 - (((((1.061405429*t - 1.453152027)*t) + 1.421413741)*t
                   - 0.284496736)*t + 0.254829592) * t * math.exp(-x*x)
    if (x >= 0) y else -y
  }

  def call(f: Double, k: Double, t: Double, r: Double, sigma: Double): Double = {
    if (t <= 0 || sigma <= 0) return math.max(f - k, 0.0)
    val d1 = (math.log(f / k) + 0.5 * sigma * sigma * t) / (sigma * math.sqrt(t))
    val d2 = d1 - sigma * math.sqrt(t)
    math.exp(-r * t) * (f * normCdf(d1) - k * normCdf(d2))
  }

  def put(f: Double, k: Double, t: Double, r: Double, sigma: Double): Double = {
    if (t <= 0 || sigma <= 0) return math.max(k - f, 0.0)
    val d1 = (math.log(f / k) + 0.5 * sigma * sigma * t) / (sigma * math.sqrt(t))
    val d2 = d1 - sigma * math.sqrt(t)
    math.exp(-r * t) * (k * normCdf(-d2) - f * normCdf(-d1))
  }

  val callUdf: UserDefinedFunction = udf((f: Double, k: Double, t: Double,
                                          r: Double, sigma: Double) =>
    call(f, k, t, r, sigma))

  /** Distributed pricing of a whole commodity book. */
  def priceBook(spark: SparkSession, bookPath: String): DataFrame = {
    spark.read.parquet(bookPath)
      .withColumn("price", callUdf(\$"forward", \$"strike",
                                    \$"t_years", \$"r", \$"sigma"))
  }
}`;

export const BLACK76_ELIXIR = `defmodule Quant.Black76 do
  @moduledoc """
  Black-76 model for options on commodity futures.
  Streaming pricing across the futures option chain.

  HYPOTHETICAL SCENARIO: BP's commodity desk prices a 100k-option
  book on CL (crude), NG (gas), GC (gold), ZW (wheat) — each new
  quote triggers a reprice of affected strikes.
  """

  use GenServer

  defstruct [:book_table]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    book = :ets.new(:black76_book, [:set, :public, read_concurrency: true])
    {:ok, %__MODULE__{book_table: book}}
  end

  @impl true
  def handle_cast({:quote, symbol, strike, t, r, sigma}, state) do
    forward = Quant.MarketData.forward(symbol)
    price = call(forward, strike, t, r, sigma)
    :ets.insert(state.book_table, {{symbol, strike}, price})
    Phoenix.PubSub.broadcast(Quant.PubSub, "black76:price:#{symbol}",
      {:price, symbol, strike, price})
    {:noreply, state}
  end

  # Black-76 call: C = e^(-rT) · [F·N(d1) - K·N(d2)]
  def call(f, k, t, r, sigma) when t > 0 and sigma > 0 do
    d1 = (:math.log(f / k) + 0.5 * sigma * sigma * t) / (sigma * :math.sqrt(t))
    d2 = d1 - sigma * :math.sqrt(t)
    :math.exp(-r * t) * (f * norm_cdf(d1) - k * norm_cdf(d2))
  end
  def call(f, k, _, _, _), do: max(f - k, 0.0)

  def put(f, k, t, r, sigma) when t > 0 and sigma > 0 do
    d1 = (:math.log(f / k) + 0.5 * sigma * sigma * t) / (sigma * :math.sqrt(t))
    d2 = d1 - sigma * :math.sqrt(t)
    :math.exp(-r * t) * (k * norm_cdf(-d2) - f * norm_cdf(-d1))
  end
  def put(f, k, _, _, _), do: max(k - f, 0.0)

  def delta(f, k, t, r, sigma) when t > 0 and sigma > 0 do
    d1 = (:math.log(f / k) + 0.5 * sigma * sigma * t) / (sigma * :math.sqrt(t))
    :math.exp(-r * t) * norm_cdf(d1)
  end
  def delta(f, k, _, _, _), do: if(f > k, do: 1.0, else: 0.0)

  defp norm_cdf(x), do: 0.5 * (1.0 + :erf(x / :math.sqrt(2)))
end`;

// ------------------------------------------------------------
// SCENARIO 14: Bond Duration & Convexity (Macaulay 1938, Hicks 1939)
// ------------------------------------------------------------

export const BOND_PYTHON = `import math
import random

# ============================================================
# Bond Duration & Convexity (Macaulay 1938, Hicks 1939)
#
#   ΔP/P ≈ -D_mod · Δy + ½ · C · (Δy)²
#
# Where:
#   D_mac = (Σ t·CF_t·DF_t) / P          (Macaulay duration, years)
#   D_mod = D_mac / (1 + y/m)             (modified duration)
#   C     = (Σ t²·CF_t·DF_t) / P         (convexity)
#   P     = Σ CF_t · e^(-y·t)             (continuous-compounded price)
#
# HYPOTHETICAL SCENARIO:
#   A pension fund holds USD 100M in a 10-year Treasury (coupon 4%,
#   semi-annual). The yield curve shifts +100bp. Estimate the price
#   change via duration + convexity, and design a duration-hedge
#   via short 10y Treasury futures.
# ============================================================

def bond_price(coupon, face, ytm, t_years, freq=2):
    """Continuous-compounded bond price.
    ytm: yield-to-maturity (annualised, continuous)
    """
    n_periods = int(t_years * freq)
    dt = 1.0 / freq
    pv = 0.0
    for t in range(1, n_periods + 1):
        cf = coupon * face / freq
        if t == n_periods:
            cf += face  # final coupon + principal
        pv += cf * math.exp(-ytm * t * dt)
    return pv

def macaulay_duration(coupon, face, ytm, t_years, freq=2):
    """Macaulay duration in years."""
    n_periods = int(t_years * freq)
    dt = 1.0 / freq
    price = bond_price(coupon, face, ytm, t_years, freq)
    weighted_pv = 0.0
    for t in range(1, n_periods + 1):
        cf = coupon * face / freq
        if t == n_periods:
            cf += face
        time_yrs = t * dt
        weighted_pv += time_yrs * cf * math.exp(-ytm * time_yrs)
    return weighted_pv / price

def convexity(coupon, face, ytm, t_years, freq=2):
    """Convexity (second-order term)."""
    n_periods = int(t_years * freq)
    dt = 1.0 / freq
    price = bond_price(coupon, face, ytm, t_years, freq)
    weighted_pv = 0.0
    for t in range(1, n_periods + 1):
        cf = coupon * face / freq
        if t == n_periods:
            cf += face
        time_yrs = t * dt
        # Convexity weighting: t²·(t+dt)·CF_t·DF_t  (simplified: t²)
        weighted_pv += time_yrs * (time_yrs + dt) * cf * math.exp(-ytm * time_yrs)
    return weighted_pv / price

# --- Hypothetical bond parameters ---
face = 100.0
coupon_rate = 0.04   # 4% annual coupon
ytm = 0.042           # 4.2% YTM (slightly above coupon → trades at discount)
t_years = 10          # 10-year maturity
freq = 2              # semi-annual payments
notional = 100_000_000  # USD 100M position

# --- Compute price, duration, convexity ---
price = bond_price(coupon_rate, face, ytm, t_years, freq)
dur_mac = macaulay_duration(coupon_rate, face, ytm, t_years, freq)
dur_mod = dur_mac / (1 + ytm / freq)
conv = convexity(coupon_rate, face, ytm, t_years, freq)

print("=== Bond Duration & Convexity Analysis ===")
print(f"  Hypothetical: 10-year Treasury, coupon={coupon_rate*100:.1f}%, YTM={ytm*100:.2f}%")
print(f"  Face value: USD {face:.2f}  |  Position: USD {notional:,}")
print(f"  Frequency: semi-annual ({freq}x/yr)")
print()
print(f"  Clean price:           USD {price:.4f}  ({price/face*100:.2f}% of par)")
print(f"  Macaulay duration:     {dur_mac:.4f} years")
print(f"  Modified duration:    {dur_mod:.4f} years")
print(f"  Convexity:             {conv:.4f}")
print()

# --- Hypothetical +100bp shift ---
delta_y = 0.01  # +100bp
price_new_actual = bond_price(coupon_rate, face, ytm + delta_y, t_years, freq)
price_pct_actual = (price_new_actual - price) / price

# Estimate via duration only
pct_change_dur_only = -dur_mod * delta_y
# Estimate via duration + convexity
pct_change_dur_conv = -dur_mod * delta_y + 0.5 * conv * delta_y**2

print(f"  Scenario: yield curve shifts +{delta_y*100:.0f}bp (from {ytm*100:.2f}% to {(ytm+delta_y)*100:.2f}%)")
print(f"  Actual new price:        USD {price_new_actual:.4f}  ({(price_new_actual/face)*100:.2f}%)")
print(f"  Actual % change:        {price_pct_actual*100:+.4f}%")
print(f"  Est (duration only):    {pct_change_dur_only*100:+.4f}%  (error: {(pct_change_dur_only - price_pct_actual)*10000:+.2f} bp)")
print(f"  Est (dur + convexity):  {pct_change_dur_conv*100:+.4f}%  (error: {(pct_change_dur_conv - price_pct_actual)*10000:+.2f} bp)")
print(f"  Position loss: USD {notional * price_pct_actual:,.2f}")
print()

# --- Duration hedge via Treasury futures ---
print("  Duration hedge: short 10y Treasury futures (DV01 = USD 80/100k face)")
target_dv01 = notional * dur_mod * 0.0001 / 100  # DV01 of cash position
print(f"  Cash position DV01 (per 1bp): USD {target_dv01:,.2f}")
fut_dv01 = 80.0  # USD 80 per 1bp per futures contract (face USD 100k)
n_contracts = -target_dv01 / fut_dv01  # short = negative
print(f"  Hedge: short {abs(n_contracts):.0f} contracts of 10y Treasury futures")
print(f"  (each contract: USD 100k notional, DV01=USD 80)")
print()

# --- Convexity correction across shifts ---
print(f"  Convexity matters as |Δy| grows:")
print(f"    {'Δy(bp)':>8} | {'% actual':>10} | {'% D only':>10} | {'% D+C':>10} | {'err(D only)':>12} | {'err(D+C)':>10}")
print("    " + "-" * 75)
for delta_bp in [-200, -100, -50, -25, 25, 50, 100, 200]:
    delta = delta_bp / 10000
    p_act = bond_price(coupon_rate, face, ytm + delta, t_years, freq)
    pch_act = (p_act - price) / price
    pch_d = -dur_mod * delta
    pch_dc = -dur_mod * delta + 0.5 * conv * delta**2
    print(f"    {delta_bp:>+7} | {pch_act*100:>+9.4f}% | {pch_d*100:>+9.4f}% | {pch_dc*100:>+9.4f}% | {(pch_d-pch_act)*10000:>+11.2f} | {(pch_dc-pch_act)*10000:>+9.2f}")
print()
print("Key insight: convexity is the curvature of the price-yield curve.")
print("Duration alone is linear (underestimates gains + losses asymmetrically).")
print("Convexity is always positive — long bonds have positive convexity (good).")
print("Production: pension funds, insurance companies use this for ALM.")`;

export const BOND_RUST = `use rayon::prelude::*;

/// Bond analytics: price, duration, convexity.
/// HYPOTHETICAL SCENARIO: 10y Treasury position USD 100M.
pub struct Bond {
    pub coupon_rate: f64,    // annual coupon rate
    pub face: f64,           // face value (typically 100)
    pub t_years: f64,        // maturity in years
    pub freq: u32,           // payment frequency (1, 2, 4)
}

impl Bond {
    /// Continuous-compounded bond price.
    pub fn price(&self, ytm: f64) -> f64 {
        let n_periods = (self.t_years * self.freq as f64) as usize;
        let dt = 1.0 / self.freq as f64;
        (1..=n_periods).map(|t| {
            let mut cf = self.coupon_rate * self.face / self.freq as f64;
            if t == n_periods { cf += self.face; }
            let time_yrs = t as f64 * dt;
            cf * (-ytm * time_yrs).exp()
        }).sum()
    }

    pub fn macaulay_duration(&self, ytm: f64) -> f64 {
        let n_periods = (self.t_years * self.freq as f64) as usize;
        let dt = 1.0 / self.freq as f64;
        let price = self.price(ytm);
        let weighted_pv: f64 = (1..=n_periods).map(|t| {
            let mut cf = self.coupon_rate * self.face / self.freq as f64;
            if t == n_periods { cf += self.face; }
            let time_yrs = t as f64 * dt;
            time_yrs * cf * (-ytm * time_yrs).exp()
        }).sum();
        weighted_pv / price
    }

    pub fn modified_duration(&self, ytm: f64) -> f64 {
        self.macaulay_duration(ytm) / (1.0 + ytm / self.freq as f64)
    }

    pub fn convexity(&self, ytm: f64) -> f64 {
        let n_periods = (self.t_years * self.freq as f64) as usize;
        let dt = 1.0 / self.freq as f64;
        let price = self.price(ytm);
        let weighted_pv: f64 = (1..=n_periods).map(|t| {
            let mut cf = self.coupon_rate * self.face / self.freq as f64;
            if t == n_periods { cf += self.face; }
            let time_yrs = t as f64 * dt;
            time_yrs * (time_yrs + dt) * cf * (-ytm * time_yrs).exp()
        }).sum();
        weighted_pv / price
    }

    /// DV01 — price change per 1bp yield move.
    pub fn dv01(&self, ytm: f64) -> f64 {
        let price = self.price(ytm);
        let mod_d = self.modified_duration(ytm);
        -price * mod_d * 0.0001
    }
}

/// Portfolio of bonds — compute aggregate duration + convexity.
pub struct BondPortfolio {
    pub bonds: Vec<(Bond, f64, f64)>,  // (bond, weight, ytm)
}

impl BondPortfolio {
    pub fn portfolio_duration(&self) -> f64 {
        self.bonds.par_iter()
            .map(|(b, w, ytm)| w * b.modified_duration(*ytm))
            .sum()
    }
    pub fn portfolio_convexity(&self) -> f64 {
        self.bonds.par_iter()
            .map(|(b, w, ytm)| w * b.convexity(*ytm))
            .sum()
    }
}`;

export const BOND_SCALA = `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

/**
 * Distributed bond portfolio analytics across a 100k-bond book.
 * Used at pension funds (CalPERS, Ontario Teachers), insurance
 * companies (MetLife, Prudential), and asset managers (PIMCO).
 *
 * Compute portfolio duration + convexity for ALM (Asset-Liability
 * Management). Hedge interest-rate risk via Treasury futures.
 */
object BondAnalytics {

  case class Bond(couponRate: Double, face: Double,
                  tYears: Double, freq: Int)

  /** Continuous-compounded bond price. */
  def price(bond: Bond, ytm: Double): Double = {
    val nPeriods = (bond.tYears * bond.freq).toInt
    val dt = 1.0 / bond.freq
    (1 to nPeriods).map { t =>
      var cf = bond.couponRate * bond.face / bond.freq
      if (t == nPeriods) cf += bond.face
      val timeYrs = t * dt
      cf * math.exp(-ytm * timeYrs)
    }.sum
  }

  /** Macaulay duration (years). */
  def macaulayDuration(bond: Bond, ytm: Double): Double = {
    val nPeriods = (bond.tYears * bond.freq).toInt
    val dt = 1.0 / bond.freq
    val price = BondAnalytics.price(bond, ytm)
    val weightedPV = (1 to nPeriods).map { t =>
      var cf = bond.couponRate * bond.face / bond.freq
      if (t == nPeriods) cf += bond.face
      val timeYrs = t * dt
      timeYrs * cf * math.exp(-ytm * timeYrs)
    }.sum
    weightedPV / price
  }

  /** Modified duration. */
  def modifiedDuration(bond: Bond, ytm: Double): Double =
    macaulayDuration(bond, ytm) / (1 + ytm / bond.freq)

  /** Convexity (second-order price sensitivity). */
  def convexity(bond: Bond, ytm: Double): Double = {
    val nPeriods = (bond.tYears * bond.freq).toInt
    val dt = 1.0 / bond.freq
    val price = BondAnalytics.price(bond, ytm)
    val weightedPV = (1 to nPeriods).map { t =>
      var cf = bond.couponRate * bond.face / bond.freq
      if (t == nPeriods) cf += bond.face
      val timeYrs = t * dt
      timeYrs * (timeYrs + dt) * cf * math.exp(-ytm * timeYrs)
    }.sum
    weightedPV / price
  }

  /** DV01 — price change per 1bp yield move. */
  def dv01(bond: Bond, ytm: Double): Double = {
    val p = price(bond, ytm)
    val modD = modifiedDuration(bond, ytm)
    -p * modD * 0.0001
  }

  /** Portfolio duration + convexity from a bond book in Parquet. */
  def portfolioAnalytics(spark: SparkSession,
                          bookPath: String): (Double, Double) = {
    import spark.implicits._
    val book = spark.read.parquet(bookPath)
      .as[(Bond, Double, Double)]  // (bond, weight, ytm)
    val totalDur = book.map { case (b, w, y) =>
      w * modifiedDuration(b, y)
    }.reduce(_ + _)
    val totalConv = book.map { case (b, w, y) =>
      w * convexity(b, y)
    }.reduce(_ + _)
    (totalDur, totalConv)
  }
}`;

export const BOND_ELIXIR = `defmodule Quant.BondAnalytics do
  @moduledoc """
  Streaming bond analytics — recompute duration/convexity/DV01
  as the yield curve moves tick-by-tick.

  HYPOTHETICAL SCENARIO: pension fund with USD 100M in 10y Treasury.
  Each 1bp yield move triggers a recompute + hedge adjustment.
  """

  use GenServer

  defstruct [:holdings_table, :yield_curve]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    # ETS: {bond_id} → %{coupon, face, t_years, freq, notional}
    holdings = :ets.new(:bond_holdings, [:set, :public, read_concurrency: true])
    {:ok, %__MODULE__{holdings_table: holdings, yield_curve: %{}}}
  end

  @impl true
  def handle_cast({:yield_update, tenor, new_yield}, state) do
    state = put_in(state, [:yield_curve, tenor], new_yield)
    # Recompute portfolio duration + DV01
    {total_dur, total_dv01} = portfolio_analytics(state)
    # Broadcast to ALM/hedge layer
    Phoenix.PubSub.broadcast(Quant.PubSub, "alm:metrics",
      {:portfolio_update, total_dur, total_dv01})
    {:noreply, state}
  end

  # Continuous-compounded bond price
  def price(coupon, face, ytm, t_years, freq) do
    n_periods = trunc(t_years * freq)
    dt = 1.0 / freq
    Enum.reduce(1..n_periods, 0.0, fn t, acc ->
      cf = if t == n_periods, do: coupon * face / freq + face,
                            else: coupon * face / freq
      time_yrs = t * dt
      acc + cf * :math.exp(-ytm * time_yrs)
    end)
  end

  def macaulay_duration(coupon, face, ytm, t_years, freq) do
    n_periods = trunc(t_years * freq)
    dt = 1.0 / freq
    p = price(coupon, face, ytm, t_years, freq)
    weighted_pv = Enum.reduce(1..n_periods, 0.0, fn t, acc ->
      cf = if t == n_periods, do: coupon * face / freq + face,
                            else: coupon * face / freq
      time_yrs = t * dt
      acc + time_yrs * cf * :math.exp(-ytm * time_yrs)
    end)
    weighted_pv / p
  end

  def modified_duration(coupon, face, ytm, t_years, freq) do
    macaulay_duration(coupon, face, ytm, t_years, freq) / (1 + ytm / freq)
  end

  def convexity(coupon, face, ytm, t_years, freq) do
    n_periods = trunc(t_years * freq)
    dt = 1.0 / freq
    p = price(coupon, face, ytm, t_years, freq)
    weighted_pv = Enum.reduce(1..n_periods, 0.0, fn t, acc ->
      cf = if t == n_periods, do: coupon * face / freq + face,
                            else: coupon * face / freq
      time_yrs = t * dt
      acc + time_yrs * (time_yrs + dt) * cf * :math.exp(-ytm * time_yrs)
    end)
    weighted_pv / p
  end

  defp portfolio_analytics(state) do
    holdings = :ets.tab2list(state.holdings_table)
    Enum.reduce(holdings, {0.0, 0.0}, fn {_id, %{coupon: c, face: f, t: t,
                                                  freq: fr, notional: n,
                                                  ytm: y}}, {td, tv01}) ->
      mod_d = modified_duration(c, f, y, t, fr)
      dv01 = -n * mod_d * 0.0001
      {td + mod_d, tv01 + dv01}
    end)
  end
end`;
