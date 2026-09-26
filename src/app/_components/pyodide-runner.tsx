"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Loader2, AlertCircle, CheckCircle2, Terminal } from "lucide-react";

/**
 * PyodideRunner — lazy-loads Pyodide (Python in WebAssembly) from CDN,
 * runs Python code in the browser, displays stdout/stderr output.
 *
 * - First click: loads ~10MB Pyodide runtime from jsdelivr CDN (~3-5s)
 * - Subsequent clicks: instant (cached in module-level variable)
 * - stdout/stderr captured and rendered line-by-line
 * - Errors show as red text with the Python traceback
 * - The runtime is shared across all PyodideRunner instances on the page
 *
 * Works on static GitHub Pages preview (no backend needed — Pyodide is
 * pure client-side Wasm). Trade-off: ~10MB initial download for first
 * "Run" click; subsequent runs are free.
 *
 * Note: only Python code that uses stdlib + packages Pyodide ships will
 * run. PySpark / snowflake-connector / etc. won't work — use this for
 * logic demos (hashing, data manipulation, algorithms), not for code
 * that needs real cloud services.
 */

// Singleton Pyodide promise — shared across all instances
let pyodidePromise: Promise<unknown> | null = null;
const PYODIDE_VERSION = "0.26.2";
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

async function loadPyodide() {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = (async () => {
    // Load the Pyodide bootstrap script from CDN
    await new Promise<void>((resolve, reject) => {
      if ((window as unknown as Record<string, unknown>).loadPyodide) {
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
    const py = await window.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
    return py;
  })();
  return pyodidePromise;
}

interface PyodideRunnerProps {
  code: string;
  /** Button label — defaults to "Run in browser" */
  buttonLabel?: string;
  /** Optional pre-run setup code (e.g., 'import hashlib') */
  preamble?: string;
  /** Compact mode — smaller button, no badge */
  compact?: boolean;
  /**
   * Optional callback invoked when the run completes with the full stdout
   * string. The parent can parse this (e.g., as JSON) and render a chart
   * alongside or instead of the text output.
   */
  onOutput?: (stdout: string) => void;
  /** If true, hide the text-output panel (useful when the parent renders a chart). */
  hideTextOutput?: boolean;
}

export function PyodideRunner({
  code,
  buttonLabel = "Run in browser",
  preamble,
  compact = false,
  onOutput,
  hideTextOutput = false,
}: PyodideRunnerProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "done" | "error">("idle");
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loadTimeMs, setLoadTimeMs] = useState<number | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const handleRun = useCallback(async () => {
    setStatus("loading");
    setError(null);
    setOutput("Loading Pyodide runtime (~10MB)…\n");
    const start = performance.now();
    try {
      const py = (await loadPyodide()) as {
        runPythonAsync: (code: string, options?: { stdout?: (s: string) => void; stderr?: (s: string) => void }) => Promise<unknown>;
        setStdout: (fn: (s: string) => void) => void;
        setStderr: (fn: (s: string) => void) => void;
        loadPackage: (names: string | string[]) => Promise<void>;
      };
      const loadMs = Math.round(performance.now() - start);
      setLoadTimeMs(loadMs);

      // Capture stdout/stderr
      // Pyodide 0.26+ API: setStdout takes { batched: (msg: string) => void }
      // (older versions took a plain function — wrap to support both)
      const lines: string[] = [];
      const writer = (s: string) => {
        lines.push(s);
      };
      try {
        // Try the new Pyodide 0.26+ API first
        // @ts-expect-error — Pyodide's setStdout signature varies across versions
        py.setStdout({ batched: writer });
        // @ts-expect-error — same for stderr
        py.setStderr({ batched: writer });
      } catch {
        // Fall back to older Pyodide API (plain function)
        try {
          py.setStdout(writer);
          py.setStderr(writer);
        } catch {
          // Older Pyodide versions don't have setStdout — fall back to runPythonAsync options
        }
      }

      // Auto-load numpy if the code looks like it needs it (saves users
      // from the "ModuleNotFoundError: No module named 'numpy'" traceback).
      // Pyodide ships numpy in its standard distribution — we just have to
      // ask for it explicitly. Cost: ~3-5s on first run, instant after.
      if (/\bnumpy\b|\bnp\./.test(code) || (preamble && /\bnumpy\b/.test(preamble))) {
        try {
          await py.loadPackage("numpy");
        } catch {
          // Best-effort — if numpy fails to load, let the code error out naturally
        }
      }

      setStatus("running");
      setOutput(`Pyodide loaded in ${loadMs}ms. Running…\n\n`);

      // Run preamble first (e.g., imports)
      if (preamble) {
        await py.runPythonAsync(preamble);
      }
      // Run the actual code
      await py.runPythonAsync(code);

      const finalOutput = lines.join("");
      setOutput(prev => prev + (finalOutput || "(no output)"));
      setStatus("done");
      // Notify parent of the final stdout (for chart rendering, etc.)
      if (onOutput) onOutput(finalOutput);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus("error");
      setOutput(prev => prev + `\nError: ${msg}`);
    }
  }, [code, preamble, onOutput]);

  // Auto-scroll output to bottom on update
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className={`mt-3 ${compact ? "" : "rounded-md border border-primary/30 bg-primary/3 p-3"}`}>
      <div className="flex items-center gap-2">
        <Button
          size={compact ? "sm" : "default"}
          variant={status === "running" || status === "loading" ? "outline" : "default"}
          className="gap-1.5"
          onClick={handleRun}
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
        {!compact && (
          <Badge variant="outline" className="text-[10px] gap-1">
            <Terminal className="h-2.5 w-2.5" />
            Pyodide v{PYODIDE_VERSION}
          </Badge>
        )}
        {loadTimeMs !== null && status === "done" && (
          <span className="text-[10px] text-muted-foreground">
            Runtime: {loadTimeMs}ms load + execution
          </span>
        )}
      </div>

      <AnimatePresence>
        {(status !== "idle" || output) && !hideTextOutput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2"
          >
            <div
              ref={outputRef}
              className={`rounded-md bg-[oklch(0.16_0.005_240)] text-[oklch(0.97_0.005_60)] p-2.5 text-[11px] font-mono leading-relaxed overflow-x-auto code-scroll max-h-64 overflow-y-auto ${error ? "border border-rose-500/40" : "border border-emerald-500/30"}`}
            >
              <pre className="whitespace-pre-wrap">{output}</pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
