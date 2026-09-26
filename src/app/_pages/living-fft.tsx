"use client";

import { useState } from "react";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { LivingEquationRunner } from "../_components/living-equation-runner";
import { RelatedTopics } from "../_components/related-topics";
import { RelatedElegantCode } from "../_components/related-elegant-code";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Activity, Sparkles, TrendingUp, Cpu, BookOpen, Database, Music } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";

type Tab = "math" | "live" | "production";

const KPIS = [
  { label: "Dataset", value: "C-major chord (C4, E4, G4)", hint: "A 1-second synthetic audio sample of a C-major chord at 44.1 kHz (44,100 samples). Real audio: public-domain piano samples.", deltaTone: "flat" as const },
  { label: "Equation", value: "X[k] = Σ x[n]·e^(-2πikn/N)", hint: "DFT: X[k] is the k-th frequency component of the N-sample signal x[n]. FFT computes all N components in O(N log N).", deltaTone: "flat" as const },
  { label: "Slider", value: "N (window size)", hint: "Drag N from 32 to 4096. At small N: 3 notes smear into a blob. At large N: they resolve to 3 sharp spikes at 262, 330, 392 Hz.", deltaTone: "up" as const },
  { label: "Production", value: "np.fft.fft / scipy.fft", hint: "Production: np.fft.fft(x) returns all N complex frequencies. scipy.fft.fft is faster for large N (uses pocketfft).", deltaTone: "flat" as const },
];

