"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Loader2, AlertCircle, CheckCircle2, Sliders } from "lucide-react";

/**
 * LivingEquationRunner — slider-driven Pyodide runner with structured output.
 *
 * Like PyodideRunner but:
 *   - Takes a slider param (name + range + default + step)
 *   - The Python code is a function that takes the slider value and returns
 *     a JSON-serialisable result (numbers, lists, dicts).
 *   - The output is parsed as JSON and rendered via a custom `renderer`
 *     prop (typically a recharts chart).
 *   - Re-runs automatically when the slider changes (debounced 300ms).
 *
 * Usage:
 *   <LivingEquationRunner
 *     code={`import math, json, random
 *     k = ${'${'}k${'}'}
 *     # ... compute ...
 *     result = {"x": [...], "y": [...]}
 *     print(json.dumps(result))`}
 *     sliderName="k" sliderMin={1} sliderMax={10} sliderDefault={3} sliderStep={1}
 *     renderer={(result) => <MyChart data={result} />}
 *   />
 */

async function loadPyodide() {
  // Reuse the singleton from pyodide-runner (same global promise).
  const w = window as unknown as Record<string, unknown>;
  if (!w.__pyodidePromise) {
    const PYODIDE_VERSION = "0.26.2";
    const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
    w.__pyodidePromise = (async () => {
      await new Promise<void>((resolve, reject) => {
        if (w.loadPyodide) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = `${PYODIDE_INDEX_URL}pyodide.js`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Pyodide bootstrap"));
        document.head.appendChild(script);
      });
      // @ts-expect-error — loadPyodide is added by the bootstrap script
      const py = await w.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
      return py;
    })();
  }
  return w.__pyodidePromise;
}

interface SliderConfig {
  name: string;
  min: number;
  max: number;
  step: number;
  default: number;
  /** Human-readable label for the slider (e.g., "k (number of PCs)"). */
  label: string;
  /** Optional help text shown below the slider. */
  hint?: string;
}

interface LivingEquationRunnerProps {
  /** Python code template. Use ${sliderName} for the slider value substitution. */
  code: string;
  slider: SliderConfig;
  /**
   * Renders the JSON result returned by the Python code.
   * Receives the parsed JSON object (or array, number, string).
   */
  renderer: (result: unknown, sliderValue: number) => ReactNode;
  /** Button label — defaults to "Run live". */
  buttonLabel?: string;
  /** Optional Python preamble (e.g., 'import json, math'). */
  preamble?: string;
  /** Auto-run on first mount (default true). */
  autoRun?: boolean;
  /** Skip the initial auto-run on mount (lazy evaluation — user must click Run first). */
  lazy?: boolean;
}

