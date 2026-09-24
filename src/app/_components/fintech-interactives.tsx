"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Atom, Box, Layers, Network, Cpu, Activity, TrendingUp, TrendingDown,
  Zap, DollarSign, BarChart3, AlertTriangle, Radio,
} from "lucide-react";
import {
  BlackScholesCalculator,
  MonteCarloVaR,
  RealTimeMarketData,
  PortfolioOptimization,
  VolatilitySurface,
  YieldCurve,
  FraudDetectionGNN,
  HFTOrderBook,
} from "./fintech-interactives-part1";
import {
  Slider,
  LazyModal,
  InfoCallout,
} from "./space-interactives-part1";

/**
 * FintechInteractives — 8 fully interactive fintech visuals, each opening
 * in a lazy browser popup. Mirrors the space/quantum-interactives.tsx
 * pattern but with quant-finance topics: Black-Scholes, Monte Carlo VaR,
 * real-time market data (Yahoo Finance + synthetic), Markowitz portfolio,
 * vol surface, yield curve, GNN fraud, HFT order book.
 *
 * Lazy evaluation: each interactive's heavy SVG + state only mounts when
 * the user clicks its card.
 */

interface InteractiveCard {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  accent: string;
  icon: ReactNode;
  thumb: ReactNode;
  content: ReactNode;
}

const CARDS: InteractiveCard[] = [
  {
    id: "bs",
    step: "1",
    title: "Black-Scholes calculator",
    subtitle: "C = S·N(d₁) - K·e^(-rT)·N(d₂) + 5 Greeks",
    accent: "oklch(0.55 0.16 30)",
    icon: <DollarSign className="h-4 w-4" />,
    thumb: <BSThumb />,
    content: <BlackScholesCalculator />,
  },
  {
    id: "var",
    step: "2",
    title: "Monte Carlo VaR / CVaR",
    subtitle: "10k GBM paths → quantile + Expected Shortfall",
    accent: "oklch(0.55 0.16 0)",
    icon: <AlertTriangle className="h-4 w-4" />,
    thumb: <VaRThumb />,
    content: <MonteCarloVaR />,
  },
  {
    id: "realtime",
    step: "3",
    title: "Real-time market data (toggle)",
    subtitle: "Yahoo Finance API + synthetic GBM fallback",
    accent: "oklch(0.55 0.16 165)",
    icon: <BarChart3 className="h-4 w-4" />,
    thumb: <RealTimeThumb />,
    content: <RealTimeMarketData />,
  },
  {
    id: "portfolio",
    step: "4",
    title: "Markowitz efficient frontier",
    subtitle: "min w'Σw - λ·w'μ — 3-asset frontier",
    accent: "oklch(0.55 0.16 250)",
    icon: <TrendingUp className="h-4 w-4" />,
    thumb: <FrontierThumb />,
    content: <PortfolioOptimization />,
  },
  {
    id: "volsurface",
    step: "5",
    title: "Volatility surface",
    subtitle: "Smile + term structure — SVI parametric",
    accent: "oklch(0.55 0.16 320)",
    icon: <Activity className="h-4 w-4" />,
    thumb: <VolSurfaceThumb />,
    content: <VolatilitySurface />,
  },
  {
    id: "yield",
    step: "6",
    title: "Treasury yield curve",
    subtitle: "Normal / Inverted / Flat — recession signal",
    accent: "oklch(0.55 0.16 200)",
    icon: <BarChart3 className="h-4 w-4" />,
    thumb: <YieldThumb />,
    content: <YieldCurve />,
  },
  {
    id: "fraud",
    step: "7",
    title: "GNN fraud detection",
    subtitle: "Transaction graph — smurfing detection",
    accent: "oklch(0.55 0.16 0)",
    icon: <Network className="h-4 w-4" />,
    thumb: <FraudThumb />,
    content: <FraudDetectionGNN />,
  },
  {
    id: "hft",
    step: "8",
    title: "HFT order book",
    subtitle: "Bid-ask microstructure — maker/taker, PFOF",
    accent: "oklch(0.55 0.16 30)",
    icon: <Cpu className="h-4 w-4" />,
    thumb: <HFTThumb />,
    content: <HFTOrderBook />,
  },
];

// ============================================================
// Animated thumbnails
// ============================================================

