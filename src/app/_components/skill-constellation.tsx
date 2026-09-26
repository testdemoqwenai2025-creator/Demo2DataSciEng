"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import Link from "next/link";
import { ELEGANT_CODE_CARDS } from "./_elegant_code_cards";
import { hrefFor } from "../_lib/router";

/**
 * SkillConstellation — a tiny D3 force-directed graph inside each card modal.
 *
 * Shows just the 3 skills/talents of the currently-open card, connected to
 * the OTHER cards where each skill also appears. Lets readers see, at a
 * glance, where else each skill shows up — without leaving the modal.
 *
 * Layout:
 *   - Center node = the current card (colored with its accent).
 *   - 3 ring nodes around it = this card's 3 skills (orange).
 *   - Outer nodes = OTHER cards that share each skill (colored by their
 *     own accent, linked to the matching skill).
 *
 * Compact: 320×220 px SVG. Hover any node to see the connection count.
 */

interface ConstNode extends d3.SimulationNodeDatum {
  id: string;
  type: "card" | "skill" | "other-card";
  label: string;
  accent?: string;
  isSelf?: boolean;
}

interface ConstLink extends d3.SimulationLinkDatum<ConstNode> {
  source: string | ConstNode;
  target: string | ConstNode;
}

interface SkillConstellationProps {
  /** Index of the currently-open card (the "self" card). */
  cardIndex: number;
  height?: number;
}

export function SkillConstellation({ cardIndex, height = 240 }: SkillConstellationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(320);
  const [hovered, setHovered] = useState<ConstNode | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const e of entries) {
        setWidth(Math.max(280, e.contentRect.width));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || width < 280) return;

    const selfCard = ELEGANT_CODE_CARDS[cardIndex];
    if (!selfCard || !selfCard.outcomes) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Build the constellation.
    const nodes: ConstNode[] = [];
    const links: ConstLink[] = [];

    // 1. Self card (center node).
    const selfId = `self-${cardIndex}`;
    nodes.push({
      id: selfId,
      type: "card",
      label: selfCard.title.split(" — ")[0],
      accent: selfCard.accent,
      isSelf: true,
    });

    // 2. This card's 3 skills (ring nodes).
    const selfSkills = selfCard.outcomes.map((o) => o.skill);
    const skillNodeIds: Record<string, string> = {};
    for (const skill of selfSkills) {
      const skillId = `skill-${skill}`;
      skillNodeIds[skill] = skillId;
      nodes.push({
        id: skillId,
        type: "skill",
        label: skill,
      });
      // Link: self → skill
      links.push({ source: selfId, target: skillId });
    }

    // 3. Other cards that share each skill (outer nodes).
    // For each skill, find other cards where it appears in any outcome.
    const seenOtherCards = new Set<number>();
    for (const skill of selfSkills) {
      ELEGANT_CODE_CARDS.forEach((other, idx) => {
        if (idx === cardIndex) return;
        if (!other.outcomes) return;
        const hasSkill = other.outcomes.some((o) => o.skill === skill);
        if (hasSkill) {
          const otherId = `other-${idx}`;
          if (!seenOtherCards.has(idx)) {
            seenOtherCards.add(idx);
            nodes.push({
              id: otherId,
              type: "other-card",
              label: other.title.split(" — ")[0],
              accent: other.accent,
            });
          }
          // Link: skill → other card
          links.push({ source: skillNodeIds[skill], target: otherId });
        }
      });
    }

    // Build the simulation.
    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink<ConstNode, ConstLink>(links)
        .id((d) => d.id)
        .distance((d) => {
          // Self → skill = short; skill → other-card = longer.
          const src = d.source as ConstNode;
          const tgt = d.target as ConstNode;
          if (src.type === "card" && tgt.type === "skill") return 50;
          return 40;
        })
        .strength(0.4))
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d) => d.type === "skill" ? 18 : 12));

    // Draw links first.
    const linkSel = svg.append("g")
      .attr("stroke", "currentColor")
      .attr("stroke-opacity", 0.2)
      .attr("stroke-width", 1)
      .selectAll("line")
      .data(links)
      .join("line");

    // Draw nodes.
    const nodeSel = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(drag(sim) as any);

    nodeSel.append("circle")
      .attr("r", (d) => d.isSelf ? 12 : d.type === "skill" ? 9 : 7)
      .attr("fill", (d) => {
        if (d.isSelf) return d.accent ?? "oklch(0.65 0.16 250)";
        if (d.type === "skill") return "oklch(0.65 0.16 60)";  // orange
        return d.accent ?? "oklch(0.55 0.16 240)";
      })
      .attr("stroke", "var(--background)")
      .attr("stroke-width", 2);

    nodeSel.append("text")
      .text((d) => d.label)
      .attr("x", 0)
      .attr("y", (d) => (d.isSelf ? 22 : d.type === "skill" ? 20 : 18))
      .attr("text-anchor", "middle")
      .attr("font-size", (d) => d.isSelf ? 10 : 8)
      .attr("font-weight", (d) => d.isSelf ? 600 : 400)
      .attr("font-family", "ui-monospace, monospace")
      .attr("fill", "currentColor")
      .attr("fill-opacity", 0.85);

    // Hover behavior.
    nodeSel.on("mouseenter", (_e, d) => setHovered(d as ConstNode))
           .on("mouseleave", () => setHovered(null));

    sim.on("tick", () => {
      linkSel
        .attr("x1", (d) => (d.source as ConstNode).x ?? 0)
        .attr("y1", (d) => (d.source as ConstNode).y ?? 0)
        .attr("x2", (d) => (d.target as ConstNode).x ?? 0)
        .attr("y2", (d) => (d.target as ConstNode).y ?? 0);
      nodeSel.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      sim.stop();
    };
  }, [cardIndex, width, height]);

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="rounded-md border border-border/60 bg-muted/20 p-1.5">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="block"
          style={{ color: "var(--foreground)" }}
          aria-label={`Skill constellation for card ${cardIndex + 1}`}
        />
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {hovered ? (
          <span>
            <strong className="text-foreground/80">{hovered.label}</strong> —{" "}
            {hovered.type === "card" && "this card (center)"}
            {hovered.type === "skill" && "skill shared across multiple cards"}
            {hovered.type === "other-card" && "another card that shares a skill with this one"}
          </span>
        ) : (
          <span>
            Center node = this card. Orange nodes = this card's 3 skills. Outer nodes = other cards that share those skills.
            Drag any node to reposition. Hover to identify.
          </span>
        )}
      </p>
    </div>
  );
}

function drag(sim: d3.Simulation<ConstNode, ConstLink>) {
  function dragstarted(event: any) {
    if (!event.active) sim.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }
  function dragged(event: any) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }
  function dragended(event: any) {
    if (!event.active) sim.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }
  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}
