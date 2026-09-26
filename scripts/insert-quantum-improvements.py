#!/usr/bin/env python3
"""
Insert the 8 code-preview constants + JSX SectionCard into the
quantum-computing.tsx page.

Constants block (458 lines from /tmp/quantum_improvements.txt) is inserted
right after PYTORCH_CODE's closing `';'`.

A new JSX SectionCard with 8 PyodideRunner calls (one per improvement) is
inserted right before the "My deeper thought" SectionCard.
"""
import re

PAGE = "/home/z/my-project/src/app/_pages/quantum-computing.tsx"

# Read the constants file
with open("/tmp/quantum_improvements.txt") as f:
    constants_block = f.read().strip() + "\n\n"

# Read the page source
with open(PAGE) as f:
    src = f.read()

# === STEP 1: Insert constants after PYTORCH_CODE's closing ===
# PYTORCH_CODE ends with: `...print(f"  {name:10s}: unitary = {is_u}")';`
# Followed by blank line + `export function QuantumComputingPage() {`

# Find the boundary
boundary = re.search(r'(print\(f"  \{name:10s\}: unitary = \{is_u\}"\)`;\n\n)(export function QuantumComputingPage\(\) \{)', src)
if not boundary:
    raise SystemExit("Couldn't find PYTORCH_CODE → QuantumComputingPage boundary")

insert_pos = boundary.start(2)  # right before `export function`
new_src = src[:insert_pos] + constants_block + src[insert_pos:]

# === STEP 2: Insert JSX SectionCard before "My deeper thought" essay ===
# Find the existing `Low-level PyTorch` SectionCard's closing tag, then add
# our new SectionCard before the `My deeper thought` SectionCard.

