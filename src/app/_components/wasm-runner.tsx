"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Loader2, AlertCircle, CheckCircle2, Cpu } from "lucide-react";

/**
 * WasmRunner — loads a WebAssembly binary (inline or from URL),
 * instantiates it, calls the exported function, shows output.
 *
 * This is the universal runtime for Rust/C/Go code compiled to Wasm.
 * Unlike PyodideRunner (which runs Python via a ~10MB Wasm runtime),
 * WasmRunner loads tiny pre-compiled .wasm binaries (often < 1KB).
 *
 * The demo below uses a hand-assembled Wasm binary (41 bytes) that
 * exports an `add(i32, i32) -> i32` function. In production, you'd
 * compile from any of the 7 supported languages:
 *   - Rust:     cargo build --target wasm32-wasi
 *   - C/C++:    emcc -o module.wasm module.c
 *   - Go:       GOOS=js GOARCH=wasm go build -o main.wasm
 *   - Python:   (Pyodide — already in production per ADR-015)
 *   - Elixir:   (BeamWasm — experimental, per ADR-016 future)
 *   - Scala:    (Scala.js — compiles to JS, then to Wasm via wasm-tools)
 *   - Bash:     (not compilable to Wasm — use Pyodide for equivalent logic)
 *
 * The pattern is the same regardless of source language: compile to
 * .wasm, host the binary, load via WebAssembly.instantiate(), call
 * the exported function, show the result.
 */

// Hand-assembled Wasm binary (41 bytes) — exports `add(i32, i32) -> i32`
// This is the canonical "hello world" of WebAssembly.
// Assembly:
//   (module
//     (func (export "add") (param i32 i32) (result i32)
//       local.get 0
//       local.get 1
//       i32.add))
const WASM_ADD_BASE64 =
  "AGFzbQEAAAA=" +
  "BwEGA2l7f18=" + // placeholder — actual binary below
  "";

// Actually, let me use the raw bytes directly for reliability
// (base64 encoding was getting messy with padding)
const WASM_ADD_BYTES = new Uint8Array([
  // Magic + version
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
  // Type section: (func (param i32 i32) (result i32))
  0x01, 0x07, 0x01, 0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f,
  // Function section: function 0 uses type 0
  0x03, 0x02, 0x01, 0x00,
  // Export section: export "add" (function 0)
  0x07, 0x07, 0x01, 0x03, 0x61, 0x64, 0x64, 0x00, 0x00,
  // Code section: local.get 0, local.get 1, i32.add, end
  0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, 0x20, 0x01, 0x6a, 0x0b,
]);

interface WasmRunnerProps {
  /** Button label */
  buttonLabel?: string;
  /** Description shown above the output panel */
  description?: string;
  /** The source language this Wasm was compiled from (for display) */
  sourceLanguage?: string;
}

export function WasmRunner({
  buttonLabel = "Run in browser (Wasm)",
  description = "Loads a hand-assembled WebAssembly binary (41 bytes) and calls the exported `add(i32, i32) -> i32` function. In production, this would be a Rust/C binary compiled via `cargo build --target wasm32-wasi` or `emcc`.",
  sourceLanguage = "Rust/C",
}: WasmRunnerProps) {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [output, setOutput] = useState<string>("");
  const [loadTimeMs, setLoadTimeMs] = useState<number | null>(null);

  const handleRun = useCallback(async () => {
    setStatus("running");
    setOutput("Instantiating WebAssembly module (41 bytes)…\n");
    const start = performance.now();
    try {
      // Instantiate the Wasm module
      const { instance } = await WebAssembly.instantiate(WASM_ADD_BYTES);
      const exports = instance.exports as Record<string, unknown>;

      // Call the exported `add` function
      const addFn = exports["add"] as ((a: number, b: number) => number) | undefined;
      if (!addFn) {
        throw new Error("Exported function 'add' not found in Wasm module");
      }

      const loadMs = Math.round(performance.now() - start);
      setLoadTimeMs(loadMs);

      // Run a few test cases
      const results: string[] = [];
      const testCases = [
        [2, 3],
        [100, 200],
        [42, 58],
        [-10, 20],
        [1000000, 1],
      ];

      results.push(`✓ Wasm module instantiated in ${loadMs}ms (41 bytes)`);
      results.push(`  Source language: ${sourceLanguage} (compiled to wasm32)`);
      results.push(`  Exported function: add(i32, i32) -> i32`);
      results.push("");
      results.push("Test cases:");
      for (const [a, b] of testCases) {
        const result = addFn(a, b);
        results.push(`  add(${a}, ${b}) = ${result}`);
      }
      results.push("");
      results.push("✓ All calls successful. The same .wasm binary would run in");
      results.push("  any browser, any OS, any Wasm runtime — portable native code.");

      setOutput(results.join("\n"));
      setStatus("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setOutput((prev) => prev + `\nError: ${msg}`);
      setStatus("error");
    }
  }, [sourceLanguage]);

  return (
    <div className="mt-3 rounded-md border border-primary/30 bg-primary/3 p-3">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={status === "running" ? "outline" : "default"}
          className="gap-1.5"
          onClick={handleRun}
          disabled={status === "running"}
        >
          {status === "running" ? (
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
        <Badge variant="outline" className="text-[10px] gap-1">
          <Cpu className="h-2.5 w-2.5" />
          WebAssembly · 41 bytes
        </Badge>
        {loadTimeMs !== null && status === "done" && (
          <span className="text-[10px] text-muted-foreground">
            Instantiated in {loadTimeMs}ms
          </span>
        )}
      </div>

      {description && (
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{description}</p>
      )}

      <AnimatePresence>
        {status !== "idle" && output && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2"
          >
            <div
              className={`rounded-md bg-[oklch(0.16_0.005_240)] text-[oklch(0.97_0.005_60)] p-2.5 text-[11px] font-mono leading-relaxed overflow-x-auto code-scroll max-h-64 overflow-y-auto ${
                status === "error" ? "border border-rose-500/40" : "border border-emerald-500/30"
              }`}
            >
              <pre className="whitespace-pre-wrap">{output}</pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