export function LivingFftPage() {
  const [tab, setTab] = useState<Tab>("live");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Living equation · run FFT live in your browser"
        title="Living FFT — watch a C-major chord resolve from a smear to 3 spikes"
        description="The Discrete Fourier Transform decomposes a 1-second audio sample of a C-major chord (C4-E4-G4) into its frequency components. Drag N (window size) and watch the 3 notes resolve from a broad smear to 3 sharp spikes at 262 Hz, 330 Hz, 392 Hz. The SAME equation that identifies a molecular mass in mass-spec and reconstructs 3D protein structures in cryo-EM — because all three deal with periodic phenomena."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Activity className="h-3 w-3" /> Signal Processing</Badge>
            <Badge variant="outline" className="gap-1.5"><Music className="h-3 w-3" /> Audio</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-border/60">
        {([
          ["live", "Live demo (Pyodide + slider)"],
          ["math", "Math derivation"],
          ["production", "Production code (np.fft.fft)"],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-semibold border-b-2 -mb-px transition-all ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "live" && (
        <SectionCard
          title="Live FFT on a C-major chord — drag N and watch 3 spikes emerge"
          description="The signal is x[n] = sin(2π·262·n/Fs) + sin(2π·330·n/Fs) + sin(2π·392·n/Fs) (3 notes at C4, E4, G4), sampled at Fs = 44100 Hz. FFT computes X[k] = Σ x[n]·e^(-2πikn/N) for k = 0, 1, ..., N-1. The magnitude |X[k]| shows a spike at each note's frequency. At small N, the frequency resolution Δf = Fs/N is coarse → spikes smear. At large N, Δf → 1 Hz → spikes sharpen."
          icon={<Sparkles className="h-5 w-5" />}
          badge="live"
        >
          <LivingEquationRunner
            slider={{
              name: "N",
              label: "N (window size — samples)",
              min: 32,
              max: 4096,
              step: 32,
              default: 1024,
              hint: "Frequency resolution Δf = Fs/N Hz. At N=1024: Δf ≈ 43 Hz (notes barely separate). At N=4096: Δf ≈ 11 Hz (notes sharp).",
            }}
            preamble="import json, math, cmath"
            code={`import json, math, cmath, random

# Build a synthetic C-major chord: C4 (262 Hz), E4 (330 Hz), G4 (392 Hz).
Fs = 44100  # sample rate
N = \${N}
# Adjust N to be a power of 2 (FFT works best, but DFT works for any N).
notes = [262.0, 330.0, 392.0]
x = []
for n in range(N):
    val = sum(math.sin(2 * math.pi * f * n / Fs) for f in notes)
    x.append(val * 0.3)  # normalise amplitude

# Direct DFT (O(N^2)) — for the live demo. Production uses FFT (O(N log N)).
# X[k] = sum_n x[n] * exp(-2 pi i k n / N)
X = []
for k in range(N // 2):  # only need first half (Nyquist symmetry)
    real = 0.0
    imag = 0.0
    for n in range(N):
        angle = -2 * math.pi * k * n / N
        real += x[n] * math.cos(angle)
        imag += x[n] * math.sin(angle)
    X.append(abs(complex(real, imag)) / N * 2)  # magnitude, normalised

# Find the top-3 peaks (the 3 notes).
top_peaks = sorted(range(len(X)), key=lambda k: X[k], reverse=True)[:6]
top_peaks_sorted = sorted(top_peaks)

# Build chart data: |X[k]| vs frequency (Hz).
frequencies = [k * Fs / N for k in range(len(X))]
chart_data = []
# Only show frequencies near the 3 notes (200-450 Hz) for clarity.
for k in range(len(X)):
    f = frequencies[k]
    if 100 <= f <= 600:
        chart_data.append({'frequency': f, 'magnitude': X[k]})

result = {
    'chart_data': chart_data,
    'top_peaks': [{'freq': frequencies[k], 'mag': X[k]} for k in top_peaks_sorted],
    'delta_f': Fs / N,
    'N': N,
    'Fs': Fs,
    'expected_notes': notes,
}
print(json.dumps(result))
`}
            renderer={(result) => {
              const r = result as { chart_data: Array<{ frequency: number; magnitude: number }>; top_peaks: Array<{ freq: number; mag: number }>; delta_f: number; N: number; Fs: number; expected_notes: number[] };
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">N</p>
                      <p className="font-mono font-bold text-primary text-base">{r.N}</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">Δf</p>
                      <p className="font-mono font-bold text-primary text-base">{r.delta_f.toFixed(2)} Hz</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">Expected</p>
                      <p className="font-mono font-bold text-primary text-[10px]">{r.expected_notes.join(", ")} Hz</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">Detected peaks</p>
                      <p className="font-mono font-bold text-primary text-[10px]">{r.top_peaks.map(p => `${p.freq.toFixed(0)}`).join(", ")} Hz</p>
                    </div>
                  </div>

                  <div style={{ width: "100%", height: 280 }}>
                    <ResponsiveContainer>
                      <LineChart data={r.chart_data} margin={{ top: 12, right: 16, bottom: 24, left: 0 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} />
                        <XAxis
                          dataKey="frequency"
                          type="number"
                          domain={[100, 600]}
                          tickFormatter={(v) => `${v.toFixed(0)}`}
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={10}
                          label={{ value: "frequency (Hz)", position: "insideBottom", offset: -10, fontSize: 10 }}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} label={{ value: "|X[f]|", angle: -90, position: "insideLeft", fontSize: 10 }} />
                        <Tooltip
                          labelFormatter={(label) => `${label.toFixed(2)} Hz`}
                          formatter={(value: number) => [value.toFixed(4), "|X[f]|"]}
                        />
                        {r.expected_notes.map((f) => (
                          <ReferenceLine key={f} x={f} stroke="#16a34a" strokeDasharray="4 4" label={{ value: `${f} Hz`, fontSize: 9, fill: "#16a34a", position: "top" }} />
                        ))}
                        <Line type="step" dataKey="magnitude" stroke="#2563eb" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The blue line is <span className="font-mono">|X[f]|</span> — the magnitude of the FFT. The 3 green dashed lines mark the expected notes (C4=262, E4=330, G4=392 Hz).
                    At <span className="font-mono text-primary">N = {r.N}</span>, frequency resolution is{" "}
                    <span className="font-mono text-primary">Δf = {r.delta_f.toFixed(2)} Hz</span>.
                    The detected peaks are <span className="font-mono text-primary">{r.top_peaks.map(p => p.freq.toFixed(0)).join(", ")} Hz</span>.
                  </p>
                </div>
              );
            }}
          />
        </SectionCard>
      )}

      {tab === "math" && (
        <SectionCard
          title="Math derivation — where FFT comes from"
          description="Gauss (1805, rediscovered) and Cooley-Tukey (1965) discovered the Fast Fourier Transform. The DFT is the unique linear map from a length-N signal to its N frequency components. The FFT computes it in O(N log N) via a divide-and-conquer on even/odd samples."
          icon={<BookOpen className="h-5 w-5" />}
          badge="derivation"
        >
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground/80">The DFT equation.</strong> The Discrete Fourier Transform is X[k] = Σ(n=0 to N-1) x[n] · e^(-2πikn/N) for k = 0, 1, ..., N-1. It is a linear map from C^N to C^N. The matrix form is X = F · x where F(k,n) = ω^(kn) and ω = e^(-2πi/N) is the primitive N-th root of unity.
            </p>
            <p>
              <strong className="text-foreground/80">The FFT divide-and-conquer (Cooley-Tukey 1965).</strong> Split x into even-indexed and odd-indexed halves: x_even = x[0,2,4,...] and x_odd = x[1,3,5,...]. Then X[k] = X_even[k] + ω^k · X_odd[k], where X_even and X_odd are length-N/2 DFTs. Recursing gives O(N log N) time — a 100× speedup for N=1024, a 1000× speedup for N=4096.
            </p>
            <p>
              <strong className="text-foreground/80">Why the frequency resolution is Δf = Fs/N.</strong> The DFT bins are spaced at integer multiples of Fs/N. So the smallest resolvable frequency difference is Δf = Fs/N Hz. For N=1024 at Fs=44.1 kHz: Δf = 43 Hz (barely resolves C4 from E4, which are 68 Hz apart). For N=4096: Δf = 11 Hz (clean separation). This is the time-frequency uncertainty principle — you can't have both.
            </p>
            <p>
              <strong className="text-foreground/80">Citation.</strong> Gauss (1805, posthumous). Cooley & Tukey, 'An algorithm for the machine calculation of complex Fourier series', Math. Comp. 19 (1965). Oppenheim & Schafer, 'Discrete-Time Signal Processing' (1989).
            </p>
          </div>
        </SectionCard>
      )}

      {tab === "production" && (
        <SectionCard
          title="Production code — what NumPy and SciPy actually compute"
          description="In production, you call np.fft.fft or scipy.fft.fft. Both use pocketfft (a C implementation of the Cooley-Tukey algorithm with optimizations for non-power-of-2 sizes). Here's the production call."
          icon={<Cpu className="h-5 w-5" />}
          badge="production"
        >
          <CodeBlock
            language="python"
            filename="production_fft.py"
            code={`# Production FFT on real audio
import numpy as np
from scipy.fft import fft, fftfreq
import matplotlib.pyplot as plt

# Load real audio (public-domain piano C-major chord)
# Source: https://freesound.org/ (CC0 license)
from scipy.io import wavfile
Fs, x = wavfile.read('c_major_chord.wav')  # Fs=44100, x=(N,)

# Take first N samples (power of 2 for fastest FFT)
N = 8192  # ~0.2 seconds of audio
x_windowed = x[:N] * np.hanning(N)  # Hanning window reduces spectral leakage

# Compute FFT — O(N log N) via pocketfft
X = fft(x_windowed)  # complex array, length N
frequencies = fftfreq(N, 1/Fs)[:N//2]  # Hz
magnitudes = np.abs(X[:N//2]) / N * 2

# Find top-3 peaks (the 3 notes of C-major)
top3_idx = np.argsort(magnitudes)[-3:]
top3_freqs = frequencies[top3_idx]  # should be ~262, 330, 392 Hz
print(f"Detected notes: {top3_freqs} Hz")

# Plot
plt.figure(figsize=(10, 4))
plt.plot(frequencies, magnitudes)
plt.axvline(262, color='r', linestyle='--', label='C4 (262 Hz)')
plt.axvline(330, color='g', linestyle='--', label='E4 (330 Hz)')
plt.axvline(392, color='b', linestyle='--', label='G4 (392 Hz)')
plt.xlim(100, 600); plt.xlabel('frequency (Hz)'); plt.ylabel('|X[f]|')
plt.legend(); plt.title('FFT of C-major chord')
plt.savefig('fft_c_major.png', dpi=150, bbox_inches='tight')

# Real production: Shazam uses FFT on 10-second windows to fingerprint audio.
# Mass-spec uses FFT to identify compounds from m/z peaks.
# cryo-EM uses 3D FFT to reconstruct protein structures from noisy 2D images.`}
          />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Link href={hrefFor("numpy-scipy")} className="rounded-md border border-border/60 bg-muted/20 p-2 hover:border-primary/40 hover:bg-primary/5 transition-colors block">
              <p className="font-semibold text-foreground/80">→ NumPy/SciPy page</p>
              <p className="text-muted-foreground text-[10px] mt-0.5">np.fft.fft, scipy.fft.fft — the computational foundation.</p>
            </Link>
            <Link href={hrefFor("elegant-code")} className="rounded-md border border-border/60 bg-muted/20 p-2 hover:border-primary/40 hover:bg-primary/5 transition-colors block">
              <p className="font-semibold text-foreground/80">→ Elegant Code (FFT card)</p>
              <p className="text-muted-foreground text-[10px] mt-0.5">FFT's full cross-disciplinary card: mass spec ↔ audio ↔ cryo-EM.</p>
            </Link>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="My deeper thought: FFT IS the change of basis"
        description="In linear algebra, a change of basis rotates your coordinate system. FFT rotates from the 'time' basis (how much signal at time t) to the 'frequency' basis (how much signal at frequency f). This rotation is EXACT — no information is lost, it's a unitary transform. The same rotation that identifies a C-note in audio identifies a molecular mass in spectrometry and reconstructs 3D protein structures in cryo-EM. Music, chemistry, and structural biology are the SAME math because they all deal with periodic phenomena."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">A musician, a chemist, and a structural biologist</strong> are all doing the same computation — and none of them knows it. The FFT is THE tool for finding periodicities, regardless of domain.</p>
          <p><strong className="text-foreground/80">FFT IS to periodic phenomena</strong> what SVD IS to data: a change of basis that exposes structure. The two equations are cousins — both reveal the underlying patterns in a signal/matrix by changing the coordinate system.</p>
        </div>
      </SectionCard>

      <RelatedElegantCode sourceCard={3} />

      <DeeperThoughtSection pageTitle="Fft">
        <DeeperThought title="FFT IS the change of basis — the universal coordinate rotation" connectedTo="ADR-034 (ESM-2 + AlphaFold2)">
          <p>{"In linear algebra, a change of basis rotates your coordinate system. FFT rotates from the 'time' basis (how much signal at time t) to the 'frequency' basis (how much signal at frequency f). This rotation is EXACT — no information is lost, it's a unitary transform. The same rotation that identifies a C-note in audio identifies a molecular mass in spectrometry and reconstructs 3D protein structures in cryo-EM. Music, chemistry, and structural biology are the SAME math because they all deal with periodic phenomena."}</p>
        </DeeperThought>
        <DeeperThought title="The uncertainty principle IS the time-frequency trade-off" connectedTo="ADR-051 (living-equation pages)">
          <p>{"When you drag N on this page, you see the frequency resolution Δf = Fs/N change. At N=1024, Δf = 43 Hz — the 3 notes barely separate. At N=4096, Δf = 11 Hz — the notes are sharp spikes. This IS the Heisenberg uncertainty principle: you can't know both the time and frequency of a signal precisely. The window size N trades time resolution for frequency resolution. This isn't just signal processing — it's quantum mechanics. The same trade-off governs particle physics and audio engineering."}</p>
        </DeeperThought>
        <DeeperThought title="Gauss invented FFT in 1805 — before Fourier, before computers" connectedTo="ADR-001 (platform architecture)">
          <p>{"Carl Friedrich Gauss derived the Fast Fourier Transform in an unpublished 1805 note on asteroid orbit computation — 62 years before Fourier's heat equation work and 160 years before Cooley-Tukey's 1965 paper. The algorithm was so far ahead of its time that it couldn't be used until computers existed. The FFT is one of the top-10 algorithms of the 20th century (IEEE 2000) — and it was invented in the 18th century. The math doesn't care about chronology."}</p>
        </DeeperThought>
        <DeeperThought title="The 3-spike spectrum IS the proof — not the equation" connectedTo="ADR-051 (living-equation pages)">
          <p>{"When you see the FFT output — 3 sharp spikes at 262, 330, 392 Hz — you KNOW the chord is C-major. You don't need to understand the math to see the result. The visual output communicates to the brain's pattern-recognition system directly, bypassing the verbal/analytical pathway. This is why we need outputs alongside equations: different parts of the brain process formulas and images. The reader who sees the 3 spikes UNDERSTANDS FFT in a way the reader who only reads the formula doesn't."}</p>
        </DeeperThought>
        <DeeperThought title="FFT and SVD are cousins — both are change-of-basis" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"FFT rotates from time to frequency. SVD rotates from row-space to component-space. Both are unitary transforms (information-preserving). Both expose structure that was invisible in the original basis. The card-to-card adjacency graph on /connections links FFT to SVD because they share the mathematical family of change-of-basis operations. Understanding one helps you understand the other — and understanding both helps you see that 'change of basis' is one of the most powerful ideas in all of mathematics."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <RelatedTopics topics={[
        { id: "numpy-scipy" as const, reason: "NumPy/SciPy — np.fft.fft in production" },
        { id: "elegant-code" as const, reason: "Elegant Code — the FFT card (cross-disciplinary)" },
        { id: "cryo-em" as const, reason: "Cryo-EM — 3D FFT reconstructs protein structures" },
        { id: "living-svd" as const, reason: "Living SVD (cousin: change of basis)" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("elegant-code")} className="text-sm text-primary hover:underline">→ Elegant Code (FFT card)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("numpy-scipy")} className="text-sm text-primary hover:underline">→ NumPy/SciPy (production)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("living-svd")} className="text-sm text-primary hover:underline">→ Living SVD (cousin)</Link>
      </div>
    </div>
  );
}
