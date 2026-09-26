"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ELEGANT_CODE_CARDS } from "./_elegant_code_cards";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Boxes, ArrowRight } from "lucide-react";

/**
 * SectorIndex — a "Sector → Equations" reverse index on /resources.
 *
 * For each sector (e.g., "Maritime"), lists all the elegant-code cards
 * whose outcomes touch that sector. Helps readers entering from a specific
 * industry find their equations fast.
 *
 * Data structure: derived from the outcomes[] field on each card. Each
 * outcome has a `sector` field (e.g., "Lloyd's 90-day cargo-route option").
 * We normalize sector names by their primary industry keyword (e.g.,
 * "Maritime", "Fintech", "Genomics", "Audio", "Aerospace", "Climate").
 */

interface SectorEntry {
  sectorName: string;
  cards: Array<{
    cardIndex: number;
    cardTitle: string;
    cardAccent: string;
    outcomeSector: string;
    outcomeScience: string;
    outcomeSkill: string;
    outcomeTalent: string;
    liveDemoUrl?: string;
  }>;
}

// Map raw sector strings to canonical industry sectors.
function classifySector(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("marit") || s.includes("port") || s.includes("ais") || s.includes("vessel") || s.includes("lloyd") || s.includes("cargo") || s.includes("shipping") || s.includes("un comtrade") || s.includes("rotterdam") || s.includes("singapore")) {
    return "Maritime";
  }
  if (s.includes("spx") || s.includes("cme") || s.includes("fintech") || s.includes("option") || s.includes("medallion") || s.includes("renaissance") || s.includes("stock") || s.includes("credit") || s.includes("basel") || s.includes("bank") || s.includes("trade flow") || s.includes("solvency")) {
    return "Fintech";
  }
  if (s.includes("1000-genomes") || s.includes("gnomad") || s.includes("brca1") || s.includes("allele") || s.includes("dna") || s.includes("protein") || s.includes("msa") || s.includes("uniref") || s.includes("esm-2") || s.includes("sequencing") || s.includes("string") || s.includes("ppi")) {
    return "Genomics & Biology";
  }
  if (s.includes("audio") || s.includes("c-major") || s.includes("chord") || s.includes("music")) {
    return "Audio";
  }
  if (s.includes("mass spec") || s.includes("mass spectrometry") || s.includes("m/z") || s.includes("spectrometry") || s.includes("compound")) {
    return "Mass Spectrometry";
  }
  if (s.includes("cryo-em") || s.includes("micrograph")) {
    return "Cryo-EM";
  }
  if (s.includes("weather") || s.includes("ecmwf") || s.includes("atmosphere")) {
    return "Meteorology";
  }
  if (s.includes("blood") || s.includes("arter") || s.includes("aorta") || s.includes("aneurysm") || s.includes("hemodynamic")) {
    return "Hemodynamics";
  }
  if (s.includes("turbul") || s.includes("dns") || s.includes("kolmogorov") || s.includes("reynolds")) {
    return "Turbulence";
  }
  if (s.includes("lhr") || s.includes("jfk") || s.includes("flight") || s.includes("ads-b") || s.includes("aviation") || s.includes("polar route")) {
    return "Aviation";
  }
  if (s.includes("sirius") || s.includes("canopus") || s.includes("astronom") || s.includes("celestial")) {
    return "Astronomy";
  }
  if (s.includes("noaa") || s.includes("flood") || s.includes("fema") || s.includes("climate")) {
    return "Climate & Hydrology";
  }
  if (s.includes("imagenet") || s.includes("resnet") || s.includes("retrieval") || s.includes("ml")) {
    return "Machine Learning";
  }
  if (s.includes("game") || s.includes("unity") || s.includes("havok") || s.includes("ragdoll") || s.includes("60 fps")) {
    return "Game Physics";
  }
  if (s.includes("apollo") || s.includes("spacecraft") || s.includes("nasa") || s.includes("orbital")) {
    return "Aerospace";
  }
  if (s.includes("keplerian") || s.includes("earth around sun")) {
    return "Orbital Mechanics";
  }
  if (s.includes("radioactive") || s.includes("c-14") || s.includes("carbon dating") || s.includes("decay") || s.includes("neutron")) {
    return "Nuclear Physics";
  }
  if (s.includes("server") || s.includes("sre") || s.includes("network") || s.includes("overload")) {
    return "Networks & SRE";
  }
  if (s.includes("wikipedia") || s.includes("english") || s.includes("text")) {
    return "Information Theory";
  }
  if (s.includes("gas") || s.includes("boltzmann") || s.includes("thermodynamic")) {
    return "Thermodynamics";
  }
  if (s.includes("rna") || s.includes("evolution") || s.includes("population")) {
    return "Evolutionary Biology";
  }
  return "Other";
}