jsx_block = '''
      <SectionCard
        title="Improvement designs — 8 code previews of the suggested enhancements (Pyodide)"
        description="Eight Pyodide-runnable previews — one per suggested improvement — each demonstrating the underlying math + computation that would power the corresponding visual. Run each block to see concrete numerical outcomes (gate counts, error rates, qubit counts, runtime estimates). The math here is what the visual would render; the print() output is what the visual would display."
        icon={<Sparkles className="h-5 w-5" />}
        badge="8 previews"
      >
        <div className="space-y-6">
          {/* 1. Interactive Bloch sphere */}
          <div className="rounded-md border border-border/60 bg-card p-4">
            <p className="text-sm font-semibold flex items-center gap-1.5 mb-1">
              <span className="text-primary">1. Interactive draggable Bloch sphere</span>
              <Badge variant="outline" className="text-[10px]">drag math</Badge>
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              <strong>Design intent:</strong> user drags a 2D point on a sphere; the qubit
              state |ψ⟩ updates in real time, with measurement sampling + gate rotations.
              <br />
              <strong>Math foundation:</strong> inverse orthographic projection of unit sphere
              (screen → Bloch), Born&apos;s rule for measurement, SU(2) gates = Bloch rotations.
            </p>
            <PyodideRunner
              buttonLabel="Run Bloch-sphere drag math (Pyodide)"
              code={BLOCH_DRAG_CODE}
            />
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-2">
              <strong>Insight:</strong> drag = inverse projection (2D → 3D Bloch vector);
              gate = axis rotation on SU(2); measure = Born-rule sampling. The whole UI is
              three linear-algebra operations chained.
            </p>
          </div>

          {/* 2. Surface code visualisation */}
          <div className="rounded-md border border-border/60 bg-card p-4">
            <p className="text-sm font-semibold flex items-center gap-1.5 mb-1">
              <span className="text-primary">2. Surface code patch + syndrome decoder</span>
              <Badge variant="outline" className="text-[10px]">stabiliser formalism</Badge>
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              <strong>Design intent:</strong> animated d×d patch with X/Z stabiliser highlights
              responding to injected errors; slider for code distance d (3 → 21) shows
              logical error rate dropping per Willow&apos;s Λ = 2.14.
              <br />
              <strong>Math foundation:</strong> stabiliser codes (code = +1 eigenspace of
              stabiliser group); logical error scales as p_phys × Λ^((d-1)/2) below threshold.
            </p>
            <PyodideRunner
              buttonLabel="Run surface-code scaling model (Pyodide)"
              code={SURFACE_CODE_CODE}
            />
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-2">
              <strong>Insight:</strong> the visual is a 2D grid + syndrome highlight; the
              math is a single exponential scaling law. Willow&apos;s Λ is what makes the
              visual interesting — it proves bigger codes get BETTER, not worse.
            </p>
          </div>

          {/* 3. Quantum speedup comparison chart */}
          <div className="rounded-md border border-border/60 bg-card p-4">
            <p className="text-sm font-semibold flex items-center gap-1.5 mb-1">
              <span className="text-primary">3. Quantum speedup comparison chart</span>
              <Badge variant="outline" className="text-[10px]">Big-O</Badge>
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              <strong>Design intent:</strong> log-log bar chart comparing classical vs quantum
              ops for search / factoring / Fourier, with hardware-feasibility annotations
              (does it fit in T₁ coherence time on IBM Heron R2?).
              <br />
              <strong>Math foundation:</strong> Big-O asymptotic bounds + concrete gate counts
              compared against hardware coherence budgets.
            </p>
            <PyodideRunner
              buttonLabel="Run speedup + feasibility model (Pyodide)"
              code={SPEEDUP_CODE}
            />
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-2">
              <strong>Insight:</strong> visual = log-log chart with N axis; math = Big-O
              asymptotics + the killer follow-up — &ldquo;yes it&apos;s faster, but can the
              hardware run it before decoherence?&rdquo; This is the NISQ-era question.
            </p>
          </div>

          {/* 4. Majorana zero-mode visualisation */}
          <div className="rounded-md border border-border/60 bg-card p-4">
            <p className="text-sm font-semibold flex items-center gap-1.5 mb-1">
              <span className="text-primary">4. Majorana zero-mode + topological protection</span>
              <Badge variant="outline" className="text-[10px]">BdG</Badge>
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              <strong>Design intent:</strong> animated Kitaev chain with Majorana zero modes
              (MZMs) localised at the endpoints; slider for chemical potential μ crosses the
              topological phase boundary |μ| = 2t — spectrum collapses/gaps accordingly.
              <br />
              <strong>Math foundation:</strong> BdG Hamiltonian diagonalisation;
              topological phase = gapped bulk with gapless edge modes protected by exp(-Δ/kT).
            </p>
            <PyodideRunner
              buttonLabel="Run Kitaev-chain topological model (Pyodide)"
              code={MAJORANA_CODE}
            />
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-2">
              <strong>Insight:</strong> the visual is a 1D wire + spectrum; the math is
              diagonalising a 2N × 2N BdG Hamiltonian. Microsoft&apos;s Majorana 1 bet is
              that topoconductors let you scale Δ without scaling qubit count.
            </p>
          </div>

          {/* 5. Decoherence timeline */}
          <div className="rounded-md border border-border/60 bg-card p-4">
            <p className="text-sm font-semibold flex items-center gap-1.5 mb-1">
              <span className="text-primary">5. Decoherence timeline (1998 → 2025 + projections)</span>
              <Badge variant="outline" className="text-[10px]">log-linear fit</Badge>
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              <strong>Design intent:</strong> log-scale plot of T₁ coherence vs year, marking
              each major chip (Sycamore, Eagle, Willow); exponential fit + 2030/2040
              projections; horizontal line at the surface-code threshold crossing (2024).
              <br />
              <strong>Math foundation:</strong> log-linear regression on (year, log T₁) →
              doubling time; threshold crossing at p_phys = p_c ≈ 1%.
            </p>
            <PyodideRunner
              buttonLabel="Run decoherence-timeline fit (Pyodide)"
              code={DECOHERENCE_TIMELINE_CODE}
            />
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-2">
              <strong>Insight:</strong> visual = log-scale scatter + fit; math = np.polyfit
              on (year, log T₁). The headline finding: T₁ doubles every ~6 years (vs Moore&apos;s
              2 years for transistors) — slower, but 2024 crossed the QEC threshold.
            </p>
          </div>

          {/* 6. Real Qiskit snippet */}
          <div className="rounded-md border border-border/60 bg-card p-4">
            <p className="text-sm font-semibold flex items-center gap-1.5 mb-1">
              <span className="text-primary">6. Real Qiskit snippet (Bell circuit + transpile)</span>
              <Badge variant="outline" className="text-[10px]">unitary composition</Badge>
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              <strong>Design intent:</strong> circuit diagram (H on q0, CNOT(q0, q1), measure);
              &ldquo;transpile&rdquo; button shows the same circuit decomposed into IBM&apos;s
              native gate set {`{RZ, SX, X, CX}`}; 8192-shot sampler produces a histogram.
              <br />
              <strong>Math foundation:</strong> U_circuit = U_n · ... · U_1 (unitary
              composition); transpilation = gate decomposition satisfying
              ||U_native - U_ideal|| ≈ 0.
            </p>
            <PyodideRunner
              buttonLabel="Run Bell-circuit + transpile demo (Pyodide)"
              code={QISKIT_EQUIV_CODE}
            />
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-2">
              <strong>Insight:</strong> qiskit isn&apos;t on Pyodide&apos;s default index, but
              the math is identical: build U as a Kronecker product of single-qubit unitaries,
              then verify transpilation by matrix-norm distance to the ideal.
            </p>
          </div>

          {/* 7. Quantinuum Helios all-to-all */}
          <div className="rounded-md border border-border/60 bg-card p-4">
            <p className="text-sm font-semibold flex items-center gap-1.5 mb-1">
              <span className="text-primary">7. Quantinuum Helios — all-to-all vs heavy-hex</span>
              <Badge variant="outline" className="text-[10px]">SWAP overhead</Badge>
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              <strong>Design intent:</strong> side-by-side diagrams of heavy-hex lattice (IBM
              Heron R2) vs complete-graph (Quantinuum H2/Helios); slider for N shows SWAP
              overhead growing quadratically on SC, staying at 0 on ion trap.
              <br />
              <strong>Math foundation:</strong> heavy-hex needs O(N(N-1)) SWAPs for all-to-all
              ansatz; ion trap is native all-to-all (0 SWAPs); effective circuit fidelity =
              (1 - p_2q)^(gates + SWAPs).
            </p>
            <PyodideRunner
              buttonLabel="Run all-to-all vs heavy-hex model (Pyodide)"
              code={HELIOS_ALLTOALL_CODE}
            />
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-2">
              <strong>Insight:</strong> visual = lattice vs complete-graph diagram; math = SWAP
              count × gate fidelity. The trap: ion trap has fewer qubits but EVERY qubit can
              talk to every other — QCCD architecture wins on all-to-all algorithms.
            </p>
          </div>

          {/* 8. Shor's resource estimation */}
          <div className="rounded-md border border-border/60 bg-card p-4">
            <p className="text-sm font-semibold flex items-center gap-1.5 mb-1">
              <span className="text-primary">8. &ldquo;What&apos;s NOT yet possible&rdquo; — Shor resource estimation</span>
              <Badge variant="outline" className="text-[10px]">Gidney-Ekerå 2019</Badge>
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              <strong>Design intent:</strong> bar chart of physical qubits needed for Shor on
              RSA-{`{256, 512, 1024, 2048, 4096, 8192}`} alongside today&apos;s best chip
              (156 qubits); &ldquo;years to Shor&rdquo; countdown assuming 2× qubit growth / 2yr.
              <br />
              <strong>Math foundation:</strong> Gidney-Ekerå 2019 scaling — n_logical = 3n,
              d ≈ 17-21, magic state distillation adds ~100× overhead; runtime = depth × T_gate.
            </p>
            <PyodideRunner
              buttonLabel="Run Shor resource estimator (Pyodide)"
              code={SHOR_RESOURCE_CODE}
            />
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-2">
              <strong>Insight:</strong> visual = chip-size comparison + Gantt; math =
              Gidney-Ekerå scaling. The killer finding: 99% of a fault-tolerant chip is magic
              state factories — that&apos;s why fault-tolerant QC is HARD, not just &ldquo;more qubits.&rdquo;
            </p>
          </div>
        </div>
      </SectionCard>

'''

# Find the Low-level PyTorch SectionCard's closing </SectionCard> and insert
# our new block right after it (which is just before the My deeper thought section).
# The pattern: `<SectionCard ...>...<CodeBlock .../></SectionCard>\n\n      <SectionCard title="My deeper thought`
pattern = re.compile(
    r'(<SectionCard title="Low-level PyTorch[^"]*".*?<CodeBlock[^>]*/>\s*</SectionCard>\n)(\n      <SectionCard title="My deeper thought)',
    re.DOTALL,
)
m = pattern.search(new_src)
if not m:
    raise SystemExit("Couldn't find Low-level PyTorch → My deeper thought boundary")

insert_pos = m.end(1)
new_src = new_src[:insert_pos] + jsx_block + new_src[insert_pos:]

# Write back
with open(PAGE, "w") as f:
    f.write(new_src)

# Verify
with open(PAGE) as f:
    final = f.read()
print(f"Final file: {len(final.splitlines())} lines")
print(f"Constants inserted: {'BLOCH_DRAG_CODE' in final and 'SHOR_RESOURCE_CODE' in final}")
print(f"JSX section inserted: {'Improvement designs' in final}")
print(f"Sparkles import needed: {'<Sparkles' in final}")
