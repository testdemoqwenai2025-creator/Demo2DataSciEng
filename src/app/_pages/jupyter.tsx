"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { JUPYTER_SCIENCE_EXAMPLES } from "../_components/_dataset_examples15";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Cpu, Database, Boxes, Activity, Sparkles, History, Atom,
  FileText, TrendingUp, Server, Brain, ShieldCheck, Zap,
} from "lucide-react";

const KPIS = [
  { label: "Origin", value: "IPython 2001 · Jupyter 2014", hint: "IPython by Fernando Pérez. Jupyter (split from IPython in 2014) by Pérez + Kluyver + Granger. Name = JUlia + PYThon + R.", deltaTone: "flat" as const },
  { label: "Adoption", value: "10M+ notebooks on GitHub", hint: "De facto standard for scientific Python. Used by every academic + data science team. JupyterHub serves 100k+ users at universities.", deltaTone: "up" as const },
  { label: "Architecture", value: "Notebook server + ZMQ + kernels", hint: "Browser (Codemirror) ↔ Notebook server (Tornado) ↔ IPython kernel (ZMQ 5-socket protocol). Stateless kernels, stateful sessions.", deltaTone: "flat" as const },
  { label: "Reproducibility", value: "pip freeze + random.seed + nbval", hint: "Cell execution order (In[1]→In[N]) matters. Reproducibility needs: fixed seeds, pip freeze, nbval regression tests, containerized envs.", deltaTone: "up" as const },
];

// ============================================================
// Pyodide demo: IPython kernel protocol + cell execution simulation
// ============================================================

const KERNEL_PROTOCOL_DEMO = `# Jupyter notebook cell execution simulation — pure Python (Pyodide)
# Demonstrates: cell execution order (In[n]/Out[n]), kernel state persistence,
# magic commands, reproducibility checklist (random.seed + pip freeze)

import math, random

random.seed(42)  # Reproducibility — CRITICAL for Jupyter notebooks

print("=" * 60)
print("Jupyter Notebook: genomics_qc_demo.ipynb")
print("Kernel: IPython (Python 3.11) · ZMQ 5-socket protocol")
print("=" * 60)
print()

# Simulate kernel namespace — persists across cells
kernel_state = {
    'variables': {},  # globals() — persists across cells
    'execution_count': 0,  # In[n] counter
}

def execute_cell(code_str, kind='code'):
    """Simulate Jupyter cell execution. State persists in kernel_state."""
    kernel_state['execution_count'] += 1
    n = kernel_state['execution_count']
    if kind == 'markdown':
        print(f"[Cell {n}, markdown]")
        # Markdown cells display but don't execute
        for line in code_str.split('\\n'):
            print(f"  MD: {line}")
        return
    if kind == 'raw':
        print(f"[Cell {n}, raw]")
        for line in code_str.split('\\n'):
            print(f"  RAW: {line}")
        return
    # Code cell — execute in kernel namespace
    print(f"[Cell {n}, code, In[{n}]]")
    # Simulate execution
    if 'random.seed' in code_str:
        random.seed(42)
        print(f"  Out[{n}]: random.seed(42) — set kernel RNG state")
        kernel_state['variables']['random_seed'] = 42
    elif 'n_reads' in code_str and '=' in code_str:
        print(f"  Out[{n}]: n_reads = 1000 (kernel variable stored)")
        kernel_state['variables']['n_reads'] = 1000
    elif 'reads' in code_str and 'range' in code_str:
        reads = ['ACGT' * 25 for _ in range(kernel_state['variables'].get('n_reads', 1000))]
        kernel_state['variables']['reads'] = reads
        print(f"  Out[{n}]: reads (list of {len(reads)} strings, stored in kernel)")
    elif 'mean' in code_str and 'quals' in code_str:
        quals = [random.uniform(20, 40) for _ in range(kernel_state['variables'].get('n_reads', 1000))]
        kernel_state['variables']['quals'] = quals
        mean_q = sum(quals) / len(quals)
        print(f"  Out[{n}]: {mean_q:.4f}  (stored in kernel)")
    elif 'matplotlib' in code_str or 'scatter' in code_str:
        print(f"  Out[{n}]: <matplotlib.figure.Figure at 0x7f...> (displayed inline)")
        print(f"  (figure saved as publication_figure.pdf, 300dpi)")
    elif 'pip freeze' in code_str:
        print(f"  Out[{n}]: pandas==2.1.0, numpy==1.26.0, matplotlib==3.8.0")
    else:
        print(f"  Out[{n}]: (executed in kernel namespace)")
    print()

# === Cell sequence ===
execute_cell("# Genomics QC Pipeline\\nFASTQ → NumPy → matplotlib → publication figure", 'markdown')

execute_cell("n_reads = 1000\\nprint(f'Loaded {n_reads} reads')")

execute_cell("reads = ['ACGT' * 25 for _ in range(n_reads)]\\nprint(f'Generated {len(reads)} reads x 100bp')")

execute_cell("random.seed(42)  # CRITICAL: reproducibility")

execute_cell("quals = [random.uniform(20, 40) for _ in range(n_reads)]\\nmean_q = sum(quals) / len(quals)\\nprint(f'Mean Q-score: {mean_q:.2f}')")

execute_cell("## Publication Figure\\nPCA scatter of read qualities by sample group", 'markdown')

execute_cell("%matplotlib inline  # cell magic\\nimport matplotlib.pyplot as plt\\nplt.scatter([1,2,3], [4,5,6])\\nplt.savefig('fig.pdf', dpi=300)")

execute_cell("pandas==2.1.0\\nnumpy==1.26.0\\nmatplotlib==3.8.0", 'raw')

# Final state
print("=" * 60)
print("Kernel state after 8 cells (persistent namespace):")
print("=" * 60)
print(f"  Execution count: {kernel_state['execution_count']}")
print(f"  Stored variables: {list(kernel_state['variables'].keys())}")
print()

print("=== Reproducibility checklist ===")
print("  [x] random.seed(42) set in cell 4 — kernel RNG deterministic")
print("  [x] Cell execution order: In[1] → In[2] → ... → In[8]")
print("  [x] pip freeze embedded in raw cell (cell 8)")
print("  [x] nbval regression test: re-run notebook, diff outputs")
print()
print("=== Common reproducibility pitfalls ===")
print("  [!] Running cells OUT OF ORDER: In[3] before In[2] = different state")
print("  [!] Restarting kernel: all variables lost, must re-run from In[1]")
print("  [!] No random.seed: stochastic results vary between runs")
print("  [!] Missing pip freeze: dependency version mismatch")
print()
print("=== IPython kernel ZMQ protocol ===")
print("  Browser <--(websocket)--> Notebook server <--(ZMQ 5 sockets)--> kernel")
print("  5 sockets: shell (execute), iopub (output), stdin (input), control, heartbeat")
print("  Protocol: execute_request -> execute_reply -> display_data -> stream")
print()
print("=== Voilà (dashboard mode) ===")
print("  voila genomics_qc_demo.ipynb  ->  clinical_trial_dashboard.html")
print("  Strips code cells, renders only outputs + widgets")
print("  -> FDA-approved clinicians see widgets + charts, NO Python code")`;

// ============================================================
// SVG diagrams
// ============================================================

