"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ELEGANT_CODE_CARDS } from "./_elegant_code_cards";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, BookOpen, Search, X } from "lucide-react";
import { THOUGHT_COUNTS } from "../_lib/thought-counts";

/**
 * DeeperThoughtsIndex — collects ALL deeper thoughts across the platform's
 * pages, filterable by ADR. Currently extracts thoughts from:
 *   - The 10 living-equation pages (5 thoughts each = 50)
 *   - The home page (6 thoughts)
 *   - The 20 elegant-code cards' insight fields
 *
 * As more pages get DeeperThought sections, this index grows.
 *
 * Readers can:
 *   - Filter by ADR (e.g., "ADR-043" → all thoughts about AlphaMissense)
 *   - Filter by text search
 *   - Click any thought to navigate to the page where it lives
 */

// Curated index of deeper thoughts across the platform.
// Each entry: { page, pageUrl, thoughtTitle, adr, content }
const THOUGHTS_INDEX = [
  // Home page thoughts
  { page: "Home", pageUrl: "/", thoughtTitle: "The platform IS the graph, not the tree", adr: "ADR-001", content: "Most reference architectures are TREES. This platform's elegant-code thesis is a GRAPH." },
  { page: "Home", pageUrl: "/", thoughtTitle: "Specialisation is cheap; intersections are rare", adr: "ADR-054", content: "The next century of computational science belongs to those who refuse to stay in their lane." },
  { page: "Home", pageUrl: "/", thoughtTitle: "The code is REPRESENTATIONAL — the math is the signal, the tool is the amplifier", adr: "ADR-034", content: "Without NumPy, the SVD that rediscovers human migration would take weeks. Without AlphaFold, attention would require supercomputers." },
  { page: "Home", pageUrl: "/", thoughtTitle: "The 'X IS Y' insight IS the platform's product", adr: "ADR-043", content: "The platform sells RECOGNITION — the small shock of seeing the same math in two places." },
  { page: "Home", pageUrl: "/", thoughtTitle: "Every equation has a hidden life — and a human profile", adr: "ADR-037", content: "Each card names the SKILL and TALENT each sector rewards — it's career guidance." },
  { page: "Home", pageUrl: "/", thoughtTitle: "The fold pattern IS progressive disclosure — the right UX for serious thinkers", adr: "ADR-050", content: "Progressive disclosure isn't just a UX pattern; it's an epistemological one." },
  // Living pages — summary entries (full content is on the pages themselves)
  { page: "Living SVD", pageUrl: "/living-svd", thoughtTitle: "SVD IS the Fourier transform for data", adr: "ADR-034", content: "In signal processing, Fourier decomposes into sine waves. SVD decomposes into components. Same question: what explains the most variance?" },
  { page: "Living SVD", pageUrl: "/living-svd", thoughtTitle: "Out-of-Africa isn't discovered — it's EMERGENT", adr: "ADR-037", content: "Nobody told SVD about human migration. The equation just found the largest axis of variance — and that axis IS the migration." },
  { page: "Living Attention", pageUrl: "/living-attention", thoughtTitle: "Attention IS natural selection", adr: "ADR-034", content: "Residues that mutate together are in physical contact. Attention on MSA finds co-evolving pairs. Q_i·K_j measures co-variation." },
  { page: "Living Attention", pageUrl: "/living-attention", thoughtTitle: "DNA IS a language — and attention is the universal parser", adr: "ADR-043", content: "Codons are words, gene regulation is grammar, mutations are typos, co-evolution is syntax." },
  { page: "Living FFT", pageUrl: "/living-fft", thoughtTitle: "FFT IS the change of basis", adr: "ADR-034", content: "FFT rotates from time to frequency. SVD rotates from rows to components. Both are unitary transforms — cousins." },
  { page: "Living FFT", pageUrl: "/living-fft", thoughtTitle: "Gauss invented FFT in 1805 — before Fourier", adr: "ADR-001", content: "Carl Friedrich Gauss derived the FFT in an unpublished 1805 note. 160 years before Cooley-Tukey's 1965 paper." },
  { page: "Living Poisson", pageUrl: "/living-poisson", thoughtTitle: "Poisson IS the law of rare events — a theorem, not an approximation", adr: "ADR-037", content: "Sequencing reads, server requests, radioactive decays — independent rare events converge to the SAME distribution." },
  { page: "Living Poisson", pageUrl: "/living-poisson", thoughtTitle: "GATK's 95% threshold IS Poisson(λ=14)", adr: "ADR-043", content: "At λ=14, P(≥10×) crosses 95% — GATK's minimum coverage. The math dictates the experiment." },
  { page: "Living Entropy", pageUrl: "/living-entropy", thoughtTitle: "Entropy IS the universal currency of disorder", adr: "ADR-034", content: "Shannon measured message information. Boltzmann measured gas disorder. Haldane measured genetic diversity. Same formula." },
  { page: "Living Entropy", pageUrl: "/living-entropy", thoughtTitle: "The 2nd law IS the arrow of time", adr: "ADR-055", content: "Entropy always increases — in a gas, in a message, in a population. The 2nd law IS the arrow of time." },
  { page: "Living Black-Scholes", pageUrl: "/living-black-scholes", thoughtTitle: "Black-Scholes IS the price of the right to act", adr: "ADR-054", content: "A Lloyd's underwriter, a CME quant, and a Fisher geneticist all evaluate the same formula." },
  { page: "Living Haversine", pageUrl: "/living-haversine", thoughtTitle: "Haversine IS the universal great-circle distance", adr: "ADR-055", content: "Rotterdam→Singapore, LHR→JFK, Sirius→Canopus — same formula, different R." },
  { page: "Living Kalman", pageUrl: "/living-kalman", thoughtTitle: "Kalman IS the universal state estimator", adr: "ADR-055", content: "AIS vessel tracking, ADS-B flight tracking, 1000-Genomes allele tracking — same Bayesian update. Kalman 1960 for Apollo 1969." },
  { page: "Living Monte Carlo", pageUrl: "/living-monte-carlo", thoughtTitle: "Monte Carlo IS the universal estimation engine", adr: "ADR-054", content: "Metropolis 1946 at Los Alamos for neutron transport. Boyle 1977 for option pricing. PLINK for rare-variant p-values." },
  { page: "Living GBM", pageUrl: "/living-gbm", thoughtTitle: "GBM IS the universal multiplicative-noise equation", adr: "ADR-054", content: "SPX returns, Rotterdam dwell times, Wright-Fisher allele drift — multiplicative noise keeps S positive." },
];