// Curated canonical sector display order (most common first).
const SECTOR_ORDER = [
  "Maritime",
  "Fintech",
  "Genomics & Biology",
  "Audio",
  "Mass Spectrometry",
  "Cryo-EM",
  "Meteorology",
  "Hemodynamics",
  "Turbulence",
  "Aviation",
  "Astronomy",
  "Climate & Hydrology",
  "Machine Learning",
  "Game Physics",
  "Aerospace",
  "Orbital Mechanics",
  "Nuclear Physics",
  "Networks & SRE",
  "Information Theory",
  "Thermodynamics",
  "Evolutionary Biology",
  "Other",
];

const liveMap: Record<number, string> = {
  0: "/living-svd",
  1: "/living-attention",
  2: "/living-poisson",
  3: "/living-fft",
  9: "/living-entropy",
  10: "/living-black-scholes",
  11: "/living-haversine",
  16: "/living-kalman",
  17: "/living-monte-carlo",
  18: "/living-gbm",
};

export function SectorIndex() {
  // Group all outcome tiles by canonical sector.
  const sectors = useMemo<SectorEntry[]>(() => {
    const sectorMap = new Map<string, SectorEntry>();
    ELEGANT_CODE_CARDS.forEach((card, idx) => {
      if (!card.outcomes) return;
      for (const o of card.outcomes) {
        const sector = classifySector(o.sector);
        if (!sectorMap.has(sector)) {
          sectorMap.set(sector, { sectorName: sector, cards: [] });
        }
        sectorMap.get(sector)!.cards.push({
          cardIndex: idx,
          cardTitle: card.title,
          cardAccent: card.accent,
          outcomeSector: o.sector,
          outcomeScience: o.science,
          outcomeSkill: o.skill,
          outcomeTalent: o.talent,
          liveDemoUrl: liveMap[idx],
        });
      }
    });
    // Sort sectors by SECTOR_ORDER, then alphabetically for unknown ones.
    return Array.from(sectorMap.values()).sort((a, b) => {
      const ia = SECTOR_ORDER.indexOf(a.sectorName);
      const ib = SECTOR_ORDER.indexOf(b.sectorName);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return a.sectorName.localeCompare(b.sectorName);
    });
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Each sector lists every elegant-code card whose outcomes touch that industry —
        with the science, skill, talent, and live-demo link (if available).
        Click any card name to open the full card on <code>/elegant-code#card-N</code> in a new context.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {sectors.map((sector) => (
          <div
            key={sector.sectorName}
            className="rounded-md border border-border/60 bg-muted/20 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-foreground/80 flex items-center gap-1.5">
                <Boxes className="h-4 w-4 text-primary" />
                {sector.sectorName}
              </p>
              <Badge variant="outline" className="text-[10px]">
                {sector.cards.length} card{sector.cards.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <ul className="space-y-1.5">
              {sector.cards.map((c, i) => (
                <li key={`${c.cardIndex}-${i}`}>
                  <Link
                    href={`${hrefFor("elegant-code")}#card-${c.cardIndex}`}
                    className="block rounded-md p-1.5 hover:bg-primary/5 transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                        style={{ backgroundColor: c.cardAccent }}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-semibold leading-tight group-hover:text-primary transition-colors"
                          style={{ color: c.cardAccent }}
                        >
                          {c.cardTitle.split(" — ")[0]}
                          <span className="text-muted-foreground font-normal"> · {c.outcomeScience}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                          {c.outcomeSector}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="text-[9px] px-1 py-0">{c.outcomeSkill}</Badge>
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 italic">{c.outcomeTalent}</Badge>
                          {c.liveDemoUrl && (
                            <Link
                              href={c.liveDemoUrl}
                              className="text-[9px] text-primary hover:underline flex items-center gap-0.5"
                            >
                              <Sparkles className="h-2.5 w-2.5" /> live
                            </Link>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