function BSThumb() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <line x1="10" y1="115" x2="90" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <motion.path d="M 10 115 L 50 115 L 80 95 L 90 75" fill="none" stroke="oklch(0.75 0.20 30)" strokeWidth="1.5"
        animate={{ d: ["M 10 115 L 50 115 L 80 95 L 90 75", "M 10 115 L 50 115 L 80 100 L 90 80", "M 10 115 L 50 115 L 80 95 L 90 75"] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <text x="50" y="30" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.10 250)" fontWeight="bold">C = S·N(d₁)</text>
      <text x="50" y="125" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">Long call payoff</text>
      <text x="50" y="135" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.10 250)">- K·e^(-rT)·N(d₂)</text>
    </svg>
  );
}

function VaRThumb() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <line x1="10" y1="115" x2="90" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <line x1="10" y1="20" x2="10" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      {/* Histogram bars */}
      {[5, 10, 18, 25, 30, 28, 20, 10, 5, 2].map((h, i) => (
        <motion.rect key={i} x={12 + i * 8} y={115 - h * 3} width="6" height={h * 3}
          fill={i < 2 ? "oklch(0.75 0.20 0)" : "oklch(0.65 0.16 250 / 0.5)"}
          animate={{ height: [h * 3, h * 3 * 0.8, h * 3] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
        />
      ))}
      <line x1="22" y1="20" x2="22" y2="115" stroke="oklch(0.85 0.20 0)" strokeWidth="1" strokeDasharray="2 1" />
      <text x="50" y="135" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">VaR + CVaR</text>
    </svg>
  );
}

function RealTimeThumb() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <line x1="10" y1="115" x2="90" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <motion.polyline points="10,80 25,70 40,75 55,60 70,55 85,40" fill="none" stroke="oklch(0.75 0.20 30)" strokeWidth="1.5"
        animate={{ points: ["10,80 25,70 40,75 55,60 70,55 85,40", "10,85 25,75 40,72 55,65 70,50 85,35", "10,80 25,70 40,75 55,60 70,55 85,40"] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <text x="50" y="25" textAnchor="middle" fontSize="7" fill="oklch(0.85 0.20 165)" fontWeight="bold">AAPL MSFT</text>
      <text x="50" y="135" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">real vs synthetic</text>
    </svg>
  );
}

function FrontierThumb() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <line x1="10" y1="115" x2="90" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <line x1="10" y1="20" x2="10" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      {/* Frontier curve */}
      <motion.path d="M 15 105 Q 35 60 55 50 T 85 35" fill="none" stroke="oklch(0.75 0.20 250)" strokeWidth="1.5"
        animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }}
      />
      <circle cx="40" cy="65" r="3" fill="oklch(0.85 0.20 165)" />
      <text x="50" y="135" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">Markowitz frontier</text>
    </svg>
  );
}

function VolSurfaceThumb() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <line x1="10" y1="115" x2="90" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <line x1="10" y1="20" x2="10" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      {/* Smile curve */}
      <motion.path d="M 15 80 Q 30 100 50 90 Q 70 100 85 70" fill="none" stroke="oklch(0.75 0.20 320)" strokeWidth="1.5"
      />
      {Array.from({ length: 5 }).map((_, i) => (
        <circle key={i} cx={20 + i * 16} cy={90 - i % 2 * 15 + (i - 2) * 5} r="1.5" fill="oklch(0.65 0.16 250)" />
      ))}
      <text x="50" y="135" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">Vol smile</text>
    </svg>
  );
}

function YieldThumb() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <line x1="10" y1="115" x2="90" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <line x1="10" y1="20" x2="10" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <motion.polyline points="15,50 30,55 45,60 60,55 75,50 90,45" fill="none" stroke="oklch(0.75 0.20 200)" strokeWidth="1.5"
        animate={{ points: ["15,50 30,55 45,60 60,55 75,50 90,45", "15,55 30,50 45,45 60,50 75,55 90,60", "15,50 30,55 45,60 60,55 75,50 90,45"] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <text x="50" y="135" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">Yield curve</text>
    </svg>
  );
}

