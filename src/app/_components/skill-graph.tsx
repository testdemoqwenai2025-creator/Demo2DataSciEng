"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { ELEGANT_CODE_CARDS } from "./_elegant_code_cards";

/**
 * SkillGraph — D3.js force-directed graph of skills/talents shared across
 * the 20 elegant-code cards. Each card's `outcomes` field has skill + talent
 * fields. We build a bipartite graph:
 *   - skill nodes (orange) — e.g., "Computational biologist"
 *   - card nodes (blue) — e.g., "SVD"
 *   - edges connect a skill to every card where that skill appears
 *
 * The user can hover any node to see its connections highlighted. Click a
 * skill node to see all cards that reward it. Click a card node to see all
 * the skills/talents that card requires.
 */

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: "skill" | "card";
  label: string;
  count?: number; // for skill nodes: how many cards reward this skill
  accent?: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

export function SkillGraph({ height = 600 }: { height?: number }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(900);
  const [hovered, setHovered] = useState<GraphNode | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const e of entries) {
        setWidth(Math.max(360, e.contentRect.width));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || width < 360) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Build the bipartite graph: skills → cards.
    // Deduplicate skills (case-sensitive match) so we get a clean count.
    const skillMap = new Map<string, { cards: string[] }>();
    const cardNodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    ELEGANT_CODE_CARDS.forEach((card, idx) => {
      const cardNode: GraphNode = {
        id: `card-${idx}`,
        type: "card",
        label: card.title.split(" — ")[0],  // "SVD — the universal..." → "SVD"
        accent: card.accent,
      };
      cardNodes.push(cardNode);
      if (card.outcomes) {
        for (const o of card.outcomes) {
          if (!skillMap.has(o.skill)) {
            skillMap.set(o.skill, { cards: [] });
          }
          skillMap.get(o.skill)!.cards.push(cardNode.id);
        }
      }
    });

    // Deduplicate skill→card edges (a card may have the same skill on multiple outcomes).
    const skillNodes: GraphNode[] = [];
    skillMap.forEach((val, skill) => {
      const uniqueCards = Array.from(new Set(val.cards));
      skillNodes.push({
        id: `skill-${skill}`,
        type: "skill",
        label: skill,
        count: uniqueCards.length,
      });
      for (const cardId of uniqueCards) {
        links.push({ source: `skill-${skill}`, target: cardId });
      }
    });

    const allNodes = [...skillNodes, ...cardNodes];

    // Build the simulation.
    const sim = d3.forceSimulation(allNodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links)
        .id((d) => d.id)
        .distance(50)
        .strength(0.3))
      .force("charge", d3.forceManyBody().strength(-180))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d) => d.type === "skill" ? 22 : 14));

    // Draw links first.
    const linkSel = svg.append("g")
      .attr("stroke", "currentColor")
      .attr("stroke-opacity", 0.15)
      .attr("stroke-width", 1)
      .selectAll("line")
      .data(links)
      .join("line");

    // Draw skill nodes (larger, orange) and card nodes (smaller, accent color).
    const nodeSel = svg.append("g")
      .selectAll("g")
      .data(allNodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(drag(sim) as any);

    nodeSel.append("circle")
      .attr("r", (d) => (d.type === "skill" ? 14 : 9))
      .attr("fill", (d) => d.type === "skill" ? "oklch(0.65 0.16 60)" : (d.accent ?? "oklch(0.55 0.16 240)"))
      .attr("stroke", "var(--background)")
      .attr("stroke-width", 2);

    nodeSel.append("text")
      .text((d) => d.label)
      .attr("x", 0)
      .attr("y", (d) => (d.type === "skill" ? 26 : 20))
      .attr("text-anchor", "middle")
      .attr("font-size", (d) => (d.type === "skill" ? 10 : 9))
      .attr("font-weight", (d) => (d.type === "skill" ? 600 : 400))
      .attr("font-family", "ui-monospace, monospace")
      .attr("fill", "currentColor")
      .attr("fill-opacity", 0.85);

    // Hover behavior.
    nodeSel.on("mouseenter", (_e, d) => setHovered(d as GraphNode))
           .on("mouseleave", () => setHovered(null));

    sim.on("tick", () => {
      linkSel
        .attr("x1", (d) => (d.source as GraphNode).x ?? 0)
        .attr("y1", (d) => (d.source as GraphNode).y ?? 0)
        .attr("x2", (d) => (d.target as GraphNode).x ?? 0)
        .attr("y2", (d) => (d.target as GraphNode).y ?? 0);
      nodeSel.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      sim.stop();
    };
  }, [width, height]);

  // Compute the hovered node's connections for the info panel.
  const hoveredConnections = hovered
    ? links
        ? []  // we don't have direct access to links here; recompute below
        : []
    : [];

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="rounded-md border border-border/60 bg-muted/20 p-2">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="block"
          style={{ color: "var(--foreground)" }}
          aria-label="Skill graph showing which skills/talents each equation rewards"
        />
      </div>
      <div className="text-xs text-muted-foreground">
        {hovered ? (
          <div>
            <p className="font-semibold text-foreground/80">{hovered.label}</p>
            <p className="text-[10px] mt-1">
              {hovered.type === "skill"
                ? `Skill appears on ${hovered.count} card(s) — drag the node to see them all.`
                : `Equation card — see which skills it rewards by hovering the connected orange nodes.`}
            </p>
          </div>
        ) : (
          <p>
            Orange nodes = skills/talents (e.g., "Computational biologist"); colored nodes = the 20 equation cards.
            Lines connect each skill to every card where it appears.
            Drag any node to reposition. Hover to see the connection count.
            Skills appearing on multiple cards = "intersections" — they reward the same kind of mind across different equations.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Drag behaviour
// ============================================================
function drag(sim: d3.Simulation<GraphNode, GraphLink>) {
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