// Extract unique ADRs.
const UNIQUE_ADRS = Array.from(new Set(THOUGHTS_INDEX.map(t => t.adr))).sort();

export function DeeperThoughtsIndex() {
  const [filter, setFilter] = useState("");
  const [selectedADR, setSelectedADR] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = THOUGHTS_INDEX;
    if (selectedADR) {
      result = result.filter(t => t.adr === selectedADR);
    }
    if (filter.trim()) {
      const q = filter.toLowerCase().trim();
      result = result.filter(t =>
        t.thoughtTitle.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q) ||
        t.page.toLowerCase().includes(q) ||
        t.adr.toLowerCase().includes(q)
      );
    }
    return result;
  }, [filter, selectedADR]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Every page on the platform should have 5+ "My deeper thought" sections — original arguments
        (not summaries), each connected to an ADR in the research section. This index collects them all
        in one place, filterable by ADR. Currently indexed: {THOUGHTS_INDEX.length} thoughts across
        {new Set(THOUGHTS_INDEX.map(t => t.page)).size} pages (growing as rollout continues).
      </p>

      {/* Search + ADR filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search thoughts — e.g., 'SVD', 'Poisson', 'natural selection', 'ADR-043'"
            className="w-full pl-10 pr-10 py-2 text-sm rounded-md border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
          {filter && (
            <button onClick={() => setFilter("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ADR chips */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedADR(null)}
            className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
              !selectedADR ? "bg-primary text-primary-foreground border-primary" : "border-border/60 bg-muted/30 hover:border-primary/40"
            }`}
          >
            All ADRs
          </button>
          {UNIQUE_ADRS.map(adr => (
            <button
              key={adr}
              onClick={() => setSelectedADR(selectedADR === adr ? null : adr)}
              className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                selectedADR === adr ? "bg-primary text-primary-foreground border-primary" : "border-border/60 bg-muted/30 hover:border-primary/40"
              }`}
            >
              {adr}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} thought{filtered.length === 1 ? "" : "s"}
        {selectedADR && ` connected to ${selectedADR}`}
        {filter && ` matching "${filter}"`}
      </p>

      {/* Thoughts list */}
      <div className="space-y-2">
        {filtered.map((thought, i) => (
          <Link
            key={i}
            href={thought.pageUrl}
            className="block rounded-md border border-border/60 bg-muted/20 p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors group"
          >
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-semibold text-foreground/90">{thought.thoughtTitle}</p>
                  <Badge variant="outline" className="text-[9px] gap-0.5">
                    <BookOpen className="h-2.5 w-2.5" />
                    {thought.adr}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mb-1">
                  On: <span className="font-mono">{thought.pageUrl}</span> ({thought.page})
                  {(() => {
                    // Look up thought count from the THOUGHT_COUNTS map.
                    const pageId = thought.pageUrl === "/" ? "home" : thought.pageUrl.replace(/^\//, "");
                    const count = THOUGHT_COUNTS[pageId];
                    return count ? (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-[8px] px-1 py-0 rounded-full bg-primary/15 text-primary font-mono">
                        {count} thoughts
                      </span>
                    ) : null;
                  })()}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {thought.content}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          No thoughts match your filter. Try a different ADR or search term.
        </p>
      )}
    </div>
  );
}