function JupyterArchitectureDiagram() {
  // Browser <-> Notebook server <-> IPython kernel (via ZMQ)
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Atom className="h-3.5 w-3.5 text-primary" />
          Jupyter architecture — browser ↔ notebook server ↔ IPython kernel (ZMQ 5-socket)
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 480 220" className="w-full h-auto">
          <defs>
            <marker id="jupyter-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" />
            </marker>
          </defs>

          {/* Browser */}
          <g>
            <rect x="20" y="80" width="100" height="60" rx="6"
              fill="oklch(0.55 0.16 30 / 0.15)" stroke="oklch(0.55 0.16 30)" strokeWidth="1.5" />
            <text x="70" y="100" textAnchor="middle" fontSize="11" fontWeight="bold" fill="oklch(0.55 0.16 30)">Browser</text>
            <text x="70" y="115" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">CodeMirror editor</text>
            <text x="70" y="127" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">cell rendering</text>
          </g>

          {/* Notebook server (Tornado) */}
          <g>
            <rect x="180" y="80" width="100" height="60" rx="6"
              fill="oklch(0.55 0.16 165 / 0.15)" stroke="oklch(0.55 0.16 165)" strokeWidth="1.5" />
            <text x="230" y="100" textAnchor="middle" fontSize="11" fontWeight="bold" fill="oklch(0.55 0.16 165)">Notebook server</text>
            <text x="230" y="115" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">Tornado web server</text>
            <text x="230" y="127" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">saves .ipynb (JSON)</text>
          </g>

          {/* IPython kernel */}
          <g>
            <rect x="340" y="80" width="100" height="60" rx="6"
              fill="oklch(0.55 0.16 250 / 0.15)" stroke="oklch(0.55 0.16 250)" strokeWidth="1.5" />
            <text x="390" y="100" textAnchor="middle" fontSize="11" fontWeight="bold" fill="oklch(0.55 0.16 250)">IPython kernel</text>
            <text x="390" y="115" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">Python process</text>
            <text x="390" y="127" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">stateful namespace</text>
          </g>

          {/* WebSocket arrows */}
          <line x1="120" y1="105" x2="180" y2="105" stroke="var(--muted-foreground)" strokeWidth="1" markerEnd="url(#jupyter-arrow)" />
          <line x1="180" y1="115" x2="120" y2="115" stroke="var(--muted-foreground)" strokeWidth="1" markerEnd="url(#jupyter-arrow)" />
          <text x="150" y="100" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">websocket</text>
          <text x="150" y="128" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">JSON cells</text>

          {/* ZMQ arrows (5-socket protocol) */}
          <line x1="280" y1="105" x2="340" y2="105" stroke="var(--muted-foreground)" strokeWidth="1" markerEnd="url(#jupyter-arrow)" />
          <line x1="340" y1="115" x2="280" y2="115" stroke="var(--muted-foreground)" strokeWidth="1" markerEnd="url(#jupyter-arrow)" />
          <text x="310" y="100" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">ZMQ 5-socket</text>
          <text x="310" y="128" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">msg protocol</text>

          {/* 5 ZMQ sockets below */}
          <g transform="translate(180, 165)">
            <text x="50" y="0" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">5 ZMQ sockets:</text>
            {['shell', 'iopub', 'stdin', 'control', 'heartbeat'].map((s, i) => (
              <g key={s} transform={`translate(${i * 30 + 5}, 10)`}>
                <rect x="0" y="0" width="22" height="14" fill="oklch(0.55 0.16 250 / 0.2)" stroke="oklch(0.55 0.16 250)" strokeWidth="0.5" />
                <text x="11" y="9" textAnchor="middle" fontSize="6" fill="var(--foreground)">{s}</text>
              </g>
            ))}
            <text x="50" y="40" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">shell: execute_request → reply · iopub: stream/display_data</text>
          </g>

          {/* Top annotations */}
          <text x="70" y="60" textAnchor="middle" fontSize="9" fill="var(--foreground)" fontWeight="bold">FRONTEND</text>
          <text x="230" y="60" textAnchor="middle" fontSize="9" fill="var(--foreground)" fontWeight="bold">MIDDLEWARE</text>
          <text x="390" y="60" textAnchor="middle" fontSize="9" fill="var(--foreground)" fontWeight="bold">KERNEL</text>
        </svg>
        <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
          <strong>Jupyter 3-tier architecture:</strong> Browser (CodeMirror editor + cell rendering) ↔
          notebook server (Tornado, saves .ipynb as JSON) ↔ IPython kernel (Python process with
          persistent namespace). The 5-socket ZMQ protocol: <code className="font-mono">shell</code> (execute_request → execute_reply),
          <code className="font-mono"> iopub</code> (stream output + display_data), <code className="font-mono">stdin</code> (input),
          <code className="font-mono"> control</code> (interrupt), <code className="font-mono">heartbeat</code> (liveness).
          Kernels are language-agnostic — IRkernel, IJulia, bash_kernel all follow this protocol.
        </p>
      </div>
    </div>
  );
}

function CellExecutionOrderDiagram() {
  // Cell execution order: In[1] -> In[2] -> In[N], state persists
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-primary" />
          Cell execution order — In[n]/Out[n], kernel state persists across cells
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 480 240" className="w-full h-auto">
          {/* Cell 1 — markdown */}
          <g transform="translate(20, 20)">
            <rect x="0" y="0" width="440" height="28" rx="3" fill="oklch(0.45 0.05 240 / 0.2)" stroke="var(--border)" strokeWidth="0.5" />
            <text x="10" y="14" fontSize="8" fill="oklch(0.55 0.16 30)" fontWeight="bold">[1] markdown</text>
            <text x="10" y="24" fontSize="8" fill="var(--muted-foreground)"># Genomics QC Pipeline</text>
          </g>

          {/* Cell 2 — code (sets n_reads) */}
          <g transform="translate(20, 56)">
            <rect x="0" y="0" width="440" height="32" rx="3" fill="oklch(0.45 0.12 30 / 0.1)" stroke="oklch(0.55 0.16 30)" strokeWidth="0.5" />
            <text x="10" y="14" fontSize="8" fill="oklch(0.55 0.16 30)" fontWeight="bold">In[2]:</text>
            <text x="50" y="14" fontSize="8" fill="var(--foreground)" fontFamily="monospace">n_reads = 1000</text>
            <text x="10" y="26" fontSize="8" fill="oklch(0.55 0.16 165)" fontWeight="bold">Out[2]:</text>
            <text x="50" y="26" fontSize="8" fill="var(--muted-foreground)">n_reads stored in kernel namespace</text>
          </g>

          {/* Cell 3 — random.seed (CRITICAL) */}
          <g transform="translate(20, 96)">
            <rect x="0" y="0" width="440" height="32" rx="3" fill="oklch(0.45 0.12 30 / 0.1)" stroke="oklch(0.55 0.16 30)" strokeWidth="0.5" />
            <text x="10" y="14" fontSize="8" fill="oklch(0.55 0.16 30)" fontWeight="bold">In[3]:</text>
            <text x="50" y="14" fontSize="8" fill="var(--foreground)" fontFamily="monospace">random.seed(42)</text>
            <text x="10" y="26" fontSize="8" fill="var(--muted-foreground)" fontWeight="bold">REPRODUCIBILITY:</text>
            <text x="100" y="26" fontSize="8" fill="oklch(0.65 0.16 165)">set kernel RNG state</text>
          </g>

          {/* Cell 4 — quals computed */}
          <g transform="translate(20, 136)">
            <rect x="0" y="0" width="440" height="36" rx="3" fill="oklch(0.45 0.12 30 / 0.1)" stroke="oklch(0.55 0.16 30)" strokeWidth="0.5" />
            <text x="10" y="14" fontSize="8" fill="oklch(0.55 0.16 30)" fontWeight="bold">In[4]:</text>
            <text x="50" y="14" fontSize="8" fill="var(--foreground)" fontFamily="monospace">quals = [random.uniform(20, 40) for _ in range(n_reads)]</text>
            <text x="10" y="28" fontSize="8" fill="oklch(0.55 0.16 165)" fontWeight="bold">Out[4]:</text>
            <text x="50" y="28" fontSize="8" fill="var(--muted-foreground)">1000 values (uses n_reads from In[2], RNG from In[3])</text>
          </g>

          {/* Cell 5 — matplotlib figure */}
          <g transform="translate(20, 180)">
            <rect x="0" y="0" width="440" height="32" rx="3" fill="oklch(0.45 0.12 30 / 0.1)" stroke="oklch(0.55 0.16 30)" strokeWidth="0.5" />
            <text x="10" y="14" fontSize="8" fill="oklch(0.55 0.16 30)" fontWeight="bold">In[5]:</text>
            <text x="50" y="14" fontSize="8" fill="var(--foreground)" fontFamily="monospace">%matplotlib inline</text>
            <text x="50" y="26" fontSize="8" fill="var(--muted-foreground)">plt.scatter(PC1, PC2) → saved publication_figure.pdf (300dpi)</text>
          </g>

          {/* Vertical arrows showing execution order */}
          <line x1="15" y1="48" x2="15" y2="56" stroke="var(--muted-foreground)" strokeWidth="0.6" markerEnd="url(#jupyter-arrow)" />
          <line x1="15" y1="88" x2="15" y2="96" stroke="var(--muted-foreground)" strokeWidth="0.6" markerEnd="url(#jupyter-arrow)" />
          <line x1="15" y1="128" x2="15" y2="136" stroke="var(--muted-foreground)" strokeWidth="0.6" markerEnd="url(#jupyter-arrow)" />
          <line x1="15" y1="172" x2="15" y2="180" stroke="var(--muted-foreground)" strokeWidth="0.6" markerEnd="url(#jupyter-arrow)" />

          <defs>
            <marker id="jupyter-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" />
            </marker>
          </defs>

          {/* State persistence annotation */}
          <text x="240" y="226" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">
            Kernel namespace persists: In[4] uses n_reads from In[2] and RNG from In[3]
          </text>
        </svg>
        <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
          <strong>Cell execution order matters.</strong> Each code cell gets an In[n] counter (per kernel
          session). Out[n] is the cell's output. The kernel's namespace persists — In[4] uses variables
          from In[2] (n_reads) and In[3] (random.seed). <strong>Running cells out of order produces
          different state</strong> — if you run In[4] before In[2], n_reads is undefined. This is why
          reproducibility requires: (1) fixed execution order, (2) random.seed(42), (3) pip freeze as raw cell,
          (4) nbval regression test that re-runs the notebook and diffs outputs.
        </p>
      </div>
    </div>
  );
}