export function LivingEquationRunner({
  code,
  slider,
  renderer,
  buttonLabel = "Run live",
  preamble,
  autoRun = true,
  lazy = true,
}: LivingEquationRunnerProps) {
  const [sliderValue, setSliderValue] = useState<number>(slider.default);
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadTimeMs, setLoadTimeMs] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRunRef = useRef(true);
  // Track whether the user has clicked "Run" at least once — used to gate
  // slider-driven auto-runs (lazy evaluation: don't load Pyodide until the
  // user explicitly asks for it).
  const hasUserClickedRunRef = useRef(false);

  // Substitute the slider value into the code template.
  const renderCode = useCallback((value: number) => {
    // Replace ${sliderName} or {sliderName} (template-literal style) with the value.
    // Use a regex that handles both forms.
    return code
      .replace(new RegExp(`\\$\\{${slider.name}\\}`, "g"), String(value))
      .replace(new RegExp(`\\{${slider.name}\\}`, "g"), String(value));
  }, [code, slider.name]);

  const run = useCallback(async (value: number) => {
    setStatus("loading");
    setError(null);
    const start = performance.now();
    try {
      const py = (await loadPyodide()) as {
        runPythonAsync: (code: string) => Promise<unknown>;
        setStdout: (fn: unknown) => void;
        setStderr: (fn: unknown) => void;
        loadPackage: (names: string | string[]) => Promise<void>;
      };
      const loadMs = Math.round(performance.now() - start);
      setLoadTimeMs(loadMs);

      // Capture stdout (we expect a final JSON line).
      const lines: string[] = [];
      const writer = (s: string) => {
        lines.push(s);
      };
      try {
        // @ts-expect-error — Pyodide 0.26+ API uses { batched: fn }
        py.setStdout({ batched: writer });
        // @ts-expect-error — same for stderr
        py.setStderr({ batched: writer });
      } catch {
        // Fall back to older Pyodide API.
        // @ts-expect-error — older setStdout signature
        py.setStdout(writer);
        // @ts-expect-error — older setStderr signature
        py.setStderr(writer);
      }

      // Auto-load numpy if needed.
      const renderedCode = renderCode(value);
      if (/\bnumpy\b|\bnp\./.test(renderedCode) || (preamble && /\bnumpy\b/.test(preamble))) {
        try {
          await py.loadPackage("numpy");
        } catch {
          // best-effort
        }
      }

      setStatus("running");

      // Run preamble first.
      if (preamble) {
        await py.runPythonAsync(preamble);
      }
      // Run the actual code.
      await py.runPythonAsync(renderedCode);

      // Parse the last non-empty stdout line as JSON.
      const finalOutput = lines.join("");
      const nonEmptyLines = finalOutput.split("\n").filter((l) => l.trim().length > 0);
      const jsonLine = nonEmptyLines[nonEmptyLines.length - 1];
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(jsonLine);
      } catch {
        // If the last line isn't JSON, use the whole output as a string.
        parsed = { _raw: finalOutput };
      }
      setResult(parsed);
      setStatus("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus("error");
    }
  }, [preamble, renderCode]);

  // Auto-run on mount (if !lazy and autoRun) and on slider change (debounced,
  // only after the user has clicked Run at least once).
  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      // Lazy evaluation: skip the initial auto-run. The page loads fast (no
      // Pyodide download); the user clicks "Run live" when ready.
      if (autoRun && !lazy) {
        hasUserClickedRunRef.current = true;
        run(sliderValue);
      }
      return;
    }
    // After the first mount, slider changes trigger re-runs — but only if the
    // user has already clicked "Run" at least once (lazy gate).
    if (!hasUserClickedRunRef.current) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      run(sliderValue);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [sliderValue, run, autoRun, lazy]);

  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-3">
      {/* Slider row */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor={`slider-${slider.name}`} className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-primary" />
            {slider.label}
          </label>
          <Badge variant="default" className="text-[10px] font-mono">
            {slider.name} = {sliderValue}
          </Badge>
        </div>
        <input
          id={`slider-${slider.name}`}
          type="range"
          min={slider.min}
          max={slider.max}
          step={slider.step}
          value={sliderValue}
          onChange={(e) => setSliderValue(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted accent-primary"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-mono">
          <span>{slider.min}</span>
          <span>{slider.default} (default)</span>
          <span>{slider.max}</span>
        </div>
        {slider.hint && (
          <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">{slider.hint}</p>
        )}
      </div>

      {/* Run button (manual re-run) */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={status === "running" || status === "loading" ? "outline" : "default"}
          className="gap-1.5"
          onClick={() => {
            // Mark that the user has clicked Run — this enables slider-driven
            // auto-runs (debounced) from now on.
            hasUserClickedRunRef.current = true;
            run(sliderValue);
          }}
          disabled={status === "loading" || status === "running"}
        >
          {status === "loading" || status === "running" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : status === "done" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : status === "error" ? (
            <AlertCircle className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          {buttonLabel}
        </Button>
        {loadTimeMs !== null && status === "done" && (
          <span className="text-[10px] text-muted-foreground">
            Pyodide: {loadTimeMs}ms load + {(performance.now() - loadTimeMs - loadTimeMs).toFixed(0)}ms run
          </span>
        )}
      </div>

      {/* Output */}
      <AnimatePresence>
        {status === "error" && error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-md bg-rose-500/10 border border-rose-500/40 p-2 text-xs text-rose-700 dark:text-rose-300 font-mono"
          >
            <pre className="whitespace-pre-wrap">{error}</pre>
          </motion.div>
        )}
        {status === "done" && result !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-md border border-emerald-500/30 bg-background p-3"
          >
            {renderer(result, sliderValue)}
          </motion.div>
        )}
        {status === "idle" && (
          <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 p-2.5 text-xs text-muted-foreground italic">
            Press <strong className="text-primary not-italic">"{buttonLabel}"</strong> to load Pyodide (~10MB, first run only) and compute the live chart.
            Subsequent slider drags will auto-update (300ms debounce) — but only after this first click (lazy evaluation: nothing loads until you ask).
          </div>
        )}
        {status === "loading" && (
          <div className="text-xs text-muted-foreground italic">Loading Pyodide runtime (~10MB, first run only)…</div>
        )}
        {status === "running" && (
          <div className="text-xs text-muted-foreground italic">Running with {slider.name} = {sliderValue}…</div>
        )}
      </AnimatePresence>
    </div>
  );
}
