"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

/**
 * ScienceShort — a looping multi-phase animation (the "visual hook").
 * Cycles through phases automatically, showing custom SVG per phase.
 *
 * This is the "short" — a short-form looping animation that shows
 * the big picture before the user scrolls into the deep content.
 *
 * Usage:
 * <ScienceShort
 *   phases={[
 *     { name: "Wet Lab", desc: "Illumina sequencer", svg: <WetLabSVG /> },
 *     { name: "NumPy", desc: "N-D array processing", svg: <NumPySVG /> },
 *     ...
 *   ]}
 *   interval={1500}  // ms per phase
 * />
 */

interface Phase {
  name: string;
  desc: string;
  svg: React.ReactNode;
}

export function ScienceShort({ phases, interval = 1500 }: { phases: Phase[]; interval?: number }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % phases.length), interval);
    return () => clearInterval(id);
  }, [phases.length, interval]);

  const phase = phases[step];

  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="h-2 w-2 rounded-full bg-emerald-500"
          />
          Scientific pipeline short — {phases.length} phases (loop)
          <span className="text-[10px] font-mono text-muted-foreground ml-auto">
            phase {step + 1}/{phases.length} · {phase.name}
          </span>
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Left: animated SVG */}
        <div className="rounded-md border border-border/40 bg-muted/20 p-3 flex items-center justify-center min-h-[160px]">
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {phase.svg}
          </motion.div>
        </div>

        {/* Right: phase list */}
        <div className="flex flex-col gap-1.5">
          {phases.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: i === step ? 1 : 0.4 }}
              className={`rounded-md border p-2.5 ${
                i === step
                  ? "border-primary/60 bg-primary/10"
                  : "border-border/40 bg-muted/20"
              }`}
            >
              <p className="text-xs font-semibold flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${i === step ? "bg-primary" : "bg-muted-foreground/40"}`} />
                {i + 1}. {p.name}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 ml-4 font-mono">
                {p.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-3">
        {phases.map((p, i) => i === step ? p.desc : "").filter(Boolean)}
      </p>
    </div>
  );
}
