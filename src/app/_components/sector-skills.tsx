"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ELEGANT_CODE_CARDS } from "./_elegant_code_cards";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Brain, Users } from "lucide-react";

/**
 * SectorSkills — for each industry sector, list the UNIQUE skills that
 * appear across all its cards. Helps readers see which sectors share
 * skill profiles (e.g., Maritime requires Maritime navigator + Marine
 * underwriter + Maritime data engineer + etc.).
 *
 * Data: derived from the outcomes[] field on each card. Each outcome has
 * a `sector` (raw) and a `skill` field. We classify the sector to a
 * canonical industry, then group unique skills per canonical sector.
 */

interface SectorSkillEntry {
  sectorName: string;
  skills: Array<{
    name: string;
    count: number; // how many cards have this skill in this sector
    cards: Array<{ cardIndex: number; cardTitle: string; cardAccent: string }>;
  }>;
  totalCards: number;
}

// Reuse the classifier from sector-index.tsx (duplicated here for component independence).
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

const SECTOR_ORDER = [
  "Maritime", "Fintech", "Genomics & Biology", "Audio", "Mass Spectrometry",
  "Cryo-EM", "Meteorology", "Hemodynamics", "Turbulence", "Aviation",
  "Astronomy", "Climate & Hydrology", "Machine Learning", "Game Physics",
  "Aerospace", "Orbital Mechanics", "Nuclear Physics", "Networks & SRE",
  "Information Theory", "Thermodynamics", "Evolutionary Biology", "Other",
];

export function SectorSkills() {
  const sectors = useMemo<SectorSkillEntry[]>(() => {
    const sectorMap = new Map<string, SectorSkillEntry>();
    ELEGANT_CODE_CARDS.forEach((card, idx) => {
      if (!card.outcomes) return;
      for (const o of card.outcomes) {
        const sector = classifySector(o.sector);
        if (!sectorMap.has(sector)) {
          sectorMap.set(sector, { sectorName: sector, skills: [], totalCards: 0 });
        }
        const entry = sectorMap.get(sector)!;
        // Find or create the skill entry.
        let skillEntry = entry.skills.find((s) => s.name === o.skill);
        if (!skillEntry) {
          skillEntry = { name: o.skill, count: 0, cards: [] };
          entry.skills.push(skillEntry);
        }
        // Increment count if this card hasn't already contributed this skill.
        if (!skillEntry.cards.find((c) => c.cardIndex === idx)) {
          skillEntry.count += 1;
          skillEntry.cards.push({
            cardIndex: idx,
            cardTitle: card.title,
            cardAccent: card.accent,
          });
        }
      }
    });
    // Compute totalCards per sector.
    for (const entry of sectorMap.values()) {
      const uniqueCardIdxs = new Set<number>();
      for (const skill of entry.skills) {
        for (const c of skill.cards) {
          uniqueCardIdxs.add(c.cardIndex);
        }
      }
      entry.totalCards = uniqueCardIdxs.size;
    }
    // Sort skills by count (descending), then alphabetically.
    for (const entry of sectorMap.values()) {
      entry.skills.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    }
    // Sort sectors by SECTOR_ORDER.
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
        For each sector, lists the unique skills that appear across all its cards —
        with the count of cards where each skill appears. Helps readers see which
        sectors share skill profiles (e.g., Maritime requires Maritime navigator +
        Marine underwriter + Maritime data engineer + etc.). Hover or click any
        skill to see the cards where it appears.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {sectors.filter((s) => s.skills.length > 0).map((sector) => (
          <div
            key={sector.sectorName}
            className="rounded-md border border-border/60 bg-muted/20 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-foreground/80 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" />
                {sector.sectorName}
              </p>
              <Badge variant="outline" className="text-[10px]">
                {sector.skills.length} skill{sector.skills.length === 1 ? "" : "s"} · {sector.totalCards} card{sector.totalCards === 1 ? "" : "s"}
              </Badge>
            </div>
            <ul className="space-y-1.5">
              {sector.skills.map((skill) => (
                <li key={skill.name} className="text-xs">
                  <div className="flex items-start gap-2">
                    <Brain className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-foreground/80">{skill.name}</span>
                        <Badge variant="secondary" className="text-[9px] px-1 py-0">
                          {skill.count} card{skill.count === 1 ? "" : "s"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {skill.cards.map((c) => (
                          <Link
                            key={c.cardIndex}
                            href={`${hrefFor("elegant-code")}#card-${c.cardIndex}`}
                            className="text-[9px] px-1.5 py-0.5 rounded border border-border/60 bg-background hover:border-primary/40 hover:bg-primary/5 transition-colors"
                            style={{ color: c.cardAccent }}
                          >
                            {c.cardTitle.split(" — ")[0]}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