function VoilaVsJupyterlabDiagram() {
  // JupyterLab (developers) vs Voilà (end users)
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          JupyterLab (developer view) vs Voilà (dashboard view) — same notebook, different audience
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 480 240" className="w-full h-auto">
          {/* JupyterLab view (developer) */}
          <g>
            <text x="115" y="20" textAnchor="middle" fontSize="10" fontWeight="bold" fill="oklch(0.55 0.16 30)">JupyterLab (developer)</text>
            <rect x="20" y="30" width="200" height="190" rx="3" fill="oklch(0.55 0.16 30 / 0.05)" stroke="oklch(0.55 0.16 30)" strokeWidth="0.6" />
            {/* File browser */}
            <rect x="25" y="35" width="40" height="180" fill="oklch(0.55 0.16 30 / 0.1)" stroke="oklch(0.55 0.16 30)" strokeWidth="0.4" />
            <text x="45" y="48" textAnchor="middle" fontSize="6" fill="var(--foreground)">files</text>
            {/* Notebook cells with code visible */}
            <g transform="translate(70, 40)">
              <rect x="0" y="0" width="145" height="22" fill="oklch(0.55 0.16 30 / 0.1)" stroke="oklch(0.55 0.16 30)" strokeWidth="0.4" />
              <text x="3" y="10" fontSize="6" fill="var(--muted-foreground)">[1] markdown</text>
              <text x="3" y="18" fontSize="6" fill="var(--foreground)"># Genomics QC</text>

              <rect x="0" y="26" width="145" height="32" fill="oklch(0.55 0.16 30 / 0.1)" stroke="oklch(0.55 0.16 30)" strokeWidth="0.4" />
              <text x="3" y="34" fontSize="6" fill="oklch(0.55 0.16 30)">In[2]:</text>
              <text x="3" y="42" fontSize="6" fill="var(--foreground)" fontFamily="monospace">import pandas</text>
              <text x="3" y="50" fontSize="6" fill="var(--foreground)" fontFamily="monospace">df = pd.read_csv(...)</text>

              <rect x="0" y="62" width="145" height="22" fill="oklch(0.55 0.16 30 / 0.1)" stroke="oklch(0.55 0.16 30)" strokeWidth="0.4" />
              <text x="3" y="74" fontSize="6" fill="var(--muted-foreground)">Output: DataFrame (10k rows)</text>

              <rect x="0" y="88" width="145" height="32" fill="oklch(0.55 0.16 30 / 0.1)" stroke="oklch(0.55 0.16 30)" strokeWidth="0.4" />
              <text x="3" y="96" fontSize="6" fill="oklch(0.55 0.16 30)">In[3]:</text>
              <text x="3" y="104" fontSize="6" fill="var(--foreground)" fontFamily="monospace">plt.scatter(...)</text>

              <rect x="0" y="124" width="145" height="40" fill="oklch(0.55 0.16 30 / 0.1)" stroke="oklch(0.55 0.16 30)" strokeWidth="0.4" />
              <text x="3" y="135" fontSize="6" fill="var(--muted-foreground)">Output: chart</text>
              <rect x="20" y="138" width="100" height="20" fill="oklch(0.55 0.16 250 / 0.3)" stroke="oklch(0.55 0.16 250)" strokeWidth="0.4" />

              <rect x="0" y="168" width="145" height="42" fill="oklch(0.55 0.16 30 / 0.1)" stroke="oklch(0.55 0.16 30)" strokeWidth="0.4" />
              <text x="3" y="180" fontSize="6" fill="oklch(0.55 0.16 30)">In[4]:</text>
              <text x="3" y="188" fontSize="6" fill="var(--foreground)" fontFamily="monospace">df.groupby('arm')...</text>
            </g>
            <text x="115" y="232" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">code + outputs visible</text>
          </g>

          {/* Arrow */}
          <line x1="225" y1="120" x2="255" y2="120" stroke="var(--muted-foreground)" strokeWidth="1" markerEnd="url(#jupyter-arrow)" />
          <text x="240" y="115" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">voila</text>

          {/* Voilà view (end user) */}
          <g>
            <text x="365" y="20" textAnchor="middle" fontSize="10" fontWeight="bold" fill="oklch(0.55 0.16 250)">Voilà (end user)</text>
            <rect x="260" y="30" width="200" height="190" rx="3" fill="oklch(0.55 0.16 250 / 0.05)" stroke="oklch(0.55 0.16 250)" strokeWidth="0.6" />
            {/* Dashboard header */}
            <rect x="265" y="35" width="190" height="20" fill="oklch(0.55 0.16 250 / 0.2)" stroke="oklch(0.55 0.16 250)" strokeWidth="0.4" />
            <text x="360" y="48" textAnchor="middle" fontSize="7" fill="var(--foreground)" fontWeight="bold">Clinical Trial Dashboard</text>

            {/* Widgets */}
            <rect x="265" y="60" width="190" height="22" fill="oklch(0.55 0.16 250 / 0.1)" stroke="oklch(0.55 0.16 250)" strokeWidth="0.4" />
            <text x="270" y="70" fontSize="6" fill="var(--muted-foreground)">Arm:</text>
            <rect x="295" y="64" width="40" height="12" fill="oklch(0.55 0.16 30 / 0.2)" stroke="oklch(0.55 0.16 30)" strokeWidth="0.4" />
            <text x="315" y="73" textAnchor="middle" fontSize="6" fill="var(--foreground)">treatment ▼</text>
            <text x="340" y="70" fontSize="6" fill="var(--muted-foreground)">Visit:</text>
            <rect x="365" y="64" width="30" height="12" fill="oklch(0.55 0.16 30 / 0.2)" stroke="oklch(0.55 0.16 30)" strokeWidth="0.4" />
            <text x="380" y="73" textAnchor="middle" fontSize="6" fill="var(--foreground)">12 ▼</text>
            <text x="405" y="70" fontSize="6" fill="var(--muted-foreground)">[Apply]</text>

            {/* Charts only (no code) */}
            <rect x="265" y="90" width="90" height="60" fill="oklch(0.55 0.16 250 / 0.1)" stroke="oklch(0.55 0.16 250)" strokeWidth="0.4" />
            <text x="310" y="100" textAnchor="middle" fontSize="6" fill="var(--muted-foreground)">Response rate</text>
            <circle cx="310" cy="125" r="18" fill="none" stroke="oklch(0.55 0.16 250)" strokeWidth="3" />
            <path d="M 310 125 L 310 107 A 18 18 0 0 1 326 134 Z" fill="oklch(0.55 0.16 250 / 0.3)" />

            <rect x="365" y="90" width="90" height="60" fill="oklch(0.55 0.16 250 / 0.1)" stroke="oklch(0.55 0.16 250)" strokeWidth="0.4" />
            <text x="410" y="100" textAnchor="middle" fontSize="6" fill="var(--muted-foreground)">Biomarker</text>
            <polyline points="370,140 380,130 390,125 400,135 410,120 420,115 430,125 440,130 450,120"
              fill="none" stroke="oklch(0.55 0.16 30)" strokeWidth="1.5" />
            <polyline points="370,135 380,140 390,130 400,140 410,125 420,130 430,135 440,140 450,125"
              fill="none" stroke="oklch(0.55 0.16 250)" strokeWidth="1.5" />

            {/* Table */}
            <rect x="265" y="155" width="190" height="55" fill="oklch(0.55 0.16 250 / 0.1)" stroke="oklch(0.55 0.16 250)" strokeWidth="0.4" />
            <text x="270" y="165" fontSize="6" fill="var(--muted-foreground)" fontWeight="bold">Adverse events</text>
            {['Nausea', 'Headache', 'Fatigue'].map((e, i) => (
              <g key={e} transform={`translate(265, ${170 + i * 12})`}>
                <text x="5" y="9" fontSize="6" fill="var(--foreground)">{e}</text>
                <text x="100" y="9" fontSize="6" fill="var(--muted-foreground)">15%</text>
                <text x="150" y="9" fontSize="6" fill="var(--muted-foreground)">12%</text>
              </g>
            ))}
            <text x="360" y="232" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">only widgets + outputs (no code)</text>
          </g>
        </svg>
        <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
          <strong>Voilà vs JupyterLab:</strong> Same notebook, two audiences. JupyterLab shows the developer
          view — code cells + outputs + file browser (for ML engineers). Voilà shows the dashboard view —
          only outputs (charts, tables) + interactive widgets (no code visible to end users). For clinical
          trial dashboards, Voilà lets FDA-approved clinicians monitor trials without touching Python.
          Deployed on JupyterHub with OAuth2, it's how modern clinical trials are shared.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Main page component
// ============================================================

export function JupyterPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Jupyter · IPython · JupyterHub · JupyterLab · Voilà · Binder · Colab · ZMQ · reproducible research"
        title="Jupyter Ecosystem — Notebooks, JupyterHub, Voilà Dashboards"
        description="Jupyter is the modern executable paper — every scientific publication today ships with a notebook. The IPython kernel (Python process with persistent state) executes cells via ZMQ's 5-socket protocol. JupyterLab is the IDE for developers; Voilà converts notebooks to dashboards for end users (no code visible). Binder and Colab provide reproducible cloud environments. This page covers the cell execution model (In[n]/Out[n]), the IPython kernel protocol (ZMQ messaging), reproducibility (random.seed + pip freeze + nbval), and the wet-lab-to-publication pipeline (FASTQ → NumPy → matplotlib → figure)."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><FileText className="h-3 w-3" /> Notebook</Badge>
            <Badge variant="outline" className="gap-1.5"><Atom className="h-3 w-3" /> IPython</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* ============================================================ */}
      {/* Mathematical foundations */}
      {/* ============================================================ */}
      <SectionCard
        title="Mathematical foundations — IPython kernel protocol, cell execution, reproducibility"
        description="Three mathematical/formal foundations: the IPython kernel ZMQ 5-socket protocol, the cell execution order semantics (In[n]/Out[n]), and the reproducibility checklist (random seeds + pip freeze + nbval)."
        icon={<Brain className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-4">
          {/* 1. IPython kernel protocol */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-semibold text-primary mb-2">1. IPython Kernel Protocol (ZMQ 5-socket)</p>
            <p className="font-mono text-xs text-primary mb-2">
              Browser ↔ (websocket) ↔ notebook server ↔ (ZMQ 5-socket) ↔ IPython kernel
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The Jupyter protocol uses 5 ZMQ sockets: <code className="font-mono">shell</code> (ROUTER — execute_request → execute_reply),
              <code className="font-mono"> iopub</code> (PUB — stream output, display_data, execute_result),
              <code className="font-mono"> stdin</code> (ROUTER — input_request → input_reply for input()),
              <code className="font-mono"> control</code> (ROUTER — interrupt_request, shutdown_request),
              <code className="font-mono"> heartbeat</code> (REP — port liveness check). Messages are JSON
              with a 5-part envelope: <code className="font-mono">[delimiter, msg_id, header, parent_header, metadata, content]</code>.
              This protocol is language-agnostic — IRkernel (R), IJulia (Julia), bash_kernel all follow it.
            </p>
          </div>
          {/* 2. Cell execution order */}
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">2. Cell Execution Order — In[n]/Out[n] Semantics</p>
            <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 mb-2">
              execution_count increments per code cell · kernel namespace persists across cells
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Each code cell gets an In[n] counter (per kernel session). Out[n] is the cell's display
              output. The kernel's namespace (globals dict) persists across cells — In[4] uses variables
              from In[2] and In[3]. <strong>Execution order matters</strong>: running cells out of order
              produces different state. The .ipynb JSON file stores the execution_count per cell — when
              you restart the kernel, all counters reset to 0. <code className="font-mono">nbval --current-env</code>
              re-runs the notebook top-to-bottom and diffs outputs against the stored .ipynb outputs —
              catching regressions in scientific code.
            </p>
          </div>
          {/* 3. Reproducibility */}
          <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">3. Reproducibility — Random Seeds + pip freeze + nbval</p>
            <p className="font-mono text-xs text-violet-600 dark:text-violet-400 mb-2">
              seed = 42 · pip freeze &gt; requirements.txt · nbval --current-env notebook.ipynb
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Reproducibility requires 4 things: (1) <code className="font-mono">random.seed(42)</code> at
              top of notebook (deterministic RNG), (2) <code className="font-mono">pip freeze &gt; requirements.txt</code>
              (pinned dependencies), (3) <code className="font-mono">nbval</code> regression test that re-runs
              the notebook and diffs outputs against the stored .ipynb, (4) containerized environment
              (Docker or conda env) so OS-level differences don't break things. <strong>Without these, a
              notebook run in 2024 may produce different results when re-run in 2026.</strong> This is
              why every modern publication requires a GitHub repo with a Dockerfile + notebook + nbval
              test in CI.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ============================================================ */}
      {/* Custom SVG diagrams */}
      {/* ============================================================ */}
      <SectionCard
        title="Custom SVG diagrams — Jupyter architecture, cell order, Voilà vs JupyterLab"
        description="Three original diagrams: (1) Jupyter 3-tier architecture (browser ↔ notebook server ↔ IPython kernel via ZMQ 5-socket), (2) cell execution order (In[1]→In[5] with persistent kernel state), (3) JupyterLab vs Voilà — same notebook, two audiences."
        icon={<Atom className="h-5 w-5" />}
        badge="custom SVG"
      >
        <div className="space-y-4">
          <JupyterArchitectureDiagram />
          <CellExecutionOrderDiagram />
          <VoilaVsJupyterlabDiagram />
        </div>
      </SectionCard>

      {/* ============================================================ */}
      {/* Code blocks */}
      {/* ============================================================ */}
      <SectionCard
        title="Production code — Jupyter notebooks + Voilà + JupyterHub"
        description="Four code blocks: a genomics notebook with cell magic, Voilà dashboard conversion, JupyterHub deployment on Kubernetes, and Binder/Colab reproducible environments."
        icon={<FileText className="h-5 w-5" />}
        badge="code"
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold mb-2 text-primary">1. Genomics notebook with cell magic</p>
            <CodeBlock
              language="python"
              filename="genomics_qc.ipynb"
              code={`# %% [markdown]
# # Genomics QC Pipeline
# FASTQ → NumPy → matplotlib → publication figure

# %% import libraries
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import random
random.seed(42)  # CRITICAL for reproducibility

# %% load FASTQ
reads = []
with open('sample_R1.fastq') as f:
    while True:
        header = f.readline()
        if not header: break
        seq = f.readline().strip()
        plus = f.readline()
        qual = f.readline().strip()
        reads.append({'id': header[1:], 'seq': seq, 'qual': qual})

print(f"Loaded {len(reads)} reads")

# %% convert to NumPy arrays (Phred quality scores)
quals = np.array([[ord(c) - 33 for c in r['qual']] for r in reads])
print(f"Quality matrix: {quals.shape}, mean Q-score: {quals.mean():.2f}")

# %% PCA via SVD (LAPACK dgesdd)
centered = quals - quals.mean(axis=0)
U, s, Vt = np.linalg.svd(centered, full_matrices=False)
print(f"Top 5 singular values: {s[:5]}")
PC1 = U[:, 0] * s[0]
PC2 = U[:, 1] * s[1]

# %% cell magic — display matplotlib inline
%matplotlib inline
fig, axes = plt.subplots(1, 2, figsize=(12, 4))
axes[0].scatter(PC1, PC2, c=np.arange(len(reads)), cmap='viridis')
axes[0].set_xlabel('PC1'); axes[0].set_ylabel('PC2')
axes[0].set_title('PCA of read quality profiles')
axes[1].hist(quals.mean(axis=1), bins=50)
axes[1].set_xlabel('Mean Q-score'); axes[1].set_ylabel('Count')
plt.tight_layout()
plt.savefig('publication_figure.pdf', dpi=300)
plt.show()  # inline display

# %% pip freeze for reproducibility (raw cell)
# pandas==2.1.0, numpy==1.26.0, matplotlib==3.8.0, scikit-learn==1.3.0`}
            />
          </div>
          <div>
            <p className="text-xs font-semibold mb-2 text-primary">2. Voilà dashboard conversion</p>
            <CodeBlock
              language="bash"
              filename="voila_deploy.sh"
              code={`# Convert notebook to interactive dashboard (no code visible to end users)
pip install voila ipywidgets

# Method 1: Serve dashboard locally
voila genomics_qc.ipynb --port 8866 --no-browser
# -> http://localhost:8866 renders only outputs + widgets, NO code cells

# Method 2: Voilà with custom template
voila genomics_qc.ipynb \\
  --template=gridstack \\
  --theme=dark \\
  --port 8866

# Method 3: Voilà + JupyterHub (multi-user, OAuth2)
# jupyterhub_config.py
c = get_config()
c.JupyterHub.authenticator_class = 'oauthenticator.GoogleOAuthenticator'
c.GoogleOAuthenticator.oauth_callback_url = 'https://hub.example.com/hub/oauth_callback'
c.GoogleOAuthenticator.client_id = os.environ['GOOGLE_CLIENT_ID']
c.GoogleOAuthenticator.client_secret = os.environ['GOOGLE_CLIENT_SECRET']

# Spawn Voilà for each user (Kubernetes)
c.JupyterHub.spawner_class = 'kubespawner.KubeSpawner'
c.KubeSpawner.image = 'jupyter/scipy-notebook:latest'
c.KubeSpawner.cpu_limit = 2
c.KubeSpawner.mem_limit = '4G'

# Enable Voilà extension for all users
c.ServerApp.jpserver_extensions = {
    'voila.server_extension': True,
}

# Start JupyterHub
jupyterhub -f jupyterhub_config.py

# Users access:
# https://hub.example.com/user/<username>/voila/render/genomics_qc.ipynb
# -> FDA-approved clinicians see dashboard, no code, OAuth2-protected`}
            />
          </div>
          <div>
            <p className="text-xs font-semibold mb-2 text-primary">3. JupyterHub on Kubernetes (multi-user)</p>
            <CodeBlock
              language="yaml"
              filename="jupyterhub-k8s.yaml"
              code={`# Zero-to-JupyterHub Helm chart values
# Multi-user JupyterHub on Kubernetes with OAuth2

hub:
  config:
    Authenticator:
      admin_users:
        - admin1@example.com
        - admin2@example.com
    GoogleOAuthenticator:
      client_id: \${GOOGLE_CLIENT_ID}
      client_secret: \${GOOGLE_CLIENT_SECRET}
      oauth_callback_url: https://hub.example.com/hub/oauth_callback
      login_service: Google
  db:
    type: sqlite-memory

proxy:
  secretToken: \${GENERATED_SECRET_TOKEN}
  https:
    enabled: true
    hosts: [hub.example.com]
    letsencrypt:
      contactEmail: admin@example.com

scheduling:
  userScheduler:
    enabled: true

singleuser:
  image:
    name: jupyter/scipy-notebook
    tag: latest
  cpu:
    limit: 2
    guarantee: 1
  memory:
    limit: 4G
    guarantee: 2G
  storage:
    type: dynamic
    capacity: 10Gi
    home: /home/jovyan

# Deploy with Helm
# helm install jupyterhub jupyterhub/jupyterhub \\
#   --namespace jupyterhub --create-namespace \\
#   --values jupyterhub-k8s.yaml`}
            />
          </div>
          <div>
            <p className="text-xs font-semibold mb-2 text-primary">4. Binder / Colab reproducible environments</p>
            <CodeBlock
              language="python"
              filename="binder_reproducible.py"
              code={`# Binder: turn any GitHub repo into a reproducible Jupyter environment
# Just add these files to your repo, then visit mybinder.org

# === requirements.txt (or environment.yml) ===
# numpy==1.26.0
# pandas==2.1.0
# matplotlib==3.8.0
# scikit-learn==1.3.0

# === Dockerfile (optional, for non-Python deps) ===
# FROM jupyter/scipy-notebook:latest
# RUN pip install -r requirements.txt
# COPY . /home/jovyan/work/

# === postBuild (shell script, runs after env setup) ===
# #!/bin/bash
# jupyter labextension install @jupyter-widgets/jupyterlab-manager
# pip install jupyterlab-git

# === Binder URL pattern ===
# https://mybinder.org/v2/gh/<user>/<repo>/<branch>
# Example: https://mybinder.org/v2/gh/jakevdp/PythonDataScienceHandbook/master

# === Colab (Google) — alternative reproducible env ===
# Colab notebooks start fresh per session with pip install cells:
# !pip install scanpy anndata matplotlib
import scanpy as sc
import anndata as ad

# Load 10x Genomics dataset (colab auto-caches)
adata = sc.read_10x_h5('pbmc_10k_filtered_feature_bc_matrix.h5')
print(f"Cells: {adata.n_obs}, Genes: {adata.n_vars}")

# Single-cell analysis pipeline (executed in Colab)
sc.pp.filter_cells(adata, min_genes=200)
sc.pp.normalize_total(adata, target_sum=1e4)
sc.pp.log1p(adata)
sc.pp.pca(adata, n_comps=50)  # uses scikit-learn SVD under the hood
sc.pp.neighbors(adata)
sc.tl.umap(adata)
sc.pl.umap(adata, color='leiden', save='_clusters.pdf')`}
            />
          </div>
        </div>
      </SectionCard>

      {/* ============================================================ */}
      {/* Pyodide demo */}
      {/* ============================================================ */}
      <SectionCard
        title="Try it: IPython kernel + cell execution simulation (Pyodide)"
        description="Pure-Python simulation of a Jupyter notebook — cell execution order (In[1]→In[8]), kernel state persistence across cells, magic commands (%matplotlib inline), reproducibility checklist (random.seed + pip freeze + nbval), and a summary of the ZMQ 5-socket protocol."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={KERNEL_PROTOCOL_DEMO} buttonLabel="Run Jupyter notebook simulation (Pyodide)" />
      </SectionCard>

      {/* ============================================================ */}
      {/* Comparison table */}
      {/* ============================================================ */}
      <SectionCard
        title="Jupyter vs Colab vs Kaggle Notebooks vs Deepnote — hosted notebook platforms"
        description="Four hosted notebook platforms compared. Jupyter is open-source and self-hostable. Colab is Google's free-tier with GPU. Kaggle is competition-focused. Deepnote is the modern collaboration-focused alternative."
        icon={<Boxes className="h-5 w-5" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left p-2 font-semibold">Feature</th>
                <th className="text-left p-2 font-semibold text-primary">Jupyter</th>
                <th className="text-left p-2 font-semibold">Colab</th>
                <th className="text-left p-2 font-semibold">Kaggle</th>
                <th className="text-left p-2 font-semibold">Deepnote</th>
              </tr>
            </thead>
            <tbody>
              {[
                { f: "Cost", j: "Free (self-hosted)", c: "Free + $10/100 CU Pro", k: "Free (competition $)", d: "Free + $/team Pro" },
                { f: "GPU access", j: "Bring-your-own (JupyterHub)", c: "T4 free, A100 paid", k: "P100 free, 30h/week", d: "Bring-your-own cloud" },
                { f: "Multi-user", j: "JupyterHub (K8s)", c: "Single-user per URL", k: "Single-user", d: "Native collaboration" },
                { f: "Reproducibility", j: "nbval + Docker", c: "pip install cells (no freeze)", k: "Dataset pinning", d: "Auto-versioned" },
                { f: "Voilà dashboards", j: "Native (jupyter voila)", c: "via Colab Enterprise", k: "Limited", d: "Native (Deepnote publish)" },
                { f: "Best for", j: "Reproducible research", c: "Quick experiments, GPU", k: "Competitions, datasets", d: "Team collaboration" },
              ].map((row, i) => (
                <tr key={row.f} className={i % 2 === 0 ? "bg-card" : "bg-muted/10"}>
                  <td className="p-2 font-semibold">{row.f}</td>
                  <td className="p-2 text-primary">{row.j}</td>
                  <td className="p-2 text-muted-foreground">{row.c}</td>
                  <td className="p-2 text-muted-foreground">{row.k}</td>
                  <td className="p-2 text-muted-foreground">{row.d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ============================================================ */}
      {/* Why evolved */}
      {/* ============================================================ */}
      <SectionCard
        title="Why Jupyter evolved — shortfalls of static publication + command-line Python"
        description="Before Jupyter (2014, split from IPython), scientific computing was done in scripts with static output. Jupyter made Python into the executable paper — every cell is a paragraph in a computational essay."
        icon={<History className="h-5 w-5" />}
        badge="Why Jupyter"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: Static publication couldn't capture computation.</strong>
            Pre-Jupyter, scientific papers were PDFs with figures, but the code that generated those figures
            was lost. Jupyter notebooks became the executable paper — every figure comes from a cell with
            reproducible code. <strong>This is what "reproducible research" actually means in 2024.</strong>
            Every Nature/Cell paper now ships with a GitHub repo + notebook + nbval test in CI.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: Python REPL was inadequate for science.</strong>
            The default Python REPL has no cell concept, no inline plotting, no magic commands. IPython
            (2001) added cell-based execution with In[n]/Out[n] numbering, %magic commands, and inline
            matplotlib via <code className="font-mono">%matplotlib inline</code>. Jupyter (2014) split IPython
            into a language-agnostic protocol + IPython kernel — now R, Julia, and bash kernels all work.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: No way to share interactive dashboards from notebooks.</strong>
            A notebook is for developers; clinicians/biologists need dashboards. Voilà (2018) solved this —
            it converts a notebook into an interactive dashboard by stripping code cells and rendering
            only outputs + widgets. <strong>Same notebook, two audiences:</strong> JupyterLab for ML
            engineers, Voilà for end users. This powers modern clinical trial monitoring.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: No reproducible cloud environments.</strong>
            "Works on my machine" was the #1 reproducibility problem. Binder (2017) and Colab (2018) solved
            this — give them a GitHub URL + requirements.txt, and they spin up a containerized environment
            with all dependencies pre-installed. <strong>Anyone can reproduce your notebook in one click.</strong>
            Binder uses repo2docker to build a Docker image from your repo; Colab uses Google's container
            fleet with pre-cached scientific Python stacks.
          </p>
        </div>
      </SectionCard>

      {/* ============================================================ */}
      {/* Unique features */}
      {/* ============================================================ */}
      <SectionCard
        title="Truly unique Jupyter features"
        description="Four features that are genuinely unique to Jupyter as a scientific computing environment."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. Language-agnostic kernel protocol</p>
            <p className="text-muted-foreground">The ZMQ 5-socket protocol is language-agnostic — IRkernel (R), IJulia (Julia), IHaskell, bash_kernel, IRust all follow it. <strong>One notebook server, multiple language kernels.</strong> No other notebook platform has this language neutrality.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Cell magic (% commands)</p>
            <p className="text-muted-foreground"><code className="font-mono">%matplotlib inline</code>, <code className="font-mono">%timeit</code>, <code className="font-mono">%%time</code>, <code className="font-mono">%%bash</code>, <code className="font-mono">%load_ext</code> — these magic commands make notebooks productive in ways plain Python can't match. <strong>Magics are IPython's killer feature.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Voilà — notebook to dashboard</p>
            <p className="text-muted-foreground">Voilà converts a notebook into an interactive dashboard with zero code changes. <strong>Same .ipynb serves two audiences:</strong> ML engineers via JupyterLab, end users via Voilà. Clinical trial dashboards, genomics QC dashboards, model monitoring — all from one notebook.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. JupyterHub — multi-user on K8s</p>
            <p className="text-muted-foreground">JupyterHub on Kubernetes serves 100,000+ users — each gets an isolated container with their own kernel. <strong>Used by Berkeley, MIT, NASA, CERN for student/team compute.</strong> OAuth2 + GitHub/Google auth, autoscaling, persistent home directories. No other notebook platform scales like this.</p>
          </div>
        </div>
      </SectionCard>

      {/* ============================================================ */}
      {/* Dataset examples */}
      {/* ============================================================ */}
      <SectionCard
        title="2 scientific dataset examples — genomics pipeline + clinical dashboard"
        description="Two Jupyter-driven scientific scenarios. Each is a clickable card opening a popup with: scenario brief, dataset stats, computational tooling, multi-language code (Scala/Rust/Go/Elixir/Zig), Pyodide demo, and implementation insight."
        icon={<Database className="h-5 w-5" />}
        badge="2 examples × 5 langs"
      >
        <DatasetCards
          examples={JUPYTER_SCIENCE_EXAMPLES}
          intro="Genomics notebook pipeline (FASTQ → NumPy → matplotlib → publication figure), clinical trial dashboard via Voilà (interactive widgets, no code visible to clinicians). Each card has Scala/Rust/Go/Elixir/Zig code."
        />
      </SectionCard>

      {/* ============================================================ */}
      {/* Computational tooling */}
      {/* ============================================================ */}
      <SectionCard
        title="Computational tooling — Jupyter ecosystem"
        description="The libraries that extend Jupyter from a notebook editor into a full scientific computing platform."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-primary" /> Jupyter core</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Jupyter Notebook</strong> — classic notebook interface</li>
              <li>• <strong>JupyterLab</strong> — IDE-like next-gen interface</li>
              <li>• <strong>JupyterHub</strong> — multi-user deployment (K8s)</li>
              <li>• <strong>Voilà</strong> — notebooks → dashboards (no code visible)</li>
              <li>• <strong>ipywidgets</strong> — interactive widgets (sliders, dropdowns)</li>
              <li>• <strong>jupyterlab-git</strong> — Git integration in JupyterLab</li>
              <li>• <strong>jupyterlab-lsp</strong> — IDE features (autocomplete, go-to-def)</li>
              <li>• <strong>nbval</strong> — notebook regression testing in CI</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Atom className="h-3.5 w-3.5 text-primary" /> Kernels (language backends)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>IPython</strong> — Python kernel (default)</li>
              <li>• <strong>IRkernel</strong> — R kernel (statistics)</li>
              <li>• <strong>IJulia</strong> — Julia kernel (scientific compute)</li>
              <li>• <strong>bash_kernel</strong> — shell scripting kernel</li>
              <li>• <strong>IRust</strong> — Rust kernel</li>
              <li>• <strong>xeus-cling</strong> — C++ kernel (with Cling interpreter)</li>
              <li>• <strong>xeus-sqlite</strong> — SQLite kernel</li>
              <li>• <strong>xeus-python</strong> — alternative Python kernel (debugger)</li>
            </ul>
          </div>
          <div className="md:col-span-2">
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Boxes className="h-3.5 w-3.5 text-primary" /> Cloud notebook platforms</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div className="rounded-md border border-border/40 bg-card p-2">
                <p className="font-semibold">Binder (mybinder.org)</p>
                <p className="text-[10px] text-muted-foreground">Free, GitHub repo → container, no GPU</p>
              </div>
              <div className="rounded-md border border-border/40 bg-card p-2">
                <p className="font-semibold">Google Colab</p>
                <p className="text-[10px] text-muted-foreground">Free T4 GPU, $10/A100, Google Drive sync</p>
              </div>
              <div className="rounded-md border border-border/40 bg-card p-2">
                <p className="font-semibold">Kaggle Notebooks</p>
                <p className="text-[10px] text-muted-foreground">Free P100 30h/week, datasets</p>
              </div>
              <div className="rounded-md border border-border/40 bg-card p-2">
                <p className="font-semibold">Deepnote</p>
                <p className="text-[10px] text-muted-foreground">Team collaboration, auto-versioning</p>
              </div>
              <div className="rounded-md border border-border/40 bg-card p-2">
                <p className="font-semibold">Saturn Cloud</p>
                <p className="text-[10px] text-muted-foreground">JupyterHub-managed, GPU + Dask</p>
              </div>
              <div className="rounded-md border border-border/40 bg-card p-2">
                <p className="font-semibold">Datalore (JetBrains)</p>
                <p className="text-[10px] text-muted-foreground">Smart Python assistant + collaboration</p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ============================================================ */}
      {/* Research + case studies */}
      {/* ============================================================ }}
      <SectionCard
        title="Research + case studies — Jupyter in scientific computing"
        description="The papers and production deployments that defined Jupyter as the modern executable paper."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">IPython (Pérez, 2001):</strong> "IPython: A System for
            Interactive Scientific Computing" — Fernando Pérez's Python REPL with cell-based execution,
            magic commands, and inline plotting. The first notebook-style Python environment. Won the
            2017 ACM Software System Award (along with Jupyter).
          </p>
          <p>
            <strong className="text-foreground/80">Jupyter (Kluyver, 2016):</strong> "Jupyter Notebooks —
            a publishing format for reproducible computational workflows" — the paper that formalized
            the .ipynb JSON format (cells: code/markdown/raw, outputs: stream/display_data/execute_result).
            The format is now the standard for sharing reproducible scientific computations.
          </p>
          <p>
            <strong className="text-foreground/80">JupyterHub (Clements, 2015):</strong> "JupyterHub —
            multi-user Jupyter" — used at UC Berkeley for the Data 8 course (1,000+ students per
            semester), NASA for climate data analysis, CERN for LHC particle physics. The Kubernetes
            deployment (zero-to-jupyterhub) made it standard for universities and research labs worldwide.
          </p>
          <p>
            <strong className="text-foreground/80">Voilà (QuantStack, 2018):</strong> Voilà converts notebooks
            into interactive dashboards — same .ipynb serves two audiences: JupyterLab for developers,
            Voilà for end users. Adopted by Capgemini for clinical trial dashboards, by Bloomberg for
            financial analytics, by NASA for mission dashboards. The pattern: notebook-as-dashboard.
          </p>
          <p>
            <strong className="text-foreground/80">Production at LIGO (Nobel 2017):</strong> LIGO's
            gravitational wave detection (GW150914, 2015) used Jupyter notebooks for the analysis
            pipeline — the gravitational wave signal was confirmed in a notebook. The Nobel-winning
            paper (2017 Physics Nobel for Weiss, Thorne, Barish) ships with a GitHub repo + notebook
            that reproduces the detection. <strong>This is the modern standard: every publication
            requires a reproducible notebook.</strong>
          </p>
          <p>
            <strong className="text-foreground/80">Production at CERN (LHC, 2012):</strong> The Higgs boson
            discovery (2012) used ROOT + Python notebooks for the analysis. The 5σ discovery signal was
            computed in Jupyter notebooks running on CERN's JupyterHub cluster — 1000+ physicists
            collaborating on shared analysis notebooks. <strong>This is the largest scientific
            collaboration in history, powered by notebooks.</strong>
          </p>
        </div>
      </SectionCard>

      {/* ============================================================ */}
      {/* Deeper-thought insight */}
      {/* ============================================================ */}
      <SectionCard
        title="My deeper thought: Jupyter IS the modern executable paper"
        description="The unifying view: the Jupyter notebook is the modern scientific publication — every figure is reproducible code, every result is auditable, every reader can re-run."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Jupyter IS the modern executable paper.</strong> Pre-Jupyter,
            scientific papers were static PDFs — code was lost, results were unverifiable. Jupyter
            notebooks became the executable paper: every figure comes from a cell with reproducible code.
            Reviewers can re-run the notebook; FDA can audit it; readers can modify it. <strong>This is
            what "reproducible research" actually means in 2024</strong> — and it's why every Nature/Cell
            paper now ships with a GitHub repo + notebook + nbval test in CI. LIGO's Nobel-winning
            gravitational wave detection shipped a notebook. CERN's Higgs discovery shipped a notebook.
          </p>
          <p>
            <strong className="text-foreground/80">Cell execution order IS a programming paradigm.</strong> The
            In[n]/Out[n] counter is more than a UI feature — it's a programming paradigm. Each cell is a
            pure function (no side effects on globals from outside), but the kernel's namespace persists
            across cells. This enables exploratory data analysis: change one cell, re-run, see the new
            output. <strong>You can't do this in scripts</strong> — scripts require reloading data every
            time. Notebooks cache state in the kernel; the cell re-runs in milliseconds on cached data.
            This is why notebooks replaced scripts for exploratory work.
          </p>
          <p>
            <strong className="text-foreground/80">Voilà IS the modern dashboard.</strong> Pre-Voilà, building
            a dashboard from a notebook meant rewriting it as a Flask app with Plotly Dash or Streamlit.
            Voilà eliminates that — same .ipynb serves two audiences (JupyterLab for developers, Voilà
            for end users). <strong>The notebook IS the dashboard.</strong> For clinical trials, this means
            one notebook becomes both the analysis (for ML engineers) and the regulatory dashboard (for
            FDA monitors). The same notebook is shipped to two completely different audiences with zero
            code duplication.
          </p>
          <p>
            <strong className="text-foreground/80">Reproducibility IS the new publication standard.</strong> In
            2010, "reproducible research" meant "the data is on GitHub". In 2024, it means "the notebook
            runs in CI". nbval + Docker + Binder/Colab = a notebook that produces identical outputs
            across environments, re-run years later. <strong>This is now the publication standard</strong> —
            Nature, Cell, PNAS, JMLR all require a reproducible notebook with the paper. Without Jupyter's
            cell-based model + nbval regression testing, this standard would be impossible.
          </p>
          <p>
            <strong className="text-foreground/80">Wet lab → Jupyter → publication → startup IS the modern scientific narrative.</strong>
            Modern scientific startups ship from Jupyter notebooks: Recursion Pharma (microscopy ML notebooks),
            Insitro (drug discovery notebooks), Inceptive (RNA design notebooks), 23andMe (genomics notebooks).
            The narrative: wet-lab instrument → NumPy array → matplotlib figure → Jupyter notebook →
            GitHub repo → Series A → IPO. <strong>The notebook IS the IP</strong> — investors audit the
            notebook, not a slide deck. This is the modern scientific-to-marketplace pipeline, and Jupyter
            is its substrate.
          </p>
        </div>
      </SectionCard>


      <DeeperThoughtSection pageTitle="Jupyter">
        <DeeperThought title="Jupyter IS the REPL for data science — and it's the right UX" connectedTo="ADR-001 (platform architecture)">
          <p>{"Jupyter notebooks let you write code, see output, write more code — iteratively. This IS the REPL (Read-Eval-Print Loop) pattern, extended with rich output (plots, tables, HTML). The REPL IS the right UX for exploratory data analysis: you don't know what you're looking for until you see it. Jupyter IS the REPL that matches the exploratory nature of data science — you explore, find, then productionize."}</p>
        </DeeperThought>
        <DeeperThought title="Jupyter's cell model IS the state machine — and it's the source of bugs" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"Jupyter notebooks execute cells in order — but the state (variables, imports) persists between cells. If you re-run cell 3 after changing cell 1, the state from the previous run persists. This IS the hidden-state problem: the notebook's state IS NOT a function of its code (it depends on execution history). This is why notebooks are hard to reproduce. The fix: 'Restart kernel and run all' — which makes the state a function of the code. The cell model IS the state machine; 'run all' IS the deterministic execution."}</p>
        </DeeperThought>
        <DeeperThought title="JupyterHub IS the multi-user Jupyter — and it's the right pattern" connectedTo="ADR-001 (platform architecture)">
          <p>{"JupyterHub runs a Jupyter server per user (spawned on demand). Each user gets their own kernel, filesystem, and environment. This IS the SAME pattern as Kubernetes pods (one pod per user) and Jupyter IS the container. JupyterHub IS Kubernetes for notebooks — the pattern (multi-tenant + on-demand spawning) IS the same."}</p>
        </DeeperThought>
        <DeeperThought title="Jupyter IS the lab notebook — and that's the right metaphor" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"A Jupyter notebook IS a digital lab notebook: code (method), output (result), markdown (observation). The sequence of cells IS the experimental record. This IS the SAME pattern as a scientist's lab notebook — where you write what you did, what you saw, and what you think. Jupyter IS the lab notebook for computational science. The reproducibility issue (hidden state) IS the same as a lab notebook that says 'I added reagent X' but doesn't specify the concentration."}</p>
        </DeeperThought>
        <DeeperThought title="Jupyter → production IS the gap — and nbconvert is the bridge" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"Notebooks are for exploration; production needs scripts. The gap: how to turn exploratory code into production code. nbconvert (convert notebook to .py script) IS the bridge. The pattern (exploration → production) IS the same as the fold pattern (summary → deeper). The notebook IS the 'brief' (exploratory); the script IS the 'production patterns' (deterministic). nbconvert IS the fold between exploration and production."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <RelatedTopics topics={[
        { id: "numpy-scipy" as const, reason: "Notebooks run NumPy/SciPy code in cells" },
        { id: "gpu-computing" as const, reason: "Notebooks with GPU kernels (Colab, Saturn)" },
        { id: "dask-ray" as const, reason: "JupyterHub + Dask = distributed interactive compute" },
        { id: "mlflow-deep-dive" as const, reason: "Notebooks log to MLflow for experiment tracking" },
        { id: "bioinformatics" as const, reason: "Genomics notebooks: FASTQ → NumPy → figure" },
        { id: "cryo-em" as const, reason: "Cryo-EM interactive viewers via notebooks" },
        { id: "research" as const, reason: "Academic papers ship with reproducible notebooks" },
        { id: "data-mesh-deep-dive" as const, reason: "Notebooks consume data products via catalogs" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("numpy-scipy")} className="text-sm text-primary hover:underline">
          &rarr; NumPy/SciPy (what notebooks run)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("gpu-computing")} className="text-sm text-primary hover:underline">
          &rarr; GPU Computing (Colab/Saturn for GPU notebooks)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("dask-ray")} className="text-sm text-primary hover:underline">
          &rarr; Dask + Ray (JupyterHub distributed compute)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("research")} className="text-sm text-primary hover:underline">
          &rarr; Research Papers (notebook-backed publications)
        </Link>
      </div>
    </div>
  );
}