function FraudThumb() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      {/* Fraud network nodes */}
      <circle cx="20" cy="60" r="6" fill="oklch(0.65 0.16 165 / 0.6)" />
      <circle cx="50" cy="40" r="6" fill="oklch(0.65 0.16 165 / 0.6)" />
      <circle cx="80" cy="60" r="6" fill="oklch(0.75 0.20 0 / 0.6)" />
      <circle cx="35" cy="100" r="6" fill="oklch(0.65 0.16 165 / 0.6)" />
      <circle cx="65" cy="100" r="6" fill="oklch(0.75 0.20 0 / 0.6)" />
      <line x1="20" y1="60" x2="50" y2="40" stroke="oklch(0.65 0.10 250 / 0.5)" strokeWidth="0.5" />
      <motion.line x1="50" y1="40" x2="80" y2="60" stroke="oklch(0.85 0.20 0)" strokeWidth="1.5"
        animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.line x1="80" y1="60" x2="65" y2="100" stroke="oklch(0.85 0.20 0)" strokeWidth="1.5"
        animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
      />
      <text x="50" y="125" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">GNN transaction graph</text>
      <text x="50" y="135" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.10 250)">smurfing detected</text>
    </svg>
  );
}

function HFTThumb() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <line x1="50" y1="20" x2="50" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" strokeDasharray="2 1" />
      {/* Bids (green, left) */}
      {[0, 1, 2, 3].map(i => (
        <motion.rect key={`b${i}`} x={50 - (20 - i * 3)} y={30 + i * 20} width={20 - i * 3} height="15" fill="oklch(0.65 0.16 165 / 0.6)"
          animate={{ width: [20 - i * 3, 18 - i * 3, 20 - i * 3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
        />
      ))}
      {/* Asks (red, right) */}
      {[0, 1, 2, 3].map(i => (
        <motion.rect key={`a${i}`} x={50} y={30 + i * 20} width={20 - i * 3} height="15" fill="oklch(0.65 0.16 0 / 0.6)"
          animate={{ width: [20 - i * 3, 18 - i * 3, 20 - i * 3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 + 0.3 }}
        />
      ))}
      <text x="50" y="135" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">Order book</text>
    </svg>
  );
}

// ============================================================
// Main grid component
// ============================================================

export function FintechInteractives() {
  const [openId, setOpenId] = useState<string | null>(null);
  const openCard = openId ? CARDS.find(c => c.id === openId) : null;

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5 flex-wrap">
        <Zap className="h-3 w-3 text-amber-500" />
        Click any card to open an interactive visual in a lazy popup — slide S/K/r/σ/T to price options, run 10k Monte Carlo paths, toggle real (Yahoo) vs synthetic market data, optimise Markowitz portfolio, fit vol surface, predict recession from yield curve, detect fraud via GNN, watch HFT order book…
        <span className="text-[10px]">Modal content only mounts on click.</span>
      </p>

      {/* 8 cards in a grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CARDS.map(c => (
          <motion.button
            key={c.id}
            type="button"
            onClick={() => setOpenId(c.id)}
            className="relative rounded-xl overflow-hidden border border-border/60 hover:border-primary/60 hover:shadow-lg transition-all bg-gradient-to-br from-card to-muted/30 group"
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            aria-label={`Open interactive: ${c.title}`}
          >
            <div className="relative w-full bg-gradient-to-br from-muted/40 to-card" style={{ aspectRatio: "9 / 14", maxHeight: 280 }}>
              <div className="absolute inset-0 p-2">
                {c.thumb}
              </div>
              <div className="absolute top-2 left-2 z-10">
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-0.5"
                  style={{ backgroundColor: c.accent + "20", color: c.accent }}>
                  {c.icon} QUANT {c.step}
                </Badge>
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ opacity: 1, scale: 1 }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur rounded-full p-2.5 border border-border shadow-md"
                >
                  <DollarSign className="h-4 w-4 text-primary" />
                </motion.div>
              </div>
            </div>
            <div className="p-2.5 border-t border-border/40 bg-background/80">
              <p className="text-xs font-semibold leading-tight" style={{ color: c.accent }}>
                {c.title}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{c.subtitle}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* LAZY modal — only mounts the heavy interactive when card is clicked */}
      <LazyModal
        open={!!openCard}
        onClose={() => setOpenId(null)}
        title={openCard?.title ?? ""}
        subtitle={openCard?.subtitle}
        accent={openCard?.accent ?? "oklch(0.55 0.16 250)"}
        icon={openCard?.icon ?? <DollarSign className="h-4 w-4" />}
      >
        {openCard?.content}
      </LazyModal>
    </div>
  );
}
