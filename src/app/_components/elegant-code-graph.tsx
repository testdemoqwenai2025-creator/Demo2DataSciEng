"use client";

/**
 * ElegantCodeGraph — interactive D3.js force-directed graph of the
 * 20 cross-disciplinary elegant-code cards and their cousin edges.
 *
 * Renders a <svg> with nodes (cards) and links (cousin edges).
 * Nodes are draggable; hovering shows the equation + insight; clicking
 * opens the card's #anchor on /elegant-code.
 *
 * Used on /connections to make the "graph, not a tree" thesis tangible.
 */

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import Link from "next/link";
import { ELEGANT_CODE_MAP, recommendedCards } from "../_lib/elegant-code-map";
import { hrefFor } from "../_lib/router";

interface SimNode extends d3.SimulationNodeDatum {
  id: number;
  name: string;
  equation: string;
  sciences: string;
  insight: string;
  accent: string;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: number | SimNode;
  target: number | SimNode;
}

export function ElegantCodeGraph({ height = 600 }: { height?: number }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(900);
  const [hovered, setHovered] = useState<SimNode | null>(null);
  // Lazy evaluation: don't start the D3 simulation until the user clicks "Load graph".
  // This prevents the 20-node + 30-edge force simulation from blocking the main
  // thread on page load, which caused the /connections page to appear "not parsing
  // properly" (frozen/unresponsive while the simulation converged).
  const [activated, setActivated] = useState(false);

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
    if (!svgRef.current || width < 360 || !activated) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Build nodes from ELEGANT_CODE_MAP.
    const nodes: SimNode[] = ELEGANT_CODE_MAP.map((m) => ({
      id: m.cardIndex,
      name: m.name,
      equation: m.equation,
      sciences: m.sciences.join(" ↔ "),
      insight: m.insightShort,
      accent: `oklch(0.65 0.16 ${(m.cardIndex * 36) % 360})`,
    }));

    // Build edges from recommendedCards (dedupe bidirectional edges).
    const edgeSet = new Set<string>();
    const links: SimLink[] = [];
    for (const m of ELEGANT_CODE_MAP) {
      for (const target of recommendedCards(m.cardIndex)) {
        const a = Math.min(m.cardIndex, target);
        const b = Math.max(m.cardIndex, target);
        const key = `${a}-${b}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          links.push({ source: a, target: b });
        }
      }
    }

    // Color scale: color each card by its PRIMARY skill (the skill on its
    // first outcome tile). Cards that share a primary skill get the same
    // color — making the "skill family" visually obvious on the graph.
    // Skills with no duplicate across cards fall back to the index-based
    // hue so they still get a distinct color.
    const skillColorMap: Record<string, string> = {
      // Carefully chosen accent colors for common skills across the 20 cards.
      "Computational biologist": "oklch(0.65 0.16 0)",       // red
      "Audio engineer": "oklch(0.65 0.16 120)",              // green
      "Quant analyst": "oklch(0.65 0.16 30)",                // orange
      "Structural biologist": "oklch(0.65 0.16 280)",        // purple
      "NLP researcher": "oklch(0.65 0.16 200)",              // cyan
      "Bioinformatician": "oklch(0.55 0.16 90)",             // yellow-green
      "Information theorist": "oklch(0.65 0.16 60)",         // amber
      "Thermodynamicist": "oklch(0.65 0.16 240)",            // blue
      "Population geneticist": "oklch(0.65 0.16 300)",        // magenta
      "Atmospheric scientist": "oklch(0.55 0.16 200)",       // teal
      "Biomedical engineer": "oklch(0.65 0.16 160)",         // teal-green
      "Fluid dynamicist": "oklch(0.55 0.16 220)",            // sky blue
      "ML engineer": "oklch(0.65 0.16 100)",                 // lime
      "Evolutionary biologist": "oklch(0.65 0.16 50)",       // amber-orange
      "Statistical mechanicist": "oklch(0.55 0.16 280)",     // indigo
      "Medical geneticist": "oklch(0.65 0.16 350)",          // rose
      "Spam filter engineer": "oklch(0.65 0.16 70)",          // yellow
      "Quantum physicist": "oklch(0.55 0.16 320)",            // violet
      "Numerical analyst": "oklch(0.65 0.16 180)",            // cyan-teal
      "Game developer": "oklch(0.65 0.16 140)",              // green-cyan
      "Quant developer": "oklch(0.55 0.16 25)",              // orange-brown
      "Risk officer": "oklch(0.65 0.16 0)",                   // red
      "Marine underwriter": "oklch(0.55 0.16 220)",           // navy
      "Hydrologist": "oklch(0.65 0.16 190)",                 // sky
      "Systemic risk analyst": "oklch(0.55 0.16 350)",       // crimson
      "Trade economist": "oklch(0.65 0.16 110)",             // emerald
      "Maritime analyst": "oklch(0.55 0.16 200)",             // ocean
      "Maritime data engineer": "oklch(0.65 0.16 195)",       // teal
      "Air traffic control engineer": "oklch(0.55 0.16 230)",  // sky
      "Port operations analyst": "oklch(0.65 0.16 105)",      // chartreuse
      "Statistical geneticist": "oklch(0.65 0.16 305)",       // fuchsia
      "Quant researcher": "oklch(0.55 0.16 35)",              // amber-brown
      "Port operations manager": "oklch(0.65 0.16 95)",       // green
      "ML biologist": "oklch(0.55 0.16 270)",                // violet
      "Analytical chemist": "oklch(0.65 0.16 165)",           // emerald-teal
      "Molecular evolutionist": "oklch(0.55 0.16 55)",       // gold
      "Credit risk analyst": "oklch(0.65 0.16 15)",           // tomato
      "Maritime navigator": "oklch(0.55 0.16 210)",           // ocean-blue
      "Airline dispatcher": "oklch(0.65 0.16 175)",           // cyan
      "Astronomer": "oklch(0.55 0.16 260)",                   // indigo
      "Quant trader": "oklch(0.65 0.16 40)",                 // amber-orange
      "RL researcher": "oklch(0.55 0.16 295)",                // purple-pink
      "Marine underwriter (cargo)": "oklch(0.55 0.16 220)",   // navy
      "Trade economist (UN COMTRADE)": "oklch(0.65 0.16 115)",
      "Systems biologist": "oklch(0.65 0.16 145)",            // green
      "ML engineer (VQ)": "oklch(0.55 0.16 100)",
    };
    const color = (i: number) => {
      const card = ELEGANT_CODE_MAP[i];
      // Use the first outcome's skill as the "primary skill" for the card.
      const primarySkill = card ? (ELEGANT_CODE_CARDS[card.cardIndex]?.outcomes?.[0]?.skill) : undefined;
      if (primarySkill && skillColorMap[primarySkill]) {
        return skillColorMap[primarySkill];
      }
      // Fallback: index-based hue.
      return `oklch(0.65 0.16 ${(i * 36) % 360})`;
    };

    // Build the simulation.
    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink<SimNode, SimLink>(links)
        .id((d) => d.id)
        .distance(80)
        .strength(0.4))
      .force("charge", d3.forceManyBody().strength(-220))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(28));

    // Draw links first (below nodes).
    const linkSel = svg.append("g")
      .attr("stroke", "currentColor")
      .attr("stroke-opacity", 0.25)
      .attr("stroke-width", 1.2)
      .selectAll("line")
      .data(links)
      .join("line");

    // Draw nodes as <g> with circle + label.
    const nodeSel = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(drag(sim) as any);

    nodeSel.append("circle")
      .attr("r", 14)
      .attr("fill", (d) => color(d.id))
      .attr("stroke", "var(--background)")
      .attr("stroke-width", 2);

    nodeSel.append("text")
      .text((d) => d.name)
      .attr("x", 0)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("font-size", 10)
      .attr("font-family", "ui-monospace, monospace")
      .attr("fill", "currentColor")
      .attr("fill-opacity", 0.85);

    // Hover behaviour.
    nodeSel.on("mouseenter", (_e, d) => setHovered(d as SimNode))
           .on("mouseleave", () => setHovered(null));

    // Click opens /elegant-code#card-N.
    nodeSel.on("click", (_e, d) => {
      if (typeof window !== "undefined") {
        window.location.href = `${hrefFor("elegant-code")}#card-${d.id}`;
      }
    });

    sim.on("tick", () => {
      linkSel
        .attr("x1", (d) => (d.source as SimNode).x ?? 0)
        .attr("y1", (d) => (d.source as SimNode).y ?? 0)
        .attr("x2", (d) => (d.target as SimNode).x ?? 0)
        .attr("y2", (d) => (d.target as SimNode).y ?? 0);
      nodeSel.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      sim.stop();
    };
  }, [width, height, activated]);

  return (
    <div ref={containerRef} className="space-y-3">
      {!activated ? (
        <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 p-8 text-center">
          <p className="text-sm font-semibold text-primary mb-2">Interactive D3 graph — 20 cards + 30 cousin edges</p>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            The force-directed graph simulation (20 nodes + 30 edges) is computationally expensive.
            It's not loaded until you click, to keep the page fast (lazy evaluation).
            Once loaded, you can drag nodes, hover for details, and click to open cards.
          </p>
          <button
            onClick={() => setActivated(true)}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Load interactive graph
          </button>
        </div>
      ) : (
        <div className="rounded-md border border-border/60 bg-muted/20 p-2">
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className="block"
            style={{ color: "var(--foreground)" }}
            aria-label="Force-directed graph of the 20 elegant-code cards and their cousin edges"
          />
        </div>
      )}
      {hovered && (
        <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-xs">
          <p className="font-semibold" style={{ color: hovered.accent }}>
            {hovered.name}
          </p>
          <p className="font-mono text-muted-foreground mt-0.5">{hovered.equation}</p>
          <p className="italic text-primary/80 mt-1">{hovered.insight}</p>
          <p className="text-muted-foreground mt-1">{hovered.sciences}</p>
          <Link
            href={`${hrefFor("elegant-code")}#card-${hovered.id}`}
            className="text-primary hover:underline mt-2 inline-block"
          >
            → Open full card
          </Link>
        </div>
      )}
      {!hovered && (
        <p className="text-xs text-muted-foreground">
          Hover any node to see its equation + insight; click to open the full card on /elegant-code.
          Drag any node to reposition. The graph is a force-directed simulation — cousins are pulled
          together, non-cousins pushed apart.
        </p>
      )}
    </div>
  );
}

// ============================================================
// Drag behaviour (D3 standard pattern, typed loosely)
// ============================================================
function drag(sim: d3.Simulation<SimNode, SimLink>) {
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
