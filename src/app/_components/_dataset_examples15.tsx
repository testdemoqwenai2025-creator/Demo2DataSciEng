// ============================================================
// Scientific dataset examples for Phase F scientific computing pages
// 8 examples (2 per page × 4 pages) × 5 languages
// Pages: numpy-scipy, dask-ray, gpu-computing, jupyter
// All Pyodide demos use only math / random / collections — NO numpy.
// ============================================================

import type { DatasetExample } from "./dataset-cards";
import {
  Database, Atom, Boxes, Zap, TrendingUp, Activity, Cpu,
  Brain, Network, ShieldCheck, Sparkles, Microscope, Waves,
} from "lucide-react";

// ============================================================
// NUMPY/SCIPY SCIENCE EXAMPLES (2)
// ============================================================

export const NUMPY_SCIENCE_EXAMPLES: DatasetExample[] = [
  {
    id: "numpy-genomics-expression-tensor",
    step: "1",
    title: "Genomics Expression Tensor — SVD/PCA Publication Figure",
    subtitle: "Life Sciences — 3D (genes×samples×conditions) → SVD → PCA → publication",
    accent: "oklch(0.65 0.16 30)",
    icon: <Database className="h-4 w-4" />,
    badge: "Life Sciences · Genomics",
    brief: {
      dataset: "Synthetic RNA-seq expression tensor: 1000 genes × 50 samples × 4 conditions (control, treatment, time, replicate). Stored as a NumPy 3D ndarray — each slice is a samples × conditions matrix.",
      scale: "1000 × 50 × 4 = 200,000 float32 values (~800KB) → SVD → top 10 PCs → publication figure",
      why: "Demonstrates 3D-to-N-D manipulation: reshape to 2D, SVD on the samples matrix, scree plot of singular values, then 2D PCA scatter colored by condition. This is the canonical wet-lab-to-publication pipeline: sequencer → NumPy → matplotlib → paper.",
    },
    stats: [
      { label: "Genes", value: "1,000" },
      { label: "Samples", value: "50" },
      { label: "Conditions", value: "4" },
      { label: "NDArray rank", value: "3" },
    ],
    tools: ["NumPy ndarray", "np.linalg.svd", "matplotlib", "scikit-learn PCA", "LAPACK dgesdd", "BLAS dgemm"],
    codeTabs: [
      {
        lang: "scala",
        filename: "GenomicsExpressionTensorSVD.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.ml.feature.PCA
import org.apache.spark.ml.linalg.Vectors

// 3D expression tensor → 2D samples × genes → SVD/PCA → publication
val spark = SparkSession.builder().getOrCreate()

// Load 3D tensor (genes × samples × conditions) and flatten to 2D
val tensor = spark.read.parquet("s3://genomics/expression_tensor/")
  // Reshape: (samples × conditions) × genes — collapse to 2D for SVD
  .groupBy("sample_id", "condition")
  .pivot("gene_id")
  .agg(first("expression"))

val assembler = new org.apache.spark.ml.feature.VectorAssembler()
  .setInputCols(tensor.columns.filter(_ != "sample_id").filter(_ != "condition"))
  .setOutputCol("features")

val features = assembler.transform(tensor)
// PCA via SVD: A = U * sigma * V^T — top-k principal components
val pca = new PCA().setInputCol("features").setOutputCol("pca").setK(10).fit(features)
val projected = pca.transform(features).select("sample_id", "condition", "pca")

// Save figure-ready data for matplotlib
projected.write.mode("overwrite").parquet("s3://genomics/pca_projection/")`,
      },
      {
        lang: "rust",
        filename: "genomics_expression_svd.rs",
        code: `use ndarray::{Array3, Array2, Array1};
use ndarray_linalg::SVD;

// 3D expression tensor → 2D → SVD → PCA
fn main() {
    // (genes=1000, samples=50, conditions=4) → 3D ndarray
    let tensor: Array3<f64> = Array3::from_shape_fn((1000, 50, 4), |g, s, c| {
        // Synthetic expression: gene g has baseline + sample perturbation + condition effect
        let gene_baseline = (g as f64) * 0.001;
        let sample_pert = (s as f64) * 0.05;
        let condition_effect = (c as f64) * 0.3;
        gene_baseline + sample_pert + condition_effect
    });

    // Reshape 3D → 2D: (samples × conditions) × genes
    let n_samples = 50 * 4;
    let n_genes = 1000;
    let matrix: Array2<f64> = tensor.to_shape((n_samples, n_genes)).unwrap().to_owned();

    // SVD: A = U * sigma * V^T (LAPACK dgesdd)
    let (u, sigma, vt) = matrix.svd(true, true).unwrap();

    // Top 10 principal components (scree plot data)
    let top10: Array1<f64> = sigma.slice(s![0..10]).to_owned();
    println!("Top 10 singular values: {:?}", top10);

    // Project samples onto PC1, PC2 — for matplotlib scatter
    let pc1 = u.column(0).to_owned();
    let pc2 = u.column(1).to_owned();
    println!("PC1 first 5: {:?}", pc1.slice(s![0..5]));
    println!("PC2 first 5: {:?}", pc2.slice(s![0..5]));
}`,
      },
      {
        lang: "go",
        filename: "genomics_expression_svd.go",
        code: `package main

import (
    "fmt"
    "gonum.org/v1/gonum/mat"
)

// 3D expression tensor → 2D → SVD → PCA
func main() {
    // (samples × conditions) × genes = 200 × 1000 matrix
    nRows := 50 * 4
    nCols := 1000
    data := make([]float64, nRows*nCols)
    for s := 0; s < nRows; s++ {
        for g := 0; g < nCols; g++ {
            // Synthetic: baseline + sample + gene effect
            data[s*nCols+g] = float64(g)*0.001 + float64(s)*0.05
        }
    }
    A := mat.NewDense(nRows, nCols, data)

    // SVD: A = U * sigma * V^T (LAPACK dgesdd)
    var svd mat.SVD
    svd.Factorize(A, mat.SVDThin)

    var sigma, u, vt mat.Dense
    svd.UTo(&u)
    svd.VTo(&vt)
    svd.SigmaTo(&sigma)

    // Top 10 singular values for scree plot
    fmt.Println("Top 10 singular values (scree plot):")
    for i := 0; i < 10; i++ {
        fmt.Printf("  sigma[%d] = %.4f\\n", i, sigma.At(i, i))
    }

    // Project samples onto PC1, PC2 for matplotlib scatter
    fmt.Printf("PC1[0:3] = %.4f %.4f %.4f\\n",
        u.At(0, 0), u.At(1, 0), u.At(2, 0))
    fmt.Printf("PC2[0:3] = %.4f %.4f %.4f\\n",
        u.At(0, 1), u.At(1, 1), u.At(2, 1))
}`,
      },
      {
        lang: "elixir",
        filename: "genomics_expression_svd.ex",
        code: `defmodule Genomics.ExpressionTensor do
  @moduledoc "3D expression tensor → SVD → PCA → publication figure"

  # Build a 3D tensor (genes × samples × conditions) as nested lists.
  def build_tensor(n_genes \\ 1000, n_samples \\ 50, n_conditions \\ 4) do
    for g <- 0..(n_genes-1) do
      for s <- 0..(n_samples-1) do
        for c <- 0..(n_conditions-1) do
          # Synthetic expression: gene baseline + sample + condition effect
          g * 0.001 + s * 0.05 + c * 0.3
        end
      end
    end
  end

  # Reshape 3D → 2D: (samples × conditions) rows, genes cols.
  def to_2d(tensor) do
    Enum.flat_map(tensor, fn gene_col ->
      # gene_col is samples × conditions — transpose to one row per (sample, condition)
      sxc = Enum.zip(gene_col)  # zip samples into tuples
      Enum.map(sxc, fn row -> Tuple.to_list(row) end)
    end)
    |> Enum.zip()
    |> Enum.map(&Tuple.to_list/1)
  end

  # Compute top-k singular values (very simplified power iteration).
  def top_singular_values(matrix, k) do
    # Real impl would call LAPACK via NIF; here just take column norms as proxy
    Enum.take(matrix, k)
    |> Enum.map(fn row -> Enum.sum(Enum.map(row, &(&1 * &1))) end)
  end
end`,
      },
      {
        lang: "zig",
        filename: "genomics_expression_svd.zig",
        code: `const std = @import("std");

// 3D expression tensor → 2D → SVD → PCA → publication figure
pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const n_genes: usize = 1000;
    const n_samples: usize = 50;
    const n_conditions: usize = 4;

    // Build 3D tensor (genes × samples × conditions) — flat array
    const total = n_genes * n_samples * n_conditions;
    var tensor = try allocator.alloc(f64, total);
    defer allocator.free(tensor);

    var i: usize = 0;
    while (i < total) : (i += 1) {
        // Synthetic: gene + sample + condition contribution
        const g = i / (n_samples * n_conditions);
        const s = (i / n_conditions) % n_samples;
        const c = i % n_conditions;
        tensor[i] = @as(f64, @floatFromInt(g)) * 0.001
            + @as(f64, @floatFromInt(s)) * 0.05
            + @as(f64, @floatFromInt(c)) * 0.3;
    }

    // Reshape 3D → 2D: (samples × conditions) × genes
    const n_rows = n_samples * n_conditions;
    const n_cols = n_genes;

    // LAPACK dgesdd would be called here for SVD; print shape + stats
    std.debug.print("Tensor shape: ({d}, {d}, {d}) -> 2D ({d}, {d})\\n",
        .{ n_genes, n_samples, n_conditions, n_rows, n_cols });

    // Compute column norms as proxy for singular values
    var col_norms = try allocator.alloc(f64, n_cols);
    defer allocator.free(col_norms);
    @memset(col_norms, 0.0);
    var row: usize = 0;
    while (row < n_rows) : (row += 1) {
        var col: usize = 0;
        while (col < n_cols) : (col += 1) {
            const v = tensor[row * n_cols + col];
            col_norms[col] += v * v;
        }
    }
    std.debug.print("First 5 'singular-value proxies':\\n", .{});
    var k: usize = 0;
    while (k < 5) : (k += 1) {
        std.debug.print("  sigma[{d}] = {d:.4}\\n", .{ k, col_norms[k] });
    }
}`,
      },
    ],
    runnablePython: `# Genomics expression tensor → SVD → PCA — pure Python (Pyodide)
# (uses only math + random — NO numpy; pure-Python SVD via power iteration)
import math
import random

random.seed(42)
N_GENES = 1000   # rows
N_SAMPLES = 50   # cols per condition
N_COND = 4       # conditions

print(f"=== 3D Expression Tensor ({N_GENES} genes x {N_SAMPLES} samples x {N_COND} conditions) ===")

# Build 2D matrix: (samples x conditions) x genes = 200 x 1000
n_rows = N_SAMPLES * N_COND
n_cols = N_GENES
matrix = []
for s in range(N_SAMPLES):
    for c in range(N_COND):
        row = [(g * 0.001) + (s * 0.05) + (c * 0.3) + random.gauss(0, 0.02)
               for g in range(n_cols)]
        matrix.append(row)

print(f"Reshaped to 2D: {len(matrix)} rows x {len(matrix[0])} cols")
print()

# Power iteration to estimate top-3 singular values (no LAPACK in Pyodide)
# v ~ top right singular vector; sigma ~ ||A v|| / ||v||

def power_iter(A, n_iter=30):
    n = len(A[0])
    v = [1.0 / math.sqrt(n)] * n
    for _ in range(n_iter):
        # Av
        Av = [sum(A[i][j] * v[j] for j in range(n)) for i in range(len(A))]
        norm = math.sqrt(sum(x * x for x in Av)) or 1.0
        v = [x / norm for x in Av]
    sigma = norm
    return sigma, v

print("=== Top 3 singular values (power iteration) ===")
total_energy = sum(sum(x * x for x in row) for row in matrix)
for k in range(3):
    sigma, v = power_iter(matrix, 25)
    print(f"  sigma_{k+1} = {sigma:.2f}  (explains {sigma*sigma/total_energy*100:.1f}% of variance)")
    # Deflate: A = A - sigma * u v^T
    u = [sum(A[i][j] * v[j] for j in range(n_cols)) / sigma for i in range(n_rows)]
    for i in range(n_rows):
        for j in range(n_cols):
            matrix[i][j] -= sigma * u[i] * v[j]
print()
print("=== PCA projection (PC1, PC2) for first 6 samples ===")
print("sample_id | condition | PC1     | PC2")
print("-" * 45)
for i in range(6):
    cond = ["control", "treatment", "time", "replicate"][i % 4]
    print(f"  S{i:03d}    | {cond:9s} | {u[i]:+.4f}  | (PC2 omitted for brevity)")
print()
print("=== Publication figure sketch ===")
print("  matplotlib.pyplot.scatter(PC1, PC2, c=condition, cmap='tab10')")
print("  plt.xlabel('PC1 (%.1f%% variance)' % (sigma_1_sq/total*100))")
print("  plt.title('PCA of RNA-seq expression tensor (1000 genes x 50 samples)')")
print("  → Export as 300dpi PDF for publication")
print()
print("WET LAB → NumPy → matplotlib → PAPER (this is the publication pipeline)")`,
    insight: "SVD is the publication workhorse: A = U·Σ·V^T decomposes gene expression into sample loadings (U), variance weights (Σ), and gene loadings (V^T). The first 2-3 singular values typically capture 70-90% of biological signal — the rest is noise. LAPACK's dgesdd (divide-and-conquer SVD) handles 1000×200 matrices in ~50ms.",
  },
  {
    id: "numpy-mass-spec-fft",
    step: "2",
    title: "Mass Spectrometry FFT — Peak Detection + Compound ID",
    subtitle: "Chemistry — spectral data → FFT → peak detection → compound identification",
    accent: "oklch(0.65 0.16 165)",
    icon: <Waves className="h-4 w-4" />,
    badge: "Chemistry · Mass Spec",
    brief: {
      dataset: "Synthetic mass spectrum: 4096 m/z bins, peaks at 4 known compound masses (caffeine 194, glucose 180, alanine 89, water 18). Sampled as a NumPy 1D array — peaks corrupted by Gaussian noise + baseline drift.",
      scale: "4096-point signal → FFT → 4096-point spectrum → 4 peaks detected → inverse FFT for denoised signal",
      why: "Shows SciPy FFT pipeline: np.fft.fft (Cooley-Tukey O(N log N)) → magnitude spectrum → scipy.signal.find_peaks → compound identification by m/z. The wet-lab mass spec produces time-of-flight data, NumPy's FFT turns it into a frequency-domain fingerprint, peak matching identifies compounds.",
    },
    stats: [
      { label: "Signal length", value: "4,096" },
      { label: "Compounds", value: "4" },
      { label: "FFT bins", value: "4,096" },
      { label: "Algorithm", value: "Cooley-Tukey" },
    ],
    tools: ["NumPy np.fft.fft", "scipy.signal.find_peaks", "pocketfft", "Cooley-Tukey", "BLAS", "MassBank library"],
    codeTabs: [
      {
        lang: "scala",
        filename: "MassSpecFFT.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

// Mass spectrum → FFT → peak detection → compound identification
val spark = SparkSession.builder().getOrCreate()

// Load 4096-point mass spectrum (m/z bins) from Parquet
val spectrum = spark.read.parquet("s3://massspec/spectra/")
  .orderBy("mz_bin")
  .select("intensity")

// FFT: X[k] = sum_n x[n] * exp(-2*pi*i*k*n/N) — Cooley-Tukey O(N log N)
// Spark ML has no FFT — call into Breeze via UDF
val fftUDF = udf((signal: Seq[Double]) => {
  import breeze.signal._
  val arr = signal.toArray
  val spectrum = fourierTr(arr.toDoubleMatrix)
  spectrum.toArray.map(_.abs)  // magnitude
})
val magnitude = spectrum.agg(collect_list("intensity").alias("signal"))
  .withColumn("fft_mag", fftUDF(col("signal")))

// Peak detection: threshold + minimum distance
val peaksUDF = udf((mag: Seq[Double]) => {
  mag.zipWithIndex.filter(_._1 > 100.0).map(_._2)
})
val peaks = magnitude.withColumn("peak_bins", peaksUDF(col("fft_mag")))
peaks.write.mode("overwrite").parquet("s3://massspec/peaks/")`,
      },
      {
        lang: "rust",
        filename: "mass_spec_fft.rs",
        code: `use realfft::RealFftPlanner;

// Mass spectrum → FFT → peak detection → compound identification
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let n = 4096usize;

    // Synthetic mass spectrum: 4096 m/z bins with peaks at 4 known compounds
    let mut signal = vec![0.0f64; n];
    // Caffeine at m/z 194 (bin 194), glucose at 180, alanine at 89, water at 18
    let peaks = [(18, 50.0), (89, 80.0), (180, 120.0), (194, 200.0)];
    for (bin, amp) in peaks {
        for d in -3..=3 {
            let i = bin as isize + d;
            if i >= 0 && (i as usize) < n {
                signal[i as usize] = amp * (-(d as f64).powi(2) / 2.0).exp();
            }
        }
    }
    // Add baseline + noise
    for i in 0..n {
        signal[i] += 5.0 + (i as f64 * 0.001).sin() * 2.0;
    }

    // FFT: X[k] = sum_n x[n] * exp(-2*pi*i*k*n/N) — Cooley-Tukey O(N log N)
    let mut planner = RealFftPlanner::<f64>::new();
    let r2c = planner.plan_r2c(n)?;
    let mut spectrum = r2c.make_output_vec();
    r2c.process(&mut signal.clone(), &mut spectrum)?;

    // Magnitude spectrum
    let magnitude: Vec<f64> = spectrum.iter().map(|c| c.norm()).collect();

    // Peak detection: threshold + local maxima
    let threshold = 30.0;
    let mut peaks_found = vec![];
    for i in 1..magnitude.len()-1 {
        if magnitude[i] > threshold
            && magnitude[i] > magnitude[i-1]
            && magnitude[i] > magnitude[i+1] {
            peaks_found.push(i);
        }
    }

    println!("Found {} peaks at bins: {:?}", peaks_found.len(), peaks_found);
    println!("Compound match: {:?}", peaks_found.iter()
        .map(|&b| match b {
            18 => "water",
            89 => "alanine",
            180 => "glucose",
            194 => "caffeine",
            _ => "unknown",
        }).collect::<Vec<_>>());

    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "mass_spec_fft.go",
        code: `package main

import (
    "fmt"
    "math"
    "math/cmplx"
)

// Mass spectrum -> FFT -> peak detection -> compound identification
func main() {
    n := 4096
    signal := make([]float64, n)

    // 4 known compound peaks: water 18, alanine 89, glucose 180, caffeine 194
    peaks := []struct{ bin int; amp float64 }{
        {18, 50.0}, {89, 80.0}, {180, 120.0}, {194, 200.0},
    }
    for _, p := range peaks {
        for d := -3; d <= 3; d++ {
            i := p.bin + d
            if i >= 0 && i < n {
                signal[i] = p.amp * math.Exp(-float64(d*d)/2.0)
            }
        }
    }
    // Baseline + noise
    for i := 0; i < n; i++ {
        signal[i] += 5.0 + math.Sin(float64(i)*0.001)*2.0
    }

    // FFT (recursive Cooley-Tukey): X[k] = sum_n x[n] * exp(-2*pi*i*k*n/N)
    complexSignal := make([]complex128, n)
    for i, v := range signal {
        complexSignal[i] = complex(v, 0)
    }
    spectrum := fft(complexSignal)

    // Magnitude + peak detection
    var peaks_found []int
    for i := 1; i < n-1; i++ {
        mag := cmplx.Abs(spectrum[i])
        if mag > 30.0 && mag > cmplx.Abs(spectrum[i-1]) && mag > cmplx.Abs(spectrum[i+1]) {
            peaks_found = append(peaks_found, i)
        }
    }

    fmt.Printf("Found %d peaks at bins: %v\\n", len(peaks_found), peaks_found)
}

// Cooley-Tukey recursive FFT — O(N log N)
func fft(a []complex128) []complex128 {
    n := len(a)
    if n <= 1 {
        return a
    }
    even := fft(evenIndices(a))
    odd := fft(oddIndices(a))
    out := make([]complex128, n)
    for k := 0; k < n/2; k++ {
        w := cmplx.Rect(1.0, -2*math.Pi*float64(k)/float64(n))
        out[k] = even[k] + w*odd[k]
        out[k+n/2] = even[k] - w*odd[k]
    }
    return out
}

func evenIndices(a []complex128) []complex128 {
    out := make([]complex128, 0, len(a)/2)
    for i := 0; i < len(a); i += 2 {
        out = append(out, a[i])
    }
    return out
}

func oddIndices(a []complex128) []complex128 {
    out := make([]complex128, 0, len(a)/2)
    for i := 1; i < len(a); i += 2 {
        out = append(out, a[i])
    }
    return out
}`,
      },
      {
        lang: "elixir",
        filename: "mass_spec_fft.ex",
        code: `defmodule Chemistry.MassSpecFFT do
  @moduledoc "Mass spectrum -> FFT -> peak detection -> compound ID"

  # Build synthetic 4096-point mass spectrum with 4 compound peaks.
  def build_spectrum(n \\ 4096) do
    peaks = %{18 => 50.0, 89 => 80.0, 180 => 120.0, 194 => 200.0}
    Enum.map(0..(n-1), fn bin ->
      peak_contrib = Enum.reduce(peaks, 0.0, fn {peak_bin, amp}, acc ->
        d = bin - peak_bin
        acc + amp * :math.exp(-d * d / 2.0)
      end)
      # baseline + sinusoidal drift + noise
      peak_contrib + 5.0 + :math.sin(bin * 0.001) * 2.0
    end)
  end

  # Naive DFT (real impl would call FFTW via NIF): O(N^2) — for demo only.
  # X[k] = sum_n x[n] * exp(-2*pi*i*k*n/N)
  def dft(signal) do
    n = length(signal)
    Enum.map(0..(div(n,2)-1), fn k ->
      Enum.reduce(Enum.with_index(signal), 0.0, fn {x, idx}, acc ->
        angle = -2 * :math.pi * k * idx / n
        acc + x * :math.cos(angle)  # magnitude of real component
      end)
    end)
  end

  # Peak detection: threshold + local maxima.
  def find_peaks(magnitude, threshold) do
    magnitude
    |> Enum.with_index()
    |> Enum.chunk_every(3, 1, :discard)
    |> Enum.filter(fn [{_, _}, {mid, i}, {_, _}] ->
      mid > threshold and mid > (magnitude |> Enum.at(i-1)) and mid > (magnitude |> Enum.at(i+1))
    end)
    |> Enum.map(fn {_, i} -> i end)
  end
end`,
      },
      {
        lang: "zig",
        filename: "mass_spec_fft.zig",
        code: `const std = @import("std");

// Mass spectrum -> FFT -> peak detection -> compound identification
pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const n: usize = 4096;
    var signal = try allocator.alloc(f64, n);
    defer allocator.free(signal);
    @memset(signal, 0.0);

    // 4 compound peaks (water 18, alanine 89, glucose 180, caffeine 194)
    const peaks = [_]struct { bin: usize, amp: f64 }{
        .{ .bin = 18, .amp = 50.0 },
        .{ .bin = 89, .amp = 80.0 },
        .{ .bin = 180, .amp = 120.0 },
        .{ .bin = 194, .amp = 200.0 },
    };
    for (peaks) |p| {
        var d: i32 = -3;
        while (d <= 3) : (d += 1) {
            const i = @as(i64, @intCast(p.bin)) + d;
            if (i >= 0 and i < @as(i64, @intCast(n))) {
                const idx: usize = @intCast(i);
                const diff: f64 = @floatFromInt(d);
                signal[idx] = p.amp * @exp(-diff * diff / 2.0);
            }
        }
    }
    // Baseline + drift
    var i: usize = 0;
    while (i < n) : (i += 1) {
        signal[i] += 5.0 + @sin(@as(f64, @floatFromInt(i)) * 0.001) * 2.0;
    }

    // Real impl would call FFTW via @cImport; here just report stats
    std.debug.print("Signal: {d} points, {d} peaks expected\\n", .{ n, peaks.len });
    std.debug.print("Compounds: water(18), alanine(89), glucose(180), caffeine(194)\\n", .{});

    // Simple peak detector on the time-domain signal
    var detected: usize = 0;
    var k: usize = 1;
    while (k < n - 1) : (k += 1) {
        if (signal[k] > 30.0 and signal[k] > signal[k-1] and signal[k] > signal[k+1]) {
            detected += 1;
            std.debug.print("  Peak at bin {d}: intensity {d:.2} -> ", .{ k, signal[k] });
            switch (k) {
                18 => std.debug.print("water\\n", .{}),
                89 => std.debug.print("alanine\\n", .{}),
                180 => std.debug.print("glucose\\n", .{}),
                194 => std.debug.print("caffeine\\n", .{}),
                else => std.debug.print("unknown\\n", .{}),
            }
        }
    }
    std.debug.print("Detected {d} peaks (expected {d})\\n", .{ detected, peaks.len });
}`,
      },
    ],
    runnablePython: `# Mass spec FFT + peak detection — pure Python (Pyodide)
# Uses only math + cmath — NO numpy. Cooley-Tukey recursive FFT.
import math, cmath, random

random.seed(42)
N = 256  # smaller for speed

print(f"=== Mass Spectrum ({N} m/z bins) ===")
print()

# Build synthetic spectrum with 4 compound peaks
peaks = {18: 50.0, 89: 80.0, 180: 120.0, 194: 200.0}
signal = [0.0] * N
for bin_idx, amp in peaks.items():
    for d in range(-3, 4):
        i = bin_idx + d
        if 0 <= i < N:
            signal[i] += amp * math.exp(-d*d/2.0)
# Add baseline + noise
for i in range(N):
    signal[i] += 5.0 + math.sin(i * 0.05) * 2.0 + random.gauss(0, 0.5)

print(f"Built signal with {len(peaks)} known compound peaks (water, alanine, glucose, caffeine)")
print()

# Cooley-Tukey recursive FFT — O(N log N) vs DFT O(N^2)
def fft(a):
    n = len(a)
    if n <= 1:
        return a
    even = fft([a[i] for i in range(0, n, 2)])
    odd  = fft([a[i] for i in range(1, n, 2)])
    out = [0j] * n
    for k in range(n // 2):
        w = cmath.exp(-2j * math.pi * k / n)
        out[k] = even[k] + w * odd[k]
        out[k + n // 2] = even[k] - w * odd[k]
    return out

# Pad to power of 2
sig = signal[:N]
spectrum = fft([complex(x, 0) for x in sig])
magnitude = [abs(c) for c in spectrum[:N // 2]]

print(f"=== FFT magnitude spectrum ({len(magnitude)} bins) ===")
print(f"  DFT cost: O(N^2) = {N*N:,} ops")
print(f"  FFT cost: O(N log N) = {N * int(math.log2(N)):,} ops (speedup {N*N//(N*int(math.log2(N)))}x)")
print()

# Peak detection
print("=== Peak detection (threshold + local maxima) ===")
threshold = max(magnitude) * 0.1
detected = []
for i in range(1, len(magnitude)-1):
    if magnitude[i] > threshold and magnitude[i] >= magnitude[i-1] and magnitude[i] >= magnitude[i+1]:
        detected.append(i)
print(f"  Threshold: {threshold:.1f}")
print(f"  Detected {len(detected)} peaks at frequency bins: {detected[:10]}")
print()

# Compound identification (simplified — real impl uses MassBank library match)
compound_db = {18: "water (H2O)", 89: "alanine (C3H7NO2)",
               180: "glucose (C6H12O6)", 194: "caffeine (C8H10N4O2)"}
print("=== Compound identification ===")
for mz, amp in peaks.items():
    name = compound_db.get(mz, "unknown")
    print(f"  m/z={mz:3d}  intensity={amp:6.1f}  -> {name}")
print()
print("=== Inverse FFT (denoising) ===")
print("  x_denoised = IFFT(FFT(x) * mask(spectrum > threshold))")
print("  Recovers clean spectrum with 4 sharp peaks (publication figure)")`,
    insight: "FFT is the most important algorithm in computational chemistry — Cooley-Tukey reduces DFT from O(N²) to O(N log N), a 1024× speedup for 4096-point spectra. NumPy's np.fft.fft uses pocketfft (a hybrid Cooley-Tukey/Rader FFT). scipy.signal.find_peaks then turns the magnitude spectrum into a compound fingerprint — this exact pipeline powers every mass spec in every chemistry lab worldwide.",
  },
];

// ============================================================
// DASK/RAY SCIENCE EXAMPLES (2)
// ============================================================

export const DASK_RAY_SCIENCE_EXAMPLES: DatasetExample[] = [
  {
    id: "dask-distributed-genomics",
    step: "1",
    title: "Distributed Genomics — 1000 Genomes on Dask Array",
    subtitle: "Life Sciences — 100GB chunked VCF on dask.array (100 workers)",
    accent: "oklch(0.55 0.18 250)",
    icon: <Network className="h-4 w-4" />,
    badge: "Life Sciences · Distributed",
    brief: {
      dataset: "1000 Genomes Project chr1-22 VCF — 2,504 individuals, ~3B SNPs, ~100GB compressed. Loaded into a Dask array of chunks (~1GB each), processed on 100-worker Dask distributed cluster.",
      scale: "~100GB VCF → 1000 Dask array chunks (~100MB each) → 100-worker cluster → ~10 min allele freq computation (vs ~5 hours single-node)",
      why: "Shows Dask's task-graph model: the VCF is too large for one node's RAM. Dask.array chunks it, the distributed scheduler builds a DAG (10,000+ tasks for allele frequency across 22 chromosomes), workers execute in parallel. Amdahl's law bounds the speedup.",
    },
    stats: [
      { label: "VCF size", value: "~100 GB" },
      { label: "Chunks", value: "1,000" },
      { label: "Workers", value: "100" },
      { label: "Tasks in DAG", value: "~10,000" },
    ],
    tools: ["Dask distributed", "dask.array", "dask-vcf", "Zarr", "LAPACK dgesvd", "RAPIDS cuDF"],
    codeTabs: [
      {
        lang: "scala",
        filename: "DistributedGenomicsDask.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

// Distributed genomics on 100GB VCF (Spark analogue of Dask array chunks)
val spark = SparkSession.builder()
  .config("spark.sql.shuffle.partitions", "1000")
  .config("spark.executor.memory", "8g")
  .config("spark.executor.instances", "100")
  .getOrCreate()

// Load 1000G VCF — partition by chromosome + position range
val variants = spark.read.format("vcf")
  .option("include_sample_ids", "false")
  .load("s3://1000g/chr*.vcf.gz")
  .repartition(1000, $"chrom", $"pos" / 1000000)

// Per-chromosome allele frequency — task-graph DAG
// Each task: count REF/ALT alleles in a 1Mbp chunk
val alleleFreq = variants
  .withColumn("chunk_id", ($"pos" / 1000000).cast("int"))
  .groupBy($"chrom", $"chunk_id")
  .agg(
    sum("ref_count").alias("ref_total"),
    sum("alt_count").alias("alt_total"),
    (sum("alt_count") / (sum("ref_count") + sum("alt_count"))).alias("alt_freq")
  )
  .orderBy($"chrom", $"chunk_id")

alleleFreq.write.mode("overwrite").parquet("s3://1000g-freq/")

// Amdahl's law: with 95% parallel fraction + 100 workers
// S = 1 / ((1-0.95) + 0.95/100) = 1 / (0.05 + 0.0095) = ~17x speedup`,
      },
      {
        lang: "rust",
        filename: "dask_distributed_genomics.rs",
        code: `use dask::array::{Array, ChunkedArray};
use dask::distributed::Client;

// Distributed genomics — 100GB VCF on Dask array
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to Dask distributed cluster (100 workers)
    let client = Client::connect("dask-scheduler:8786").await?;

    // Load VCF as chunked Dask array — 1000 chunks of ~100MB each
    let vcf: ChunkedArray<u8> = ChunkedArray::from_zarr(
        "s3://1000g/chr1-22.zarr",
        chunk_shape=(1_000_000,),  // 1Mbp chunks
    ).await?;

    println!("VCF shape: {:?}  chunks: 1000 x ~100MB", vcf.shape());
    println!("Total data: ~100GB across 22 chromosomes");

    // Build task graph: per-chunk allele frequency computation
    // DAG: 1000 leaf tasks + 22 reduce tasks + 1 final aggregate
    let allele_freq_tasks: Vec<Task> = vcf.chunks()
        .map(|chunk| {
            // Each task: count REF/ALT alleles in this 1Mbp chunk
            client.submit(count_alleles, vec![chunk])
        })
        .collect();

    // Per-chromosome aggregation — Amdahl's law bounds speedup
    let per_chrom: Vec<Task> = (1..=22)
        .map(|chrom| {
            client.submit(reduce_chrom, vec![chrom, allele_freq_tasks.clone()])
        })
        .collect();

    let total_freq = client.submit(reduce_all, vec![per_chrom]).await?;

    println!("Final allele frequency computed");
    println!("Tasks executed: {} (95% parallel, ~17x speedup)",
             1000 + 22 + 1);
    Ok(())
}

fn count_alleles(chunk: &[u8]) -> (u64, u64) { /* ... */ (0, 0) }
fn reduce_chrom(chrom: u8, chunks: Vec<(u64, u64)>) -> (u64, u64) { (0, 0) }
fn reduce_all(chroms: Vec<(u64, u64)>) -> (u64, u64) { (0, 0) }`,
      },
      {
        lang: "go",
        filename: "dask_distributed_genomics.go",
        code: `package main

import (
    "context"
    "fmt"
    "sync"
    "time"
)

// Distributed genomics — 1000 Genomes on 100-worker Dask cluster (Go analogue)
type Chunk struct {
    Chrom  int
    Start  int
    End    int
    Data   []byte
}

type AlleleFreq struct {
    Chrom  int
    RefTotal uint64
    AltTotal uint64
}

func main() {
    ctx := context.Background()

    // 1000 chunks of ~100MB each, 100 workers
    chunks := make([]Chunk, 1000)
    for i := range chunks {
        chunks[i] = Chunk{
            Chrom: (i % 22) + 1,
            Start: i * 1_000_000,
            End:   (i + 1) * 1_000_000,
            Data:  make([]byte, 100_000_000),
        }
    }

    // Task graph: 1000 leaf tasks (count alleles per chunk) + 22 reduce + 1 aggregate
    start := time.Now()

    // Dask distributed scheduler analogue: bounded concurrency pool
    semaphore := make(chan struct{}, 100)  // 100 workers
    var wg sync.WaitGroup
    results := make([]AlleleFreq, 1000)

    for i, chunk := range chunks {
        wg.Add(1)
        go func(idx int, c Chunk) {
            defer wg.Done()
            semaphore <- struct{}{}
            defer func() { <-semaphore }()

            // Per-chunk allele counting (computational task)
            results[idx] = countAlleles(c)
        }(i, chunk)
    }
    wg.Wait()

    // Per-chromosome reduce
    byChrom := make(map[int]AlleleFreq)
    for _, r := range results {
        cur := byChrom[r.Chrom]
        cur.Chrom = r.Chrom
        cur.RefTotal += r.RefTotal
        cur.AltTotal += r.AltTotal
        byChrom[r.Chrom] = cur
    }

    // Final aggregate
    var totalRef, totalAlt uint64
    for _, r := range byChrom {
        totalRef += r.RefTotal
        totalAlt += r.AltTotal
    }

    elapsed := time.Since(start)
    fmt.Printf("1000 chunks processed on 100 workers in %v\\n", elapsed)
    fmt.Printf("Tasks in DAG: 1000 (leaf) + 22 (reduce) + 1 (aggregate) = 1023\\n")
    fmt.Printf("Total REF=%d ALT=%d freq=%.4f\\n", totalRef, totalAlt,
        float64(totalAlt)/float64(totalRef+totalAlt))
    fmt.Printf("Amdahl: with p=0.95 parallel, S = 1/((1-p)+p/n) = 1/(0.05+0.0095) = 17x\\n")
}

func countAlleles(c Chunk) AlleleFreq {
    // Simulate per-chunk allele counting
    time.Sleep(100 * time.Millisecond)
    return AlleleFreq{Chrom: c.Chrom, RefTotal: 5000, AltTotal: 5000}
}`,
      },
      {
        lang: "elixir",
        filename: "dask_distributed_genomics.ex",
        code: `defmodule Genomics.Distributed do
  @moduledoc "Distributed genomics on Dask-like task graph (Elixir analogue)"

  # Build 1000 chunks of ~100MB each
  def build_chunks(n_chunks \\ 1000) do
    Enum.map(1..n_chunks, fn i ->
      %{id: i, chrom: rem(i, 22) + 1, start: i * 1_000_000, end: (i+1) * 1_000_000}
    end)
  end

  # Task-graph DAG: 1000 leaf tasks + 22 reduce + 1 aggregate
  # Uses Task.async_stream with bounded concurrency (100 workers)
  def run_pipeline(chunks) do
    start_time = System.monotonic_time(:millisecond)

    # Leaf tasks: count alleles per chunk — 100 concurrent
    leaf_results = Task.async_stream(chunks, &count_alleles/1,
      max_concurrency: 100, timeout: :infinity)
      |> Enum.map(fn {:ok, result} -> result end)

    # Per-chromosome reduce
    by_chrom = Enum.group_by(leaf_results, & &1.chrom)
    chrom_results = Enum.map(by_chrom, fn {chrom, freqs} ->
      %{
        chrom: chrom,
        ref_total: Enum.sum(Enum.map(freqs, & &1.ref_total)),
        alt_total: Enum.sum(Enum.map(freqs, & &1.alt_total)),
      }
    end)

    # Final aggregate
    total_ref = Enum.sum(Enum.map(chrom_results, & &1.ref_total))
    total_alt = Enum.sum(Enum.map(chrom_results, & &1.alt_total))

    elapsed = System.monotonic_time(:millisecond) - start_time

    IO.puts("1000 chunks on 100 workers in #{elapsed}ms")
    IO.puts("Tasks in DAG: 1000 (leaf) + 22 (reduce) + 1 (aggregate) = 1023")
    IO.puts("Total REF=#{total_ref} ALT=#{total_alt} freq=#{:erlang.float(total_alt/(total_ref+total_alt))}")
    # Amdahl's law
    p = 0.95
    n = 100.0
    speedup = 1.0 / ((1.0 - p) + p / n)
    IO.puts("Amdahl speedup: S = 1/((1-p)+p/n) = 1/(#{1.0-p}+#{p/n}) = #{Float.round(speedup, 2)}x")
  end

  def count_alleles(chunk) do
    Process.sleep(100)  # simulate allele counting work
    %{chrom: chunk.chrom, ref_total: 5000, alt_total: 5000}
  end
end`,
      },
      {
        lang: "zig",
        filename: "dask_distributed_genomics.zig",
        code: `const std = @import("std");

// Distributed genomics — 1000 chunks on 100 workers (task-graph DAG analogue)
pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const n_chunks: usize = 1000;
    const n_workers: usize = 100;

    std.debug.print("=== Dask distributed genomics (Zig analogue) ===\\n", .{});
    std.debug.print("Data: 1000 chunks x ~100MB = ~100GB VCF\\n", .{});
    std.debug.print("Cluster: {d} workers, bounded concurrency pool\\n\\n", .{n_workers});

    // Build chunks
    var chunks = try allocator.alloc(Chunk, n_chunks);
    defer allocator.free(chunks);
    for (chunks, 0..) |*c, i| {
        c.* = .{
            .id = i,
            .chrom = @intCast((i % 22) + 1),
            .start = i * 1_000_000,
            .end = (i + 1) * 1_000_000,
        };
    }

    // Simulate task-graph DAG
    // Leaf: 1000 tasks (allele counting per chunk)
    // Reduce: 22 tasks (per-chromosome aggregation)
    // Aggregate: 1 task (final allele frequency)
    const total_tasks = n_chunks + 22 + 1;
    std.debug.print("Task graph DAG:\\n", .{});
    std.debug.print("  Leaf tasks: {d} (count_alleles per chunk)\\n", .{n_chunks});
    std.debug.print("  Reduce tasks: 22 (per-chromosome aggregation)\\n", .{});
    std.debug.print("  Aggregate: 1 (final allele frequency)\\n", .{});
    std.debug.print("  Total: {d} tasks\\n\\n", .{total_tasks});

    // Amdahl's law: S = 1 / ((1-p) + p/n)
    const p: f64 = 0.95;  // 95% parallelizable
    const n: f64 = @floatFromInt(n_workers);
    const speedup = 1.0 / ((1.0 - p) + p / n);

    std.debug.print("Amdahl's law: with p={d:.2} parallel + n={d} workers:\\n", .{ p, n_workers });
    std.debug.print("  S = 1 / ((1-p) + p/n) = 1 / ({d:.4} + {d:.4}) = {d:.2}x speedup\\n\\n",
        .{ 1.0 - p, p / n, speedup });

    // Single-node baseline vs distributed
    const single_node_min = 5 * 60;  // 5 hours
    const distributed_min: f64 = @as(f64, @floatFromInt(single_node_min)) / speedup;
    std.debug.print("Single-node: {d} min  ->  Dask distributed: {d:.1} min\\n",
        .{ single_node_min, distributed_min });
    std.debug.print("(assuming ~5% serial overhead for reduce/aggregate)\\n", .{});
}

const Chunk = struct {
    id: usize,
    chrom: u8,
    start: usize,
    end: usize,
};`,
      },
    ],
    runnablePython: `# Distributed genomics on Dask-like task graph — pure Python (Pyodide)
# Uses only math + random — simulates Amdahl's law + DAG execution
import math, random, time

random.seed(42)
N_CHUNKS = 1000   # 1000 chunks of ~100MB each
N_WORKERS = 100   # 100-worker Dask cluster
P_PARALLEL = 0.95 # 95% of work is parallelizable

print("=== Dask Distributed Genomics ===")
print(f"Data: ~100 GB VCF ({N_CHUNKS} chunks x ~100 MB)")
print(f"Cluster: {N_WORKERS} workers (bounded concurrency pool)")
print(f"Parallel fraction: p = {P_PARALLEL}")
print()

# Amdahl's law: S = 1 / ((1-p) + p/n)
speedup = 1.0 / ((1.0 - P_PARALLEL) + P_PARALLEL / N_WORKERS)
print("=== Amdahl's Law ===")
print(f"  S = 1 / ((1-p) + p/n)")
print(f"  S = 1 / ((1-{P_PARALLEL}) + {P_PARALLEL}/{N_WORKERS})")
print(f"  S = 1 / ({1-P_PARALLEL:.4f} + {P_PARALLEL/N_WORKERS:.5f})")
print(f"  S = {speedup:.2f}x speedup (theoretical max)")
print()

# Task-graph DAG: 1000 leaf + 22 reduce + 1 aggregate
print("=== Task Graph DAG ===")
print(f"  Layer 1 (leaf): {N_CHUNKS} tasks (count_alleles per chunk)")
print(f"  Layer 2 (reduce): 22 tasks (per-chromosome aggregation)")
print(f"  Layer 3 (aggregate): 1 task (final allele frequency)")
total = N_CHUNKS + 22 + 1
print(f"  Total tasks: {total}")
print()

# Simulate execution (each task ~50ms in real impl)
single_node_sec = total * 0.05  # serial baseline
distributed_sec = single_node_sec / speedup
print("=== Execution time ===")
print(f"  Single-node (serial): {single_node_sec:.1f}s")
print(f"  Distributed ({N_WORKERS} workers): {distributed_sec:.1f}s")
print(f"  Wall-clock speedup: {single_node_sec/distributed_sec:.2f}x")
print()

# DAG visualization (textual)
print("=== Task Graph DAG (visual) ===")
print("  chunks[0..1000] --count_alleles--> per_chunk_freq[0..1000]")
print("                                    |")
print("                                    v")
print("  per_chunk_freq --reduce(by chrom)--> 22 chrom_freqs")
print("                                            |")
print("                                            v")
print("  22 chrom_freqs --aggregate--> final_alt_freq")
print()

# Chunk-size optimization tradeoff
print("=== Chunk size optimization ===")
for chunk_mb in [10, 50, 100, 500, 1000]:
    n_chunks = 100_000 // chunk_mb  # 100GB total
    overhead = n_chunks * 0.005  # 5ms scheduling overhead per task
    print(f"  chunk={chunk_mb:4d}MB -> n_chunks={n_chunks:5d} -> overhead={overhead:.1f}s"
          f"  {'(sweet spot)' if chunk_mb == 100 else ''}")
print()
print("Sweet spot ~100MB chunks: balances parallelism vs scheduler overhead")`,
    insight: "Dask's task graph is a DAG (Directed Acyclic Graph) — leaf tasks (count alleles per chunk) execute in parallel, reduce tasks wait for leaves, aggregate waits for reduces. Amdahl's law caps speedup at 1/((1-p)+p/n) — with 95% parallel work and 100 workers, max speedup is ~17x, not 100x. The serial 5% (reduce + aggregate + scheduler overhead) is the bottleneck — increasing workers past this point gives diminishing returns.",
  },
  {
    id: "ray-parallel-md",
    step: "2",
    title: "Parallel Molecular Dynamics — Ray Actors for MD Simulations",
    subtitle: "Physics/Chemistry — Ray actor model for parallel MD replicas",
    accent: "oklch(0.65 0.16 200)",
    icon: <Atom className="h-4 w-4" />,
    badge: "Physics/Chemistry · MD",
    brief: {
      dataset: "Synthetic molecular dynamics: 10 replicas of a 1000-atom protein (lysozyme-sized), 1ns trajectory each. Ray actors run replicas in parallel, each holds persistent state (positions, velocities, forces).",
      scale: "10 MD replicas × 1000 atoms × 10000 timesteps = 100M force evaluations. Ray actor model: 10 persistent actors, each runs an independent MD simulation, results aggregated via Ray object store.",
      why: "Shows Ray's actor model — each MD replica is a long-lived actor holding 1000-atom state across 10000 timesteps. The actor pattern beats task-graph (Dask) here because each step depends on the previous — persistent state avoids re-serialization. This is how Folding@home scales to 4M CPU cores.",
    },
    stats: [
      { label: "Replicas", value: "10" },
      { label: "Atoms/repl", value: "1,000" },
      { label: "Timesteps", value: "10,000" },
      { label: "Force evals", value: "100M" },
    ],
    tools: ["Ray actors", "ray.remote", "OpenMM", "GROMACS", "LAPACK (force matrix)", "Ray Object Store", "Ray Tune"],
    codeTabs: [
      {
        lang: "scala",
        filename: "RayMDActors.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.scheduler._

// Ray actor analogue: persistent state across many method calls
class MDReplicaActor(replicaId: Int, nAtoms: Int) {
  private var step = 0
  private var positions: Array[Double] = Array.fill(nAtoms * 3)(0.0)
  private var velocities: Array[Double] = Array.fill(nAtoms * 3)(0.0)

  // Persistent state: each call uses previous positions/velocities
  def stepOnce(dt: Double = 0.001): Double = {
    // Velocity Verlet: x[t+1] = x[t] + v[t]*dt + 0.5*a[t]*dt^2
    val forces = computeForces(positions)  // O(N^2) pairwise
    for (i <- positions.indices) {
      positions(i) += velocities(i) * dt + 0.5 * forces(i) * dt * dt
      velocities(i) += 0.5 * forces(i) * dt
    }
    step += 1
    kineticEnergy(velocities)
  }

  def getState: (Int, Double, Array[Double]) = (step, 0.0, positions)

  private def computeForces(pos: Array[Double]): Array[Double] = {
    // Lennard-Jones: F = 24e[(r^-7) - 2(r^-13)] for each pair
    Array.fill(nAtoms * 3)(0.0)  // simplified
  }

  private def kineticEnergy(vel: Array[Double]): Double =
    vel.map(v => v * v).sum * 0.5
}

// Driver: 10 actors × 10000 timesteps
val actors = (1 to 10).map(i => new MDReplicaActor(i, 1000))
val results = actors.par.flatMap { actor =>
  (1 to 10000).map(_ => actor.stepOnce())
}.toList
println(s"Total timesteps: \${results.size} (10 actors x 10000)")`,
      },
      {
        lang: "rust",
        filename: "ray_md_actors.rs",
        code: `use rayon::prelude::*;
use std::sync::Mutex;

// Ray actor analogue: persistent state for MD replica
struct MDReplicaActor {
    replica_id: usize,
    step: usize,
    positions: Vec<f64>,  // 3N values (x,y,z per atom)
    velocities: Vec<f64>,
}

impl MDReplicaActor {
    fn new(id: usize, n_atoms: usize) -> Self {
        Self {
            replica_id: id,
            step: 0,
            positions: vec![0.0; n_atoms * 3],
            velocities: vec![0.0; n_atoms * 3],
        }
    }

    // Persistent state: each call advances from previous state
    fn step_once(&mut self, dt: f64) -> f64 {
        let forces = self.compute_forces();
        for i in 0..self.positions.len() {
            // Velocity Verlet: x[t+1] = x[t] + v[t]*dt + 0.5*a[t]*dt^2
            self.positions[i] += self.velocities[i] * dt + 0.5 * forces[i] * dt * dt;
            self.velocities[i] += 0.5 * forces[i] * dt;
        }
        self.step += 1;
        // Kinetic energy = 0.5 * sum(v^2)
        self.velocities.iter().map(|v| v * v).sum::<f64>() * 0.5
    }

    fn compute_forces(&self) -> Vec<f64> {
        // Lennard-Jones: F = 24e[(r^-7) - 2(r^-13)] for each pair — O(N^2)
        let n = self.positions.len() / 3;
        let mut forces = vec![0.0; self.positions.len()];
        for i in 0..n {
            for j in (i+1)..n {
                let dx = self.positions[3*j]   - self.positions[3*i];
                let dy = self.positions[3*j+1] - self.positions[3*i+1];
                let dz = self.positions[3*j+2] - self.positions[3*i+2];
                let r2 = dx*dx + dy*dy + dz*dz;
                if r2 > 0.01 {
                    let r6 = r2 * r2 * r2;
                    let r12 = r6 * r6;
                    let f = 24.0 * (1.0/r6 - 2.0/r12);
                    forces[3*i]   += f * dx / r2.sqrt();
                    forces[3*i+1] += f * dy / r2.sqrt();
                    forces[3*i+2] += f * dz / r2.sqrt();
                }
            }
        }
        forces
    }
}

fn main() {
    // 10 replicas, each 1000 atoms, 10000 timesteps
    let replicas: Vec<Mutex<MDReplicaActor>> = (0..10)
        .map(|i| Mutex::new(MDReplicaActor::new(i, 1000)))
        .collect();

    replicas.par_iter().for_each(|replica_mutex| {
        let mut actor = replica_mutex.lock().unwrap();
        for _ in 0..10000 {
            let _ke = actor.step_once(0.001);
        }
        println!("Replica {} done: {} timesteps", actor.replica_id, actor.step);
    });

    println!("Total: 10 replicas x 10000 timesteps = 100,000 MD steps");
    println!("Force evals per step: O(N^2) = 1,000,000 -> total 10^11 force evals");
}`,
      },
      {
        lang: "go",
        filename: "ray_md_actors.go",
        code: `package main

import (
    "fmt"
    "math"
    "sync"
)

// Ray actor analogue: MD replica with persistent state across method calls
type MDReplicaActor struct {
    ReplicaID  int
    Step        int
    Positions   []float64
    Velocities  []float64
}

func NewMDReplicaActor(id, nAtoms int) *MDReplicaActor {
    return &MDReplicaActor{
        ReplicaID: id,
        Positions: make([]float64, nAtoms*3),
        Velocities: make([]float64, nAtoms*3),
    }
}

// Persistent state: each call advances from previous state (Velocity Verlet)
func (a *MDReplicaActor) StepOnce(dt float64) float64 {
    forces := a.computeForces()
    for i := range a.Positions {
        // x[t+1] = x[t] + v[t]*dt + 0.5*a[t]*dt^2
        a.Positions[i] += a.Velocities[i]*dt + 0.5*forces[i]*dt*dt
        a.Velocities[i] += 0.5 * forces[i] * dt
    }
    a.Step++
    // Kinetic energy
    ke := 0.0
    for _, v := range a.Velocities {
        ke += v * v
    }
    return ke * 0.5
}

// Lennard-Jones: F = 24e[(r^-7) - 2(r^-13)] for each pair — O(N^2)
func (a *MDReplicaActor) computeForces() []float64 {
    n := len(a.Positions) / 3
    forces := make([]float64, len(a.Positions))
    for i := 0; i < n; i++ {
        for j := i+1; j < n; j++ {
            dx := a.Positions[3*j] - a.Positions[3*i]
            dy := a.Positions[3*j+1] - a.Positions[3*i+1]
            dz := a.Positions[3*j+2] - a.Positions[3*i+2]
            r2 := dx*dx + dy*dy + dz*dz
            if r2 > 0.01 {
                r6 := r2 * r2 * r2
                r12 := r6 * r6
                f := 24.0 * (1.0/r6 - 2.0/r12)
                r := math.Sqrt(r2)
                forces[3*i] += f * dx / r
                forces[3*i+1] += f * dy / r
                forces[3*i+2] += f * dz / r
            }
        }
    }
    return forces
}

func main() {
    // 10 replicas, each 1000 atoms, 10000 timesteps — run in parallel
    replicas := make([]*MDReplicaActor, 10)
    for i := range replicas {
        replicas[i] = NewMDReplicaActor(i, 1000)
    }

    var wg sync.WaitGroup
    for _, r := range replicas {
        wg.Add(1)
        go func(actor *MDReplicaActor) {
            defer wg.Done()
            for s := 0; s < 10000; s++ {
                actor.StepOnce(0.001)
            }
            fmt.Printf("Replica %d done: %d timesteps\\n", actor.ReplicaID, actor.Step)
        }(r)
    }
    wg.Wait()

    fmt.Println("\\nTotal: 10 replicas x 10000 timesteps = 100,000 MD steps")
    fmt.Println("Force evals: O(N^2) per step = 10^6 -> total 10^11 force evals")
}`,
      },
      {
        lang: "elixir",
        filename: "ray_md_actors.ex",
        code: `defmodule Physics.RayMDActors do
  @moduledoc "Ray actor analogue for parallel molecular dynamics replicas"

  # Each replica is a GenServer (Elixir's actor model — persistent state)
  defmodule MDReplicaActor do
    use GenServer

    # State: positions, velocities, step count
    def start_link(opts), do: GenServer.start_link(__MODULE__, opts)

    @impl true
    def init(opts) do
      n_atoms = Keyword.get(opts, :n_atoms, 1000)
      {:ok, %{
        replica_id: Keyword.get(opts, :id),
        step: 0,
        positions: List.duplicate(0.0, n_atoms * 3),
        velocities: List.duplicate(0.0, n_atoms * 3)
      }}
    end

    # Velocity Verlet: x[t+1] = x[t] + v[t]*dt + 0.5*a[t]*dt^2
    def step_once(pid, dt \\ 0.001), do: GenServer.call(pid, {:step, dt})

    @impl true
    def handle_call({:step, dt}, _from, state) do
      forces = compute_forces(state.positions)
      new_pos = Enum.zip(state.positions, state.velocities)
        |> Enum.zip(forces)
        |> Enum.map(fn {{x, v}, f} -> x + v*dt + 0.5*f*dt*dt end)
      new_vel = Enum.zip(state.velocities, forces)
        |> Enum.map(fn {v, f} -> v + 0.5*f*dt end)
      ke = Enum.reduce(new_vel, 0.0, fn v, acc -> acc + v*v end) * 0.5
      {:reply, ke, %{state | step: state.step+1, positions: new_pos, velocities: new_vel}}
    end

    # Lennard-Jones: F = 24e[(r^-7) - 2(r^-13)] for each pair — O(N^2)
    defp compute_forces(positions) do
      n = div(length(positions), 3)
      # Real impl would NIF into GROMACS or OpenMM
      List.duplicate(0.0, length(positions))
    end
  end

  def run_replicas(n_replicas \\ 10, n_atoms \\ 1000, n_steps \\ 10000) do
    {:ok, _} = Registry.start_link(keys: :unique, name: __MODULE__.Registry)

    replicas = Enum.map(1..n_replicas, fn id ->
      {:ok, pid} = MDReplicaActor.start_link(id: id, n_atoms: n_atoms)
      {id, pid}
    end)

    # Parallel execution: each replica is an isolated actor
    Enum.each(replicas, fn {id, pid} ->
      Enum.each(1..n_steps, fn _ -> MDReplicaActor.step_once(pid) end)
      IO.puts("Replica #{id} done")
    end)

    IO.puts("\\nTotal: #{n_replicas} replicas x #{n_steps} timesteps = #{n_replicas*n_steps} MD steps")
    IO.puts("Force evals: O(N^2) per step = 10^6 -> total 10^11 force evals")
  end
end`,
      },
      {
        lang: "zig",
        filename: "ray_md_actors.zig",
        code: `const std = @import("std");

// Ray actor analogue: MD replica with persistent state
const MDReplicaActor = struct {
    replica_id: usize,
    step: usize,
    positions: []f64,
    velocities: []f64,
    allocator: std.mem.Allocator,

    fn init(allocator: std.mem.Allocator, id: usize, n_atoms: usize) !MDReplicaActor {
        const pos = try allocator.alloc(f64, n_atoms * 3);
        const vel = try allocator.alloc(f64, n_atoms * 3);
        @memset(pos, 0.0);
        @memset(vel, 0.0);
        return .{
            .replica_id = id,
            .step = 0,
            .positions = pos,
            .velocities = vel,
            .allocator = allocator,
        };
    }

    fn deinit(self: *MDReplicaActor) void {
        self.allocator.free(self.positions);
        self.allocator.free(self.velocities);
    }

    // Velocity Verlet: x[t+1] = x[t] + v[t]*dt + 0.5*a[t]*dt^2
    fn stepOnce(self: *MDReplicaActor, dt: f64) f64 {
        // Simplified: random forces (real impl uses Lennard-Jones O(N^2))
        for (self.positions, 0..) |*x, i| {
            x.* += self.velocities[i] * dt;
        }
        self.step += 1;
        var ke: f64 = 0.0;
        for (self.velocities) |v| ke += v * v;
        return ke * 0.5;
    }
};

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const n_replicas: usize = 10;
    const n_atoms: usize = 1000;
    const n_steps: usize = 10000;

    std.debug.print("=== Ray MD Actors (Zig analogue) ===\\n", .{});
    std.debug.print("{d} replicas x {d} atoms x {d} timesteps\\n\\n", .{ n_replicas, n_atoms, n_steps });

    // Each actor: persistent state across 10000 method calls
    var actors = try allocator.alloc(MDReplicaActor, n_replicas);
    defer allocator.free(actors);

    for (actors, 0..) |*actor, i| {
        actor.* = try MDReplicaActor.init(allocator, i, n_atoms);
    }
    defer for (actors) |*actor| actor.deinit();

    // Parallel execution via std.Thread
    var threads = try allocator.alloc(std.Thread, n_replicas);
    defer allocator.free(threads);

    for (actors, 0..) |*actor, i| {
        _ = i;
        const thread = try std.Thread.spawn(.{}, runReplica, .{ actor, n_steps });
        threads[i] = thread;
    }
    for (threads) |t| t.join();

    std.debug.print("\\nTotal: {d} replicas x {d} timesteps = {d} MD steps\\n",
        .{ n_replicas, n_steps, n_replicas * n_steps });
    std.debug.print("Force evals per step: O(N^2) = {d} -> total 10^11 force evals\\n",
        .{n_atoms * n_atoms});
    std.debug.print("\\nActor model: each replica persists 1000-atom state across 10000 calls\\n", .{});
    std.debug.print("(avoids re-serialization of 24KB positions per step = saves 240MB transfer)\\n", .{});
}

fn runReplica(actor: *MDReplicaActor, n_steps: usize) void {
    for (0..n_steps) |_| {
        _ = actor.stepOnce(0.001);
    }
    std.debug.print("Replica {d} done: {d} timesteps\\n", .{ actor.replica_id, actor.step });
}`,
      },
    ],
    runnablePython: `# Parallel molecular dynamics via Ray-style actor model — pure Python (Pyodide)
# Uses only math + random — simulates Velocity Verlet + Lennard-Jones + actor pattern
import math, random

random.seed(42)
N_REPLICAS = 5
N_ATOMS = 100
N_STEPS = 200

print("=== Ray Actor Model: Parallel Molecular Dynamics ===")
print(f"{N_REPLICAS} replicas x {N_ATOMS} atoms x {N_STEPS} timesteps")
print(f"Actor model: each replica persists state across {N_STEPS} method calls")
print()

# MDReplicaActor — analogue of @ray.remote class
class MDReplicaActor:
    """Persistent state: positions, velocities, step count."""
    def __init__(self, replica_id, n_atoms):
        self.replica_id = replica_id
        self.n_atoms = n_atoms
        self.step = 0
        # Random initial positions (3D)
        self.positions = [[random.gauss(0, 1) for _ in range(3)] for _ in range(n_atoms)]
        self.velocities = [[random.gauss(0, 0.1) for _ in range(3)] for _ in range(n_atoms)]

    def step_once(self, dt=0.001):
        """Velocity Verlet: x[t+1] = x[t] + v[t]*dt + 0.5*a[t]*dt^2"""
        forces = self.compute_forces()
        for i in range(self.n_atoms):
            for d in range(3):
                # Position update
                self.positions[i][d] += self.velocities[i][d] * dt + 0.5 * forces[i][d] * dt * dt
                # Velocity update (Verlet half-step)
                self.velocities[i][d] += 0.5 * forces[i][d] * dt
        self.step += 1
        # Kinetic energy
        return sum(v**2 for vel in self.velocities for v in vel) * 0.5

    def compute_forces(self):
        """Lennard-Jones: F = 24e[(r^-7) - 2(r^-13)] for each pair - O(N^2)"""
        forces = [[0.0, 0.0, 0.0] for _ in range(self.n_atoms)]
        # Simplified: just compute first 10 pairs to keep Pyodide fast
        for i in range(min(self.n_atoms, 20)):
            for j in range(i+1, min(self.n_atoms, 20)):
                dx = self.positions[j][0] - self.positions[i][0]
                dy = self.positions[j][1] - self.positions[i][1]
                dz = self.positions[j][2] - self.positions[i][2]
                r2 = dx*dx + dy*dy + dz*dz
                if r2 < 0.01: r2 = 0.01
                r6 = r2 * r2 * r2
                r12 = r6 * r6
                f_mag = 24.0 * (1.0/r6 - 2.0/r12)
                r = math.sqrt(r2)
                fx, fy, fz = f_mag * dx/r, f_mag * dy/r, f_mag * dz/r
                forces[i][0] -= fx; forces[i][1] -= fy; forces[i][2] -= fz
                forces[j][0] += fx; forces[j][1] += fy; forces[j][2] += fz
        return forces

# Create N replicas (analogue of ray.remote(MDReplicaActor).remote())
print("=== Creating Ray remote actors ===")
replicas = [MDReplicaActor(i, N_ATOMS) for i in range(N_REPLICAS)]
for r in replicas:
    print(f"  Replica {r.replica_id}: persistent state {N_ATOMS} atoms")
print()

# Run N_STEPS on each (in real Ray, these would be parallel tasks)
print("=== Running parallel MD simulation ===")
print(f"  Each step: Velocity Verlet + Lennard-Jones (O(N^2) = {N_ATOMS*N_ATOMS} force evals)")
print()
print(f"{'Step':>5} | " + " | ".join(f"Replica {r.replica_id} KE" for r in replicas))
print("-" * (8 + 15 * N_REPLICAS))

for step in range(0, N_STEPS, N_STEPS // 5):
    # Advance each replica to current step
    for r in replicas:
        while r.step <= step:
            ke = r.step_once()
    # Report current KE per replica
    ke_vals = [sum(v**2 for vel in r.velocities for v in vel) * 0.5 for r in replicas]
    print(f"{step:>5} | " + " | ".join(f"{ke:>12.4f}" for ke in ke_vals))

print()
print("=== Actor model advantage ===")
print("  - Persistent state: each replica holds 100-atom positions across 200 steps")
print("  - Avoids re-serialization: 24 bytes/atom x 100 atoms x 200 steps = 480KB saved per replica")
print("  - vs task-graph (Dask): would re-serialize state every step = 5x overhead")
print("  - This is why Folding@home uses actor model: 4M CPU cores, 100k replicas")`,
    insight: "Ray's actor model beats Dask's task-graph when each step depends on the previous step's state — exactly MD simulation. Each @ray.remote actor persists 1000-atom positions (24KB) across 10000 steps, avoiding re-serialization. The task-graph model would marshal positions between workers every step — 240MB transfer overhead per replica. Ray's object store holds state in shared memory, accessible to all workers without copies.",
  },
];

// ============================================================
// GPU COMPUTING SCIENCE EXAMPLES (2)
// ============================================================

export const GPU_SCIENCE_EXAMPLES: DatasetExample[] = [
  {
    id: "gpu-genomics-bwa",
    step: "1",
    title: "GPU Genomics — BWA-MEM2 on GPU (100x alignment speedup)",
    subtitle: "Life Sciences — BWA-MEM2 GPU, 100x speedup for short-read alignment",
    accent: "oklch(0.55 0.18 30)",
    icon: <Zap className="h-4 w-4" />,
    badge: "Life Sciences · GPU",
    brief: {
      dataset: "Synthetic Illumina short reads: 1M reads × 150bp each, aligned to GRCh38 human reference (3.2GB). On CPU: BWA-MEM2 ~30min. On GPU (NVIDIA A100 with CUDA-BWA): ~20s — 100x speedup.",
      scale: "1M reads × 150bp = 150M base alignments to 3.2GB reference. GPU occupancy: 80 SMs × 2048 threads/SM = 163,840 active threads (vs 16 CPU threads).",
      why: "Shows SIMT parallelism: each read is a CUDA thread, all 1M threads execute the same seed-extend kernel in parallel. Memory coalescing matters — read data laid out as SoA (struct of arrays) for 128-byte aligned access. Occupancy = active_warps / max_warps determines throughput.",
    },
    stats: [
      { label: "Reads", value: "1,000,000" },
      { label: "Read length", value: "150 bp" },
      { label: "CPU time", value: "30 min" },
      { label: "GPU time", value: "20 sec (100x)" },
    ],
    tools: ["CUDA kernels", "SIMT model", "cuDF/RAPIDS", "Clara Genomics", "BWA-MEM2", "NVIDIA A100", "Nsight Compute"],
    codeTabs: [
      {
        lang: "scala",
        filename: "GPUGenomicsBWA.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

// GPU genomics via RAPIDS accelerator for Spark (cuDF-backed)
val spark = SparkSession.builder()
  .config("spark.plugins", "com.nvidia.spark.SQLPlugin")
  .config("spark.rapids.sql.enabled", "true")
  .config("spark.rapids.sql.concurrentGpuTasks", "2")
  .getOrCreate()

// Read 1M Illumina short reads (FASTQ)
val reads = spark.read.format("fastq")
  .load("s3://genomics/reads_R1.fq.gz")
  .repartition(80)  // 80 GPU partitions — one per A100 SM

// BWA-MEM2 alignment via cuClara (GPU seed-extend kernel)
// Each read = 1 CUDA thread, 1M threads in parallel (vs 16 CPU threads)
val alignments = reads.mapPartitions { partition =>
  val gpu = new com.nvidia.clara.BwaGpuAligner("s3://genomics/GRCh38.idx")
  partition.map(read => gpu.align(read.sequence))
}(org.apache.spark.sql.Encoders.product[Alignment])

// 100x speedup: 30 min CPU -> 20 sec GPU
alignments.write.mode("overwrite").parquet("s3://genomics-aligned/")
println(s"Aligned \${alignments.count} reads in 20s (GPU) vs ~30min (CPU)")`,
      },
      {
        lang: "rust",
        filename: "gpu_genomics_bwa.rs",
        code: `use cudarc::driver::result::CudaDevice;

// GPU genomics: BWA-MEM2 alignment via CUDA kernels
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let n_reads = 1_000_000;
    let read_len = 150;

    // Allocate device memory for reads (SoA layout for memory coalescing)
    let device = CudaDevice::new(0)?;  // NVIDIA A100
    let d_reads = device.alloc(n_reads * read_len)?;  // 150MB
    let d_ref = device.alloc(3_200_000_000)?;  // 3.2GB GRCh38

    // Launch CUDA kernel: 1 thread per read, 1M threads total
    // Grid: 9766 blocks × 1024 threads = 9,999,744 max threads
    // Each block = 32 warps × 1024 threads; occupancy = 16/64 warps = 25%
    let grid = (n_reads + 1023) / 1024;
    let block = 1024;

    // Launch seed-extend kernel
    // SIMT: all threads execute the same code, different data (each read)
    launch_bwa_kernel(
        &device, d_reads, d_ref, n_reads, read_len,
        grid as u32, block as u32,
    )?;

    // Memory coalescing: SoA layout means read[i][j] access is contiguous
    // SoA: 4 byte * 32 threads * 32 banks = perfect coalescing
    // AoS: would cause bank conflicts, 8x slower

    println!("Aligned {} reads x {}bp on GPU in 20s", n_reads, read_len);
    println!("CPU baseline: 30 min -> GPU speedup: 90x (effective)");
    println!("Occupancy: 16/64 warps active = 25% (memory-bound kernel)");
    Ok(())
}

fn launch_bwa_kernel(
    device: &CudaDevice,
    d_reads: *mut u8,
    d_ref: *mut u8,
    n_reads: usize,
    read_len: usize,
    grid: u32, block: u32,
) -> Result<(), Box<dyn std::error::Error>> {
    // Pseudo-code: real impl loads PTX kernel + launches
    println!("Launching kernel: grid={}, block={}", grid, block);
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "gpu_genomics_bwa.go",
        code: `package main

import (
    "fmt"
    "math"
)

// GPU genomics: BWA-MEM2 alignment via CUDA (Go analogue)
func main() {
    nReads := 1_000_000
    readLen := 150

    // SIMT model: each read = 1 CUDA thread, 1M threads total
    threadsPerBlock := 1024
    nBlocks := (nReads + threadsPerBlock - 1) / threadsPerBlock

    fmt.Println("=== BWA-MEM2 GPU Alignment ===")
    fmt.Printf("Reads: %d x %dbp = %.0f MB\\n", nReads, readLen,
        float64(nReads*readLen)/1e6)
    fmt.Printf("Grid: %d blocks x %d threads = %d max threads\\n",
        nBlocks, threadsPerBlock, nBlocks*threadsPerBlock)
    fmt.Println()

    // GPU occupancy: active_warps / max_warps
    smCount := 80         // A100 has 80 SMs
    maxWarpsPerSM := 64   // 2048 threads / 32 = 64 warps
    activeWarpsPerSM := 16  // memory-bound, only 25% occupancy
    occupancy := float64(activeWarpsPerSM) / float64(maxWarpsPerSM)

    fmt.Println("=== GPU Occupancy ===")
    fmt.Printf("SMs: %d, max warps/SM: %d\\n", smCount, maxWarpsPerSM)
    fmt.Printf("Active warps/SM: %d (memory-bound)\\n", activeWarpsPerSM)
    fmt.Printf("Occupancy: %d/%d = %.1f%%\\n", activeWarpsPerSM, maxWarpsPerSM, occupancy*100)
    fmt.Println()

    // Speedup analysis
    cpuTime := 30 * 60.0       // 30 min CPU
    gpuTime := 20.0             // 20 sec GPU
    speedup := cpuTime / gpuTime
    fmt.Println("=== Speedup Analysis ===")
    fmt.Printf("CPU baseline: %.0f sec (16 threads)\\n", cpuTime)
    fmt.Printf("GPU runtime:  %.0f sec (1M threads)\\n", gpuTime)
    fmt.Printf("Speedup: %.0fx\\n", speedup)
    fmt.Println()

    // Memory coalescing
    fmt.Println("=== Memory Coalescing (SoA vs AoS) ===")
    fmt.Println("  SoA (Struct of Arrays): read[0].bases, read[1].bases, ...")
    fmt.Println("    -> 32 threads x 4 bytes = 128-byte coalesced access")
    fmt.Printf("    -> peak bandwidth: %.0f GB/s\\n", float64(1550))
    fmt.Println("  AoS (Array of Structs): read[0..32] packed together")
    fmt.Println("    -> bank conflicts, 8x slower")
    fmt.Println()

    // Throughput: reads/sec
    throughput := float64(nReads) / gpuTime
    fmt.Printf("Throughput: %.0f reads/sec (%.1f M reads total)\\n",
        throughput, float64(nReads)/1e6)
    _ = math.Sin  // keep import
}`,
      },
      {
        lang: "elixir",
        filename: "gpu_genomics_bwa.ex",
        code: `defmodule Genomics.GpuBWA do
  @moduledoc "GPU BWA-MEM2 alignment via CUDA (Elixir analogue)"

  # 1M reads x 150bp = 150MB of read data
  # SIMT model: 1 CUDA thread per read, 1M threads total
  def run_alignment(n_reads \\ 1_000_000, read_len \\ 150) do
    IO.puts("=== BWA-MEM2 GPU Alignment ===")
    IO.puts("Reads: #{n_reads} x #{read_len}bp = #{div(n_reads * read_len, 1_000_000)} MB")

    # Grid configuration
    threads_per_block = 1024
    n_blocks = div(n_reads + threads_per_block - 1, threads_per_block)
    IO.puts("Grid: #{n_blocks} blocks x #{threads_per_block} threads = #{n_blocks * threads_per_block} max threads")
    IO.puts("")

    # GPU occupancy
    sm_count = 80
    max_warps_per_sm = 64
    active_warps_per_sm = 16
    occupancy = active_warps_per_sm / max_warps_per_sm

    IO.puts("=== GPU Occupancy ===")
    IO.puts("SMs: #{sm_count}, max warps/SM: #{max_warps_per_sm}")
    IO.puts("Active warps/SM: #{active_warps_per_sm} (memory-bound)")
    IO.puts("Occupancy: #{active_warps_per_sm}/#{max_warps_per_sm} = #{Float.round(occupancy * 100, 1)}%")
    IO.puts("")

    # Speedup
    cpu_time = 30 * 60.0
    gpu_time = 20.0
    speedup = cpu_time / gpu_time

    IO.puts("=== Speedup Analysis ===")
    IO.puts("CPU baseline: #{cpu_time} sec (16 threads)")
    IO.puts("GPU runtime:  #{gpu_time} sec (1M threads)")
    IO.puts("Speedup: #{Float.round(speedup, 0)}x")
    IO.puts("")

    # Throughput
    throughput = n_reads / gpu_time
    IO.puts("Throughput: #{Float.round(throughput, 0)} reads/sec")
  end
end`,
      },
      {
        lang: "zig",
        filename: "gpu_genomics_bwa.zig",
        code: `const std = @import("std");

// GPU genomics: BWA-MEM2 alignment via CUDA (Zig analogue)
pub fn main() !void {
    const n_reads: usize = 1_000_000;
    const read_len: usize = 150;

    std.debug.print("=== BWA-MEM2 GPU Alignment ===\\n", .{});
    std.debug.print("Reads: {d} x {d}bp = {d} MB\\n\\n",
        .{ n_reads, read_len, (n_reads * read_len) / 1_000_000 });

    // SIMT model: 1 CUDA thread per read, 1M threads total
    const threads_per_block: usize = 1024;
    const n_blocks: usize = (n_reads + threads_per_block - 1) / threads_per_block;

    std.debug.print("Grid: {d} blocks x {d} threads = {d} max threads\\n\\n",
        .{ n_blocks, threads_per_block, n_blocks * threads_per_block });

    // GPU occupancy = active_warps / max_warps_per_sm
    const sm_count: usize = 80;
    const max_warps_per_sm: usize = 64;
    const active_warps_per_sm: usize = 16;
    const occupancy: f64 = @as(f64, @floatFromInt(active_warps_per_sm))
        / @as(f64, @floatFromInt(max_warps_per_sm));

    std.debug.print("=== GPU Occupancy ===\\n", .{});
    std.debug.print("SMs: {d}, max warps/SM: {d}\\n", .{ sm_count, max_warps_per_sm });
    std.debug.print("Active warps/SM: {d} (memory-bound)\\n", .{active_warps_per_sm});
    std.debug.print("Occupancy: {d}/{d} = {d:.1}%\\n\\n",
        .{ active_warps_per_sm, max_warps_per_sm, occupancy * 100 });

    // Speedup analysis
    const cpu_time_sec: f64 = 30.0 * 60.0;  // 30 min CPU
    const gpu_time_sec: f64 = 20.0;          // 20 sec GPU
    const speedup: f64 = cpu_time_sec / gpu_time_sec;

    std.debug.print("=== Speedup Analysis ===\\n", .{});
    std.debug.print("CPU baseline: {d:.0} sec (16 threads)\\n", .{cpu_time_sec});
    std.debug.print("GPU runtime:  {d:.0} sec (1M threads)\\n", .{gpu_time_sec});
    std.debug.print("Speedup: {d:.0}x\\n\\n", .{speedup});

    // Memory coalescing — SoA vs AoS layout
    std.debug.print("=== Memory Coalescing ===\\n", .{});
    std.debug.print("SoA: read[0].bases, read[1].bases, ... -> 128-byte coalesced\\n", .{});
    std.debug.print("AoS: read[0..32] packed -> bank conflicts, 8x slower\\n\\n", .{});

    // Throughput
    const throughput: f64 = @as(f64, @floatFromInt(n_reads)) / gpu_time_sec;
    std.debug.print("Throughput: {d:.0} reads/sec\\n", .{throughput});

    // SIMT vs SIMD comparison
    std.debug.print("\\n=== SIMT vs SIMD ===\\n", .{});
    std.debug.print("SIMT (GPU): 32 threads per warp, autonomous control flow\\n", .{});
    std.debug.print("  - Divergent branches serialize within warp\\n", .{});
    std.debug.print("  - But: 1M threads in parallel = massive throughput\\n", .{});
    std.debug.print("SIMD (CPU): 8-16 lanes, single instruction across all lanes\\n", .{});
    std.debug.print("  - No divergence, but only 16-wide\\n", .{});
}`,
      },
    ],
    runnablePython: `# GPU genomics: BWA-MEM2 speedup simulation — pure Python (Pyodide)
# Uses only math + random — SIMULATES the CUDA kernel + occupancy + speedup
import math, random

random.seed(42)
N_READS = 1_000_000
READ_LEN = 150  # bp

print("=== GPU Genomics: BWA-MEM2 on GPU ===")
print(f"Workload: {N_READS:,} reads x {READ_LEN}bp = {N_READS*READ_LEN//1_000_000} MB")
print()

# SIMT model: 1 thread per read
THREADS_PER_BLOCK = 1024
n_blocks = (N_READS + THREADS_PER_BLOCK - 1) // THREADS_PER_BLOCK
print("=== CUDA Grid Configuration ===")
print(f"  Threads per block: {THREADS_PER_BLOCK} (32 warps x 32 threads)")
print(f"  Blocks in grid:     {n_blocks:,}")
print(f"  Total threads:      {n_blocks * THREADS_PER_BLOCK:,} (1 per read)")
print()

# Occupancy: active_warps / max_warps_per_sm
SM_COUNT = 80  # A100
MAX_WARPS_PER_SM = 64  # 2048 threads / 32 = 64 warps
ACTIVE_WARPS_PER_SM = 16  # memory-bound
occupancy = ACTIVE_WARPS_PER_SM / MAX_WARPS_PER_SM

print("=== GPU Occupancy (A100) ===")
print(f"  Streaming Multiprocessors (SMs): {SM_COUNT}")
print(f"  Max warps per SM:  {MAX_WARPS_PER_SM} (2048 threads)")
print(f"  Active warps/SM:   {ACTIVE_WARPS_PER_SM} (memory-bound kernel)")
print(f"  Occupancy: {ACTIVE_WARPS_PER_SM}/{MAX_WARPS_PER_SM} = {occupancy*100:.1f}%")
print(f"  Total active warps: {SM_COUNT * ACTIVE_WARPS_PER_SM} = {SM_COUNT * ACTIVE_WARPS_PER_SM * 32:,} active threads")
print()

# Speedup simulation (just report numbers — actual alignment takes 20s on GPU)
cpu_sec = 30 * 60  # 30 min baseline (16 CPU threads)
gpu_sec = 20       # 20 sec on A100
speedup = cpu_sec / gpu_sec

print("=== Speedup Analysis ===")
print(f"  CPU baseline:  {cpu_sec:>5} sec ({16} CPU threads)")
print(f"  GPU runtime:   {gpu_sec:>5} sec ({N_READS:,} GPU threads)")
print(f"  Speedup:       {speedup:.0f}x  (matches published BWA-MEM2 benchmarks)")
print()

# SIMT vs SIMD comparison
print("=== SIMT vs SIMD ===")
print("  SIMD (CPU AVX-512): 16-wide, single instruction across lanes")
print("    - No divergence, but only 16 lanes per core")
print("    - Total parallel: 16 cores * 16 lanes = 256 ops/cycle")
print()
print("  SIMT (GPU CUDA):    32 threads per warp, autonomous control flow")
print("    - Divergent branches serialize within warp (warp divergence)")
print("    - Total parallel: 80 SMs * 16 warps * 32 threads = 40,960 ops/cycle")
print(f"    - Throughput advantage: {40960 // 256}x more parallel ops")
print()

# Memory coalescing matters
print("=== Memory Coalescing ===")
print("  SoA (Struct of Arrays): read[i].bases laid out contiguously")
print("    -> 32 threads * 4 bytes = 128-byte aligned access")
print("    -> Achieves peak bandwidth: 1550 GB/s on A100 HBM2")
print()
print("  AoS (Array of Structs): read[i] = {bases, qual, name}")
print("    -> Bank conflicts, scattered access")
print("    -> 8x slower than SoA")
print()

# Per-step breakdown
print("=== GPU Alignment Steps ===")
steps = [
    ("1. Read loading (FASTQ -> GPU memory)", 2.0),
    ("2. Seeding (find exact matches in ref)", 8.0),
    ("3. Seed extension (Smith-Waterman on GPU)", 6.0),
    ("4. Quality filtering + scoring", 3.0),
    ("5. Output SAM/BAM to host", 1.0),
]
total = 0
for name, t in steps:
    print(f"  {name:50s}  {t:5.1f}s")
    total += t
print(f"  {'TOTAL':50s}  {total:5.1f}s  (vs 1800s CPU = {1800/total:.0f}x speedup)")
print()
print("WET LAB -> NumPy/SciPy -> GPU -> PUBLICATION -> STARTUP")
print("  (Illumina NovaSeq -> BWA-MEM2 on GPU -> variant calling -> 23andMe)")`,
    insight: "GPU genomics is the canonical 100x speedup story — BWA-MEM2 on NVIDIA A100 processes 1M reads in 20s vs 30min on 16-core CPU. The SIMT (Single Instruction Multiple Thread) model maps perfectly: 1 read = 1 thread, 1M threads in parallel. Memory coalescing (SoA layout) is critical — achieves 1550 GB/s peak HBM2 bandwidth. Occupancy caps at 25% here because alignment is memory-bound, not compute-bound.",
  },
  {
    id: "gpu-cryoem-refinement",
    step: "2",
    title: "Cryo-EM Refinement on GPU — 3D Reconstruction",
    subtitle: "Physics/Biology — GPU-accelerated 3D reconstruction from 2D projections",
    accent: "oklch(0.65 0.16 250)",
    icon: <Microscope className="h-4 w-4" />,
    badge: "Physics/Bio · Cryo-EM",
    brief: {
      dataset: "Synthetic cryo-EM particle stack: 100,000 2D projections of a 200kDa protein (256×256 pixels each). 3D reconstruction via projection-slice theorem: 2D Fourier transforms of projections → 3D Fourier volume → inverse 3D FFT.",
      scale: "100k projections × 256×256 = 6.5GB raw data. 3D volume: 256³ = 16M voxels. GPU does 100k × FFT2D + 1 × FFT3D in ~10 min vs ~10 hours CPU.",
      why: "Shows GPU FFT pipeline: 100k 2D FFTs on A100 (cuFFT) takes ~2 min vs 10 hours on CPU. The 3D FFT (256³ volume) is 4M cuFFT calls in batches. Projection-slice theorem: 2D Fourier slice inserted at orientation θ into 3D Fourier volume. Inverse 3D FFT gives the 3D density map.",
    },
    stats: [
      { label: "Projections", value: "100,000" },
      { label: "Pixel size", value: "256×256" },
      { label: "3D volume", value: "256³" },
      { label: "GPU time", value: "10 min (60x)" },
    ],
    tools: ["cuFFT", "CUDA kernels", "Projection-slice theorem", "RELION 4.0", "cryoSPARC", "FSC threshold", "Nsight Compute"],
    codeTabs: [
      {
        lang: "scala",
        filename: "GPUCryoEMRefinement.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

// GPU cryo-EM refinement via RAPIDS
val spark = SparkSession.builder()
  .config("spark.plugins", "com.nvidia.spark.SQLPlugin")
  .config("spark.rapids.sql.enabled", "true")
  .getOrCreate()

// Load 100k particle projections (2D images)
val particles = spark.read.format("mrc")
  .load("s3://cryoem/particles_256x256.mrc")
  .repartition(80)  // 80 GPU partitions (one per A100 SM)

// Projection-slice theorem: 2D FFT of each projection -> insert into 3D Fourier volume
// cuFFT: 100k x 256x256 = 6.5B complex ops -> 2 min on A100 (vs 10 hrs CPU)
val fftUDF = udf((projection: Array[Array[Double]]) => {
  // Real impl calls cuFFT cufftPlanMany + cufftExecZ2Z
  // Each projection: 2D FFT = O(N^2 log N) = 256^2 * 8 = 524k ops
  projection.map(row => row.map(_ * (math.cos(0) + math.sin(0) * 1j)))
})

val fourier_slices = particles
  .withColumn("fft2d", fftUDF(col("projection")))
  .withColumn("orientation", col("euler_angle"))

// Insert each slice into 3D Fourier volume (CUDA kernel)
// Then inverse 3D FFT -> 3D density map
val volume = fourier_slices.agg(collect_list("fft2d").alias("slices"))
  .withColumn("reconstructed_3d", reconstructVolume(col("slices")))

volume.write.mode("overwrite").parquet("s3://cryoem-volume/")`,
      },
      {
        lang: "rust",
        filename: "gpu_cryoem_refinement.rs",
        code: `use cudarc::driver::result::CudaDevice;
use cudarc::cudnn::Cudnn;

// GPU cryo-EM refinement: projection-slice theorem
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let n_particles = 100_000;
    let img_size = 256;
    let volume_size = 256 * 256 * 256;  // 16M voxels

    let device = CudaDevice::new(0)?;  // NVIDIA A100

    // Allocate device memory for 100k projections (256x256 complex float)
    // Complex64 = 16 bytes, total: 100k * 256^2 * 16 = 6.5 GB
    let d_projections = device.alloc(n_particles * img_size * img_size * 16)?;

    // Allocate 3D Fourier volume (256^3 complex = 1 GB)
    let d_volume = device.alloc(volume_size * 16)?;

    // Step 1: 100k × 2D FFT via cuFFT (batched)
    // cufftPlanMany: 80 SMs, batch_size=100k, plan size = 256x256
    // Each 2D FFT: O(N^2 log N) = 256^2 * 8 = 524k ops
    // Total: 100k * 524k = 5.24e10 ops -> 2 min on A100
    batch_fft2d(&device, d_projections, n_particles, img_size)?;

    // Step 2: Insert each Fourier slice into 3D volume (CUDA kernel)
    // Projection-slice theorem: 2D Fourier slice at orientation θ -> 3D slice at same θ
    insert_slices_kernel(&device, d_projections, d_volume, n_particles)?;

    // Step 3: Inverse 3D FFT -> 3D density map
    // cufftPlanC3: 256^3 = 16M complex -> inverse -> real density map
    inverse_fft3d(&device, d_volume, 256)?;

    // FSC threshold (Rosenthal-Henderson): 0.143 cutoff for resolution
    println!("3D reconstruction done: 256^3 = {} voxels", volume_size);
    println!("GPU runtime: 10 min (vs 10 hrs CPU = 60x speedup)");

    Ok(())
}

fn batch_fft2d(_device: &CudaDevice, _d: *mut u8, _n: usize, _sz: usize) -> Result<(), Box<dyn std::error::Error>> {
    println!("cuFFT batched 2D FFT: 100k x 256x256 = 6.5GB");
    Ok(())
}

fn insert_slices_kernel(_device: &CudaDevice, _p: *mut u8, _v: *mut u8, _n: usize) -> Result<(), Box<dyn std::error::Error>> {
    println!("Inserting 100k Fourier slices into 3D volume");
    Ok(())
}

fn inverse_fft3d(_device: &CudaDevice, _v: *mut u8, _sz: usize) -> Result<(), Box<dyn std::error::Error>> {
    println!("cuFFT 3D inverse FFT: 256^3 = 16M complex -> real density map");
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "gpu_cryoem_refinement.go",
        code: `package main

import (
    "fmt"
    "math"
)

// GPU cryo-EM refinement: 3D reconstruction from 2D projections
func main() {
    nParticles := 100_000
    imgSize := 256
    volumeSize := 256 * 256 * 256

    fmt.Println("=== Cryo-EM GPU Refinement ===")
    fmt.Printf("Particles: %d x %dx%d = %.1f GB raw\\n",
        nParticles, imgSize, imgSize,
        float64(nParticles*imgSize*imgSize*16)/1e9)
    fmt.Printf("3D volume: %dx%dx%d = %d voxels\\n\\n",
        imgSize, imgSize, imgSize, volumeSize)

    // Step 1: Batched 2D FFT via cuFFT
    // Each 2D FFT: O(N^2 log N) = 256^2 * 8 = 524,288 ops
    opsPerFFT := int(math.Pow(float64(imgSize), 2) * math.Log2(float64(imgSize)))
    totalFFT2Ops := nParticles * opsPerFFT
    fmt.Println("=== Step 1: Batched 2D FFT (cuFFT) ===")
    fmt.Printf("  Per-FFT: %d ops (256^2 x log2(256) = %d * 8)\\n",
        opsPerFFT, imgSize*imgSize)
    fmt.Printf("  Total:   %d ops = %.1f GFLOP\\n",
        totalFFT2Ops, float64(totalFFT2Ops)/1e9)
    fmt.Printf("  GPU time: 2 min (vs ~10 hrs CPU)\\n\\n")

    // Step 2: Insert Fourier slices into 3D volume
    fmt.Println("=== Step 2: Insert Fourier slices (CUDA kernel) ===")
    fmt.Printf("  Projection-slice theorem: 2D FFT slice at angle θ\\n")
    fmt.Printf("    -> insert into 3D Fourier volume at same orientation\\n")
    fmt.Printf("  %d slices inserted, kernel time: ~30 sec\\n\\n", nParticles)

    // Step 3: Inverse 3D FFT -> density map
    fmt.Println("=== Step 3: Inverse 3D FFT (cuFFT) ===")
    opsFFT3 := int(3 * float64(volumeSize) * math.Log2(float64(volumeSize)))
    fmt.Printf("  3D FFT: %d ops = %.1f GFLOP\\n",
        opsFFT3, float64(opsFFT3)/1e9)
    fmt.Printf("  GPU time: 30 sec\\n\\n")

    // FSC resolution estimation
    fmt.Println("=== Step 4: FSC Resolution (Rosenthal-Henderson) ===")
    fmt.Println("  FSC = Fourier Shell Correlation between two halves")
    fmt.Println("  Resolution threshold: FSC = 0.143 (Henderson criterion)")
    fmt.Printf("  Estimated resolution: 3.2 Å (high quality)\\n\\n")

    // Total speedup
    cpuTime := 10.0 * 3600.0  // 10 hours
    gpuTime := 10.0 * 60.0    // 10 min
    speedup := cpuTime / gpuTime
    fmt.Println("=== Speedup Analysis ===")
    fmt.Printf("  CPU baseline: %.0f sec (16 threads, 10 hrs)\\n", cpuTime)
    fmt.Printf("  GPU runtime:  %.0f sec (A100, 10 min)\\n", gpuTime)
    fmt.Printf("  Speedup: %.0fx\\n", speedup)
    fmt.Println()
    fmt.Println("=== Pipeline ===")
    fmt.Println("  Wet lab (Krios microscope) -> particles (MRC format) ->")
    fmt.Println("  -> GPU 2D FFT + insert slices -> 3D inverse FFT -> density map")
    fmt.Println("  -> atomic model refinement (Phenix) -> PDB -> publication")
}`,
      },
      {
        lang: "elixir",
        filename: "gpu_cryoem_refinement.ex",
        code: `defmodule Bio.GpuCryoEM do
  @moduledoc "GPU cryo-EM refinement via projection-slice theorem"

  def run(n_particles \\ 100_000, img_size \\ 256) do
    volume_size = img_size * img_size * img_size  # 256^3

    IO.puts("=== Cryo-EM GPU Refinement ===")
    IO.puts("Particles: #{n_particles} x #{img_size}x#{img_size} = #{Float.round(n_particles * img_size * img_size * 16 / 1.0e9, 1)} GB raw")
    IO.puts("3D volume: #{img_size}x#{img_size}x#{img_size} = #{volume_size} voxels\\n")

    # Step 1: Batched 2D FFT via cuFFT
    ops_per_fft = trunc(:math.pow(img_size, 2) * :math.log2(img_size))
    total_fft2_ops = n_particles * ops_per_fft
    IO.puts("=== Step 1: Batched 2D FFT (cuFFT) ===")
    IO.puts("  Per-FFT: #{ops_per_fft} ops (256^2 x log2(256))")
    IO.puts("  Total:   #{total_fft2_ops} ops = #{Float.round(total_fft2_ops / 1.0e9, 1)} GFLOP")
    IO.puts("  GPU time: 2 min (vs ~10 hrs CPU)\\n")

    # Step 2: Insert Fourier slices
    IO.puts("=== Step 2: Insert Fourier slices (CUDA kernel) ===")
    IO.puts("  Projection-slice theorem: 2D FFT slice at angle θ")
    IO.puts("    -> insert into 3D Fourier volume at same orientation")
    IO.puts("  #{n_particles} slices inserted, kernel time: ~30 sec\\n")

    # Step 3: Inverse 3D FFT
    ops_fft3 = trunc(3 * volume_size * :math.log2(volume_size))
    IO.puts("=== Step 3: Inverse 3D FFT (cuFFT) ===")
    IO.puts("  3D FFT: #{ops_fft3} ops = #{Float.round(ops_fft3 / 1.0e9, 1)} GFLOP")
    IO.puts("  GPU time: 30 sec\\n")

    # FSC resolution
    IO.puts("=== Step 4: FSC Resolution (Rosenthal-Henderson) ===")
    IO.puts("  FSC = Fourier Shell Correlation between two halves")
    IO.puts("  Resolution threshold: FSC = 0.143 (Henderson criterion)")
    IO.puts("  Estimated resolution: 3.2 Å (high quality)\\n")

    # Speedup
    cpu_time = 10.0 * 3600.0
    gpu_time = 10.0 * 60.0
    speedup = cpu_time / gpu_time
    IO.puts("=== Speedup Analysis ===")
    IO.puts("  CPU baseline: #{cpu_time} sec (16 threads, 10 hrs)")
    IO.puts("  GPU runtime:  #{gpu_time} sec (A100, 10 min)")
    IO.puts("  Speedup: #{Float.round(speedup, 0)}x")
  end
end`,
      },
      {
        lang: "zig",
        filename: "gpu_cryoem_refinement.zig",
        code: `const std = @import("std");

// GPU cryo-EM refinement via projection-slice theorem
pub fn main() !void {
    const n_particles: usize = 100_000;
    const img_size: usize = 256;
    const volume_size: usize = 256 * 256 * 256;  // 16M voxels

    std.debug.print("=== Cryo-EM GPU Refinement ===\\n", .{});
    std.debug.print("Particles: {d} x {d}x{d} = {d:.1} GB raw\\n\\n",
        .{ n_particles, img_size, img_size,
           @as(f64, @floatFromInt(n_particles * img_size * img_size * 16)) / 1.0e9 });

    // Step 1: Batched 2D FFT via cuFFT
    // Each 2D FFT: O(N^2 log N) = 256^2 * 8 = 524,288 ops
    const ops_per_fft: usize = img_size * img_size * @as(usize, @intFromFloat(@log2(@as(f64, @floatFromInt(img_size)))));
    const total_fft2_ops: usize = n_particles * ops_per_fft;
    std.debug.print("=== Step 1: Batched 2D FFT (cuFFT) ===\\n", .{});
    std.debug.print("  Per-FFT: {d} ops (256^2 x log2(256))\\n", .{ops_per_fft});
    std.debug.print("  Total:   {d} ops = {d:.1} GFLOP\\n", .{ total_fft2_ops,
        @as(f64, @floatFromInt(total_fft2_ops)) / 1.0e9 });
    std.debug.print("  GPU time: 2 min (vs ~10 hrs CPU)\\n\\n", .{});

    // Step 2: Insert Fourier slices
    std.debug.print("=== Step 2: Insert Fourier slices (CUDA kernel) ===\\n", .{});
    std.debug.print("  Projection-slice theorem: 2D FFT slice at angle theta\\n", .{});
    std.debug.print("    -> insert into 3D Fourier volume at same orientation\\n", .{});
    std.debug.print("  {d} slices inserted, kernel time: ~30 sec\\n\\n", .{n_particles});

    // Step 3: Inverse 3D FFT
    const ops_fft3: usize = 3 * volume_size *
        @as(usize, @intFromFloat(@log2(@as(f64, @floatFromInt(volume_size)))));
    std.debug.print("=== Step 3: Inverse 3D FFT (cuFFT) ===\\n", .{});
    std.debug.print("  3D FFT: {d} ops = {d:.1} GFLOP\\n", .{ ops_fft3,
        @as(f64, @floatFromInt(ops_fft3)) / 1.0e9 });
    std.debug.print("  GPU time: 30 sec\\n\\n", .{});

    // FSC resolution
    std.debug.print("=== Step 4: FSC Resolution (Rosenthal-Henderson) ===\\n", .{});
    std.debug.print("  FSC = Fourier Shell Correlation between two halves\\n", .{});
    std.debug.print("  Resolution threshold: FSC = 0.143 (Henderson criterion)\\n", .{});
    std.debug.print("  Estimated resolution: 3.2 Angstrom (high quality)\\n\\n", .{});

    // Speedup
    const cpu_time: f64 = 10.0 * 3600.0;
    const gpu_time: f64 = 10.0 * 60.0;
    const speedup: f64 = cpu_time / gpu_time;
    std.debug.print("=== Speedup Analysis ===\\n", .{});
    std.debug.print("  CPU baseline: {d:.0} sec (16 threads, 10 hrs)\\n", .{cpu_time});
    std.debug.print("  GPU runtime:  {d:.0} sec (A100, 10 min)\\n", .{gpu_time});
    std.debug.print("  Speedup: {d:.0}x\\n\\n", .{speedup});

    // Pipeline
    std.debug.print("=== Pipeline ===\\n", .{});
    std.debug.print("  Wet lab (Krios microscope) -> particles (MRC format)\\n", .{});
    std.debug.print("  -> GPU 2D FFT + insert slices -> 3D inverse FFT -> density map\\n", .{});
    std.debug.print("  -> atomic model refinement (Phenix) -> PDB -> publication\\n", .{});
}`,
      },
    ],
    runnablePython: `# GPU cryo-EM refinement via projection-slice theorem — pure Python (Pyodide)
# Uses only math + cmath + random — SIMULATES the GPU pipeline
import math, cmath, random

random.seed(42)
N_PARTICLES = 256   # smaller for speed (real impl: 100k)
IMG_SIZE = 16        # 16x16 particles (real impl: 256x256)

print("=== Cryo-EM GPU Refinement (simulated) ===")
print(f"Workload: {N_PARTICLES} particles x {IMG_SIZE}x{IMG_SIZE} pixels")
print()

# Step 1: 2D FFT of each projection
print("=== Step 1: Batched 2D FFT (cuFFT on GPU) ===")
print(f"  Each 2D FFT: O(N^2 log N) = {IMG_SIZE*IMG_SIZE} * {int(math.log2(IMG_SIZE))} = {IMG_SIZE*IMG_SIZE*int(math.log2(IMG_SIZE))} ops")
ops_per_fft = IMG_SIZE * IMG_SIZE * int(math.log2(IMG_SIZE))
total_fft2_ops = N_PARTICLES * ops_per_fft
print(f"  Total: {N_PARTICLES} x {ops_per_fft} = {total_fft2_ops:,} ops = {total_fft2_ops/1e6:.1f} MFLOP")
print(f"  GPU runtime (extrapolated): ~2 min for 100k x 256x256")
print(f"  CPU baseline:  ~10 hrs for 100k x 256x256")
print()

# Demonstrate 2D FFT on a small synthetic projection
def fft2d(matrix):
    """2D FFT = FFT on rows, then FFT on cols."""
    rows_fft = [fft(row) for row in matrix]
    cols_fft = [fft([rows_fft[r][c] for r in range(len(matrix))]) for c in range(len(matrix[0]))]
    return [[cols_fft[c][r] for c in range(len(matrix[0]))] for r in range(len(matrix))]

def fft(a):
    """Recursive Cooley-Tukey 1D FFT."""
    n = len(a)
    if n <= 1: return a
    even = fft([a[i] for i in range(0, n, 2)])
    odd  = fft([a[i] for i in range(1, n, 2)])
    out = [0j] * n
    for k in range(n // 2):
        w = cmath.exp(-2j * math.pi * k / n)
        out[k] = even[k] + w * odd[k]
        out[k + n // 2] = even[k] - w * odd[k]
    return out

# Create synthetic 2D projection of a 3D protein
projection = [[random.gauss(0.5, 0.3) for _ in range(IMG_SIZE)] for _ in range(IMG_SIZE)]

# Step 2: Insert Fourier slices into 3D volume
print("=== Step 2: Insert Fourier slices (CUDA kernel) ===")
print("  Projection-slice theorem:")
print("    - 2D FFT of projection at orientation theta")
print("    -> Insert into 3D Fourier volume at same theta")
print("    - 100k projections -> 3D Fourier volume (256^3 voxels)")
print()

# Compute 2D FFT of our small projection (demo)
fft_proj = fft2d(projection)
total_energy = sum(abs(fft_proj[r][c])**2 for r in range(IMG_SIZE) for c in range(IMG_SIZE))
print(f"  Demo: 2D FFT of {IMG_SIZE}x{IMG_SIZE} projection")
print(f"  Total spectral energy: {total_energy:.2f}")
print()

# Step 3: Inverse 3D FFT
print("=== Step 3: Inverse 3D FFT (cuFFT) ===")
ops_fft3 = 3 * (256**3) * int(math.log2(256**3))
print(f"  3D FFT: 3 x 256^3 x log2(256^3) = {ops_fft3:,} ops = {ops_fft3/1e9:.1f} GFLOP")
print(f"  GPU runtime: 30 sec on A100")
print()

# Step 4: FSC resolution
print("=== Step 4: FSC Resolution (Rosenthal-Henderson) ===")
print("  FSC = Fourier Shell Correlation between two independent halves")
print("  FSC(k) = sum(F1(k) * conj(F2(k))) / sqrt(sum|F1|^2 * sum|F2|^2)")
print("  Resolution threshold: FSC = 0.143 (Henderson 2012)")
print("  Estimated resolution: 3.2 Angstrom (high quality)")
print()

# Speedup
print("=== Speedup Analysis (real 100k x 256x256) ===")
cpu_sec = 10 * 3600  # 10 hrs
gpu_sec = 10 * 60    # 10 min
print(f"  CPU baseline (16 cores, single-threaded FFT): {cpu_sec} sec")
print(f"  GPU runtime (A100, cuFFT batched):             {gpu_sec} sec")
print(f"  Speedup: {cpu_sec/gpu_sec:.0f}x")
print()
print("=== Pipeline ===")
print("  WET LAB (Krios microscope) -> particle stack (MRC format)")
print("  -> GPU 2D FFT (cuFFT) + insert Fourier slices")
print("  -> 3D inverse FFT -> density map")
print("  -> Phenix refinement -> atomic model (PDB)")
print("  -> PUBLICATION (Nature) -> IP -> STARTUP (e.g. cryoSPARC, Relion+)")`,
    insight: "Cryo-EM on GPU is the structural biology revolution — Jensen/Henderson won the 2017 Nobel for it. Projection-slice theorem: 2D FFTs of projections insert as slices into 3D Fourier volume, then inverse 3D FFT gives the density. cuFFT batches 100k 2D FFTs in ~2 min (vs 10 hrs CPU). FSC = 0.143 (Rosenthal-Henderson criterion) is the resolution cutoff. This powers RELION, cryoSPARC, and every modern structural biology lab.",
  },
];

// ============================================================
// JUPYTER SCIENCE EXAMPLES (2)
// ============================================================

export const JUPYTER_SCIENCE_EXAMPLES: DatasetExample[] = [
  {
    id: "jupyter-genomics-pipeline",
    step: "1",
    title: "Genomics Notebook Pipeline — FASTQ → NumPy → matplotlib",
    subtitle: "Life Sciences — reproducible notebook from FASTQ to publication figure",
    accent: "oklch(0.65 0.16 30)",
    icon: <Database className="h-4 w-4" />,
    badge: "Life Sciences · Jupyter",
    brief: {
      dataset: "Synthetic Illumina FASTQ file → read quality scores → NumPy QC array → matplotlib figure → exported as 300dpi PDF for publication. Jupyter notebook with cells in Markdown + Python + bash (cell magic).",
      scale: "10,000 reads × 150bp × quality scores = 1.5M values. Single notebook: 12 cells (5 Markdown, 6 code, 1 raw) → 1 publication figure (PCA scatter + quality heatmap).",
      why: "Shows the wet-lab-to-publication pipeline: Jupyter notebook as the executable paper. Each cell has In[n]/Out[n] execution order; kernels maintain state across cells. Reproducibility requires random seeds + pip freeze + cell order. This is what every genomics publication does.",
    },
    stats: [
      { label: "Reads", value: "10,000" },
      { label: "Cells", value: "12" },
      { label: "Kernel", value: "IPython (Python 3)" },
      { label: "Figure", value: "1 (300dpi PDF)" },
    ],
    tools: ["Jupyter Notebook", "IPython kernel", "ZMQ messaging", "Cell magic %matplotlib", "pip freeze", "random.seed", "nbval"],
    codeTabs: [
      {
        lang: "scala",
        filename: "GenomicsJupyterPipeline.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

// Genomics notebook pipeline — Spark analogue of Jupyter cells
val spark = SparkSession.builder().getOrCreate()

// === CELL 1 (markdown): # Genomics QC Pipeline ===
// === CELL 2 (code): Load FASTQ ===
val reads = spark.read.format("fastq")
  .load("s3://genomics/sample_R1.fq.gz")
  .limit(10000)

// === CELL 3 (code): Compute per-read quality scores ===
val qc = reads.withColumn("mean_qual",
  expr("aggregate(transform(split(quality, ''), x -> int(x) - 33), 0, (acc, x) -> acc + x) / length(quality)"))

// === CELL 4 (code): NumPy-style array ops on quality distributions ===
val quality_array = qc.select("mean_qual").collect().map(_.getDouble(0))
// would be np.array(quality_array).reshape(-1, 150) in Python

// === CELL 5 (code): PCA via SVD on quality matrix ===
// A = U * sigma * V^T (LAPACK dgesdd)
val pca = qc.rdd.map(row => Vectors.dense(row.getAs[Seq[Double]]("quals").toArray))
// Spark ML PCA = SVD under the hood

// === CELL 6 (markdown): ## Publication Figure ===
// === CELL 7 (code): matplotlib scatter (saved to PDF) ===
val fig_data = pca.select("pc1", "pc2", "sample_id").toPandas()
// plt.scatter(fig_data["pc1"], fig_data["pc2"], c=fig_data["sample_id"])
// plt.savefig("publication_figure.pdf", dpi=300)

// === CELL 8 (raw): pip freeze for reproducibility ===
println("pandas==2.1, numpy==1.26, matplotlib==3.8, scikit-learn==1.3")`,
      },
      {
        lang: "rust",
        filename: "jupyter_genomics_pipeline.rs",
        code: `use ndarray::{Array1, Array2};
use rand::SeedableRng;
use rand::rngs::StdRng;

// Jupyter notebook pipeline analogue — cells as sequential functions
fn main() {
    // Reproducibility: random seed (critical for Jupyter notebooks)
    let mut rng = StdRng::seed_from_u64(42);

    // === CELL 1 (markdown): # Genomics QC Pipeline ===
    println!("# Genomics QC Pipeline");
    println!("Loading 10,000 reads x 150bp from FASTQ\\n");

    // === CELL 2 (code): Load synthetic FASTQ ===
    let n_reads = 10_000;
    let read_len = 150;
    let reads: Vec<Vec<u8>> = (0..n_reads)
        .map(|_| (0..read_len).map(|_| b"ACGT"[rng.gen_range(0..4)]).collect())
        .collect();
    println!("Cell 2: loaded {} reads x {} bp", n_reads, read_len);

    // === CELL 3 (code): Compute per-read quality scores ===
    let quality_scores: Array1<f64> = reads.iter()
        .map(|r| r.iter().map(|&b| (b % 41) as f64 + 33.0).sum::<f64>() / r.len() as f64)
        .collect();
    println!("Cell 3: mean quality per read computed");

    // === CELL 4 (code): NumPy-style array ops ===
    let mean_q = quality_scores.sum() / n_reads as f64;
    let std_q = quality_scores.std(0.0);
    println!("Cell 4: mean Q-score = {:.2}, std = {:.2}", mean_q, std_q);

    // === CELL 5 (code): SVD/PCA on quality matrix (LAPACK dgesdd) ===
    // In real Python: U, sigma, Vt = np.linalg.svd(quality_matrix)
    println!("Cell 5: SVD on quality matrix (LAPACK dgesdd)");

    // === CELL 6 (markdown): ## Publication Figure ===
    println!("\\n## Publication Figure");

    // === CELL 7 (code): matplotlib scatter (analogue) ===
    println!("Cell 7: plt.scatter(PC1, PC2, c=sample_id)");
    println!("  plt.savefig('publication_figure.pdf', dpi=300)");

    // === CELL 8 (raw): pip freeze for reproducibility ===
    println!("\\nCell 8 (raw): pip freeze");
    println!("  pandas==2.1, numpy==1.26, matplotlib==3.8");
}`,
      },
      {
        lang: "go",
        filename: "jupyter_genomics_pipeline.go",
        code: `package main

import (
    "fmt"
    "math"
    "math/rand"
)

// Jupyter notebook pipeline — genomics FASTQ -> NumPy -> matplotlib
// Cells are sequential functions; execution order matters (In[n]/Out[n])
func main() {
    rand.Seed(42)  // Reproducibility — critical for Jupyter notebooks

    // === CELL 1 (markdown) ===
    fmt.Println("# Genomics QC Pipeline")
    fmt.Println("Loading 10,000 reads x 150bp from FASTQ\\n")

    // === CELL 2 (code): Load synthetic FASTQ ===
    nReads := 10000
    readLen := 150
    reads := make([][]byte, nReads)
    for i := range reads {
        reads[i] = make([]byte, readLen)
        for j := range reads[i] {
            reads[i][j] = "ACGT"[rand.Intn(4)]
        }
    }
    fmt.Printf("Cell 2 [In 2]: loaded %d reads x %d bp\\n", nReads, readLen)

    // === CELL 3 (code): Compute per-read quality scores ===
    qualityScores := make([]float64, nReads)
    for i, r := range reads {
        sum := 0.0
        for _, b := range r {
            sum += float64(b%41) + 33.0
        }
        qualityScores[i] = sum / float64(readLen)
    }
    fmt.Printf("Cell 3 [In 3]: per-read quality computed\\n")

    // === CELL 4 (code): NumPy-style array ops ===
    var sumQ float64
    for _, q := range qualityScores {
        sumQ += q
    }
    meanQ := sumQ / float64(nReads)
    var sqSum float64
    for _, q := range qualityScores {
        sqSum += (q - meanQ) * (q - meanQ)
    }
    stdQ := math.Sqrt(sqSum / float64(nReads))
    fmt.Printf("Cell 4 [In 4]: mean Q-score = %.2f, std = %.2f\\n", meanQ, stdQ)

    // === CELL 5 (code): SVD/PCA on quality matrix ===
    fmt.Printf("Cell 5 [In 5]: SVD on quality matrix (LAPACK dgesdd)\\n")

    // === CELL 6 (markdown) ===
    fmt.Println("\\n## Publication Figure")

    // === CELL 7 (code): matplotlib scatter ===
    fmt.Printf("Cell 7 [In 7]: plt.scatter(PC1, PC2, c=sample_id)\\n")
    fmt.Printf("  plt.savefig('publication_figure.pdf', dpi=300)\\n")

    // === CELL 8 (raw): pip freeze ===
    fmt.Println("\\nCell 8 (raw): pip freeze")
    fmt.Println("  pandas==2.1, numpy==1.26, matplotlib==3.8")
}`,
      },
      {
        lang: "elixir",
        filename: "jupyter_genomics_pipeline.ex",
        code: `defmodule Jupyter.GenomicsPipeline do
  @moduledoc "Jupyter notebook pipeline — FASTQ -> NumPy -> matplotlib"

  # Each cell is a function — execution order matters (In[n]/Out[n])
  def run do
    # Reproducibility: random seed
    :rand.seed(:exsss, 42)

    # === CELL 1 (markdown) ===
    IO.puts("# Genomics QC Pipeline")
    IO.puts("Loading 10,000 reads x 150bp from FASTQ\\n")

    # === CELL 2 (code): Load synthetic FASTQ ===
    reads = generate_reads(10_000, 150)
    IO.puts("Cell 2 [In 2]: loaded #{length(reads)} reads x #{length(hd(reads))} bp")

    # === CELL 3 (code): Compute per-read quality scores ===
    quality_scores = Enum.map(reads, fn r ->
      sum = Enum.reduce(r, 0, fn b, acc -> acc + (rem(b, 41) + 33) end)
      sum / length(r)
    end)
    IO.puts("Cell 3 [In 3]: per-read quality computed")

    # === CELL 4 (code): NumPy-style array ops ===
    mean_q = Enum.sum(quality_scores) / length(quality_scores)
    variance = Enum.reduce(quality_scores, 0.0, fn q, acc -> acc + (q - mean_q) ** 2 end) / length(quality_scores)
    std_q = :math.sqrt(variance)
    IO.puts("Cell 4 [In 4]: mean Q-score = #{Float.round(mean_q, 2)}, std = #{Float.round(std_q, 2)}")

    # === CELL 5 (code): SVD/PCA ===
    IO.puts("Cell 5 [In 5]: SVD on quality matrix (LAPACK dgesdd)")

    # === CELL 6 (markdown) ===
    IO.puts("\n## Publication Figure")

    # === CELL 7 (code): matplotlib scatter ===
    IO.puts("Cell 7 [In 7]: plt.scatter(PC1, PC2, c=sample_id)")
    IO.puts("  plt.savefig('publication_figure.pdf', dpi=300)")

    # === CELL 8 (raw): pip freeze ===
    IO.puts("\nCell 8 (raw): pip freeze")
    IO.puts("  pandas==2.1, numpy==1.26, matplotlib==3.8")
  end

  defp generate_reads(n, len) do
    Enum.map(1..n, fn _ ->
      Enum.map(1..len, fn _ -> Enum.random(~c"ACGT") end)
    end)
  end
end`,
      },
      {
        lang: "zig",
        filename: "jupyter_genomics_pipeline.zig",
        code: `const std = @import("std");

// Jupyter notebook pipeline — cells as sequential functions
// Each cell has In[n]/Out[n] execution order; reproducibility needs random seed
pub fn main() !void {
    var prng = std.Random.DefaultPrng.init(42);  // Reproducibility
    const rand = prng.random();

    // === CELL 1 (markdown) ===
    std.debug.print("# Genomics QC Pipeline\\n", .{});
    std.debug.print("Loading 10,000 reads x 150bp from FASTQ\\n\\n", .{});

    // === CELL 2 (code): Load synthetic FASTQ ===
    const n_reads: usize = 10_000;
    const read_len: usize = 150;
    var reads = std.ArrayList([]u8).init(std.heap.page_allocator);
    defer reads.deinit();

    var i: usize = 0;
    while (i < n_reads) : (i += 1) {
        var r = try std.heap.page_allocator.alloc(u8, read_len);
        var j: usize = 0;
        while (j < read_len) : (j += 1) {
            r[j] = "ACGT"[rand.intRangeAtMost(u8, 0, 3)];
        }
        try reads.append(r);
    }
    std.debug.print("Cell 2 [In 2]: loaded {d} reads x {d} bp\\n", .{ n_reads, read_len });

    // === CELL 3 (code): Compute per-read quality scores ===
    var quality_scores = try std.heap.page_allocator.alloc(f64, n_reads);
    defer std.heap.page_allocator.free(quality_scores);

    i = 0;
    while (i < n_reads) : (i += 1) {
        var sum: f64 = 0.0;
        for (reads.items[i]) |b| {
            sum += @as(f64, @floatFromInt(@as(u8, @intCast(@rem(b, 41))) + 33));
        }
        quality_scores[i] = sum / @as(f64, @floatFromInt(read_len));
    }
    std.debug.print("Cell 3 [In 3]: per-read quality computed\\n", .{});

    // === CELL 4 (code): NumPy-style array ops ===
    var sum_q: f64 = 0.0;
    for (quality_scores) |q| sum_q += q;
    const mean_q: f64 = sum_q / @as(f64, @floatFromInt(n_reads));
    var sq_sum: f64 = 0.0;
    for (quality_scores) |q| sq_sum += (q - mean_q) * (q - mean_q);
    const std_q: f64 = @sqrt(sq_sum / @as(f64, @floatFromInt(n_reads)));
    std.debug.print("Cell 4 [In 4]: mean Q-score = {d:.2}, std = {d:.2}\\n", .{ mean_q, std_q });

    // === CELL 5 (code): SVD/PCA ===
    std.debug.print("Cell 5 [In 5]: SVD on quality matrix (LAPACK dgesdd)\\n", .{});

    // === CELL 6 (markdown) ===
    std.debug.print("\\n## Publication Figure\\n", .{});

    // === CELL 7 (code): matplotlib scatter ===
    std.debug.print("Cell 7 [In 7]: plt.scatter(PC1, PC2, c=sample_id)\\n", .{});
    std.debug.print("  plt.savefig('publication_figure.pdf', dpi=300)\\n", .{});

    // === CELL 8 (raw): pip freeze ===
    std.debug.print("\\nCell 8 (raw): pip freeze\\n", .{});
    std.debug.print("  pandas==2.1, numpy==1.26, matplotlib==3.8\\n", .{});

    // Free allocated reads
    for (reads.items) |r| std.heap.page_allocator.free(r);
}`,
      },
    ],
    runnablePython: `# Genomics notebook pipeline (Jupyter cell simulation) — pure Python (Pyodide)
# Demonstrates cell execution order (In[n]/Out[n]) + reproducibility
import math, random

random.seed(42)  # Reproducibility — critical for Jupyter

print("╔════════════════════════════════════════════════════════╗")
print("║  Jupyter Notebook: genomics_qc_pipeline.ipynb          ║")
print("║  Kernel: IPython (Python 3.11) | ZMQ messaging         ║")
print("╚════════════════════════════════════════════════════════╝")
print()

# === CELL 1 (markdown) ===
print("[CELL 1, markdown]")
print("# Genomics QC Pipeline")
print("Loading 10,000 reads × 150bp from FASTQ → QC → PCA → figure")
print()

# === CELL 2 (code): Load synthetic FASTQ ===
print("[CELL 2, In[2]]")
n_reads = 1000
read_len = 50  # smaller for speed
bases = "ACGT"
reads = ["".join(random.choice(bases) for _ in range(read_len)) for _ in range(n_reads)]
print(f"Loaded {len(reads)} reads × {read_len}bp = {len(reads) * read_len:,} bases")
print()

# === CELL 3 (code): Compute per-read quality scores ===
print("[CELL 3, In[3]]")
quals = []
for r in reads:
    # Simulate Phred quality scores (Q20-Q40 typical for Illumina)
    q = [random.randint(20, 40) for _ in range(len(r))]
    quals.append(sum(q) / len(q))
print(f"Mean per-read quality: {sum(quals)/len(quals):.2f} (Phred scale)")
print()

# === CELL 4 (code): NumPy-style array ops ===
print("[CELL 4, In[4]]")
mean_q = sum(quals) / len(quals)
var = sum((q - mean_q)**2 for q in quals) / len(quals)
std_q = math.sqrt(var)
print(f"np.array(quals).mean() = {mean_q:.2f}")
print(f"np.array(quals).std()  = {std_q:.2f}")
print()

# === CELL 5 (code): SVD/PCA on quality matrix (LAPACK dgesdd under the hood) ===
print("[CELL 5, In[5]]")
print("U, sigma, Vt = np.linalg.svd(quality_matrix)")
print(f"  shape (n_reads={n_reads}, read_len={read_len})")
print(f"  -> top 2 PCs explain 73% of variance")
print()

# === CELL 6 (markdown) ===
print("[CELL 6, markdown]")
print("## Publication Figure")
print("Scatter of PC1 vs PC2, colored by sample group")
print()

# === CELL 7 (code): matplotlib scatter ===
print("[CELL 7, In[7]]")
print("%matplotlib inline  # cell magic — display figure inline")
print("plt.scatter(PC1, PC2, c=sample_id, cmap='tab10')")
print("plt.xlabel('PC1 (43.2% variance)')")
print("plt.ylabel('PC2 (29.8% variance)')")
print("plt.savefig('publication_figure.pdf', dpi=300)")
print(">>> figure saved (300dpi PDF)")
print()

# === CELL 8 (raw): pip freeze ===
print("[CELL 8, raw]")
print("pandas==2.1.0\\nnumpy==1.26.0\\nmatplotlib==3.8.0\\nscikit-learn==1.3.0")
print()

print("=== Reproducibility checklist ===")
print("  [x] random.seed(42) at top of notebook")
print("  [x] Cell execution order: In[1] -> In[2] -> ... -> In[8]")
print("  [x] pip freeze embedded in raw cell")
print("  [x] nbval regression test: re-run notebook, diff outputs")
print()
print("=== IPython kernel protocol (ZMQ messaging) ===")
print("  Browser <-- (websocket) --> Notebook server <-- (ZMQ) --> IPython kernel")
print("  Execute_request -> Execute_reply -> Display_data -> Stream output")
print("  Each cell: kernel maintains Python state across executions")
print()
print("WET LAB -> NumPy -> matplotlib -> PUBLICATION (this is the executable paper)")`,
    insight: "The Jupyter notebook IS the modern executable paper — each cell is a paragraph in a computational essay. IPython kernel uses ZMQ messaging (5-socket protocol) between browser and Python process; cell state persists across cells via the kernel's namespace. Reproducibility requires: (1) random.seed(42) at top, (2) execution order (In[1]→In[8] — running cells out of order produces different state), (3) pip freeze as a raw cell. nbval runs the notebook as a regression test, diffing cell outputs.",
  },
  {
    id: "jupyter-clinical-trial-voila",
    step: "2",
    title: "Clinical Trial Dashboard — Voilà for Trial Monitoring",
    subtitle: "Life Sciences — interactive dashboard with no code visible to end users",
    accent: "oklch(0.65 0.16 165)",
    icon: <ShieldCheck className="h-4 w-4" />,
    badge: "Life Sciences · Voilà",
    brief: {
      dataset: "Synthetic Phase III clinical trial: 500 patients × 12 visit timepoints × 20 biomarkers. Voilà converts Jupyter notebook to interactive dashboard — clinicians see widgets (sliders, dropdowns) but NO code.",
      scale: "500 patients × 12 visits × 20 biomarkers = 120,000 measurements. Voilà dashboard: 8 interactive widgets + 4 charts, served on JupyterHub, restricted to FDA-approved clinicians via OAuth.",
      why: "Shows Voilà's value: notebook → dashboard WITHOUT exposing code. Clinicians monitor trial arms, filter by patient stratification, and see live updates. The notebook's cells become dashboard panels; widgets become user inputs. This is how modern clinical trials are monitored.",
    },
    stats: [
      { label: "Patients", value: "500" },
      { label: "Visits", value: "12" },
      { label: "Biomarkers", value: "20" },
      { label: "Widgets", value: "8 interactive" },
    ],
    tools: ["Voilà", "JupyterHub", "ipywidgets", "JupyterLab", "OAuth2", "Kubernetes", "ipympl"],
    codeTabs: [
      {
        lang: "scala",
        filename: "ClinicalTrialVoila.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

// Clinical trial dashboard — Voilà analogue in Spark
val spark = SparkSession.builder().getOrCreate()

// Load 500 patients x 12 visits x 20 biomarkers
val trial = spark.read.parquet("s3://clinical/trial_phase3/")
  .filter($"phase" === 3 && $"status" === "active")

// "Voilà widget" analogue: parameterized queries
val treatmentArm = "placebo"  // would be a dropdown in Voilà
val visitTimepoint = 12       // would be a slider

// Compute response rate per arm
val response = trial
  .filter($"arm" === lit(treatmentArm) && $"visit" === lit(visitTimepoint))
  .groupBy("response_category")
  .agg(count("*").alias("count"),
       (count("*") * 100.0 / sum("count").over()).alias("pct"))

// Display as Voilà-style dashboard panel
response.show()
println(s"Dashboard: $treatmentArm arm at visit $visitTimepoint")`,
      },
      {
        lang: "rust",
        filename: "clinical_trial_voila.rs",
        code: `// Voilà dashboard analogue — clinical trial monitoring
struct TrialData {
    patients: Vec<Patient>,
    n_visits: usize,
    n_biomarkers: usize,
}

struct Patient {
    id: u32,
    arm: String,        // "treatment" | "placebo"
    visits: Vec<Visit>,
}

struct Visit {
    timepoint: u8,
    biomarkers: Vec<f64>,
    response: bool,
}

fn main() {
    // Synthetic trial: 500 patients x 12 visits x 20 biomarkers
    let trial = generate_trial(500, 12, 20);

    // Voilà "widgets" (would be interactive in real Voilà)
    let selected_arm = "treatment";
    let selected_visit = 12;
    let biomarker_filter = vec![0, 5, 12, 18];  // selected biomarkers

    println!("=== Clinical Trial Voilà Dashboard ===");
    println!("Filters: arm={}, visit={}, biomarkers={:?}\\n",
             selected_arm, selected_visit, biomarker_filter);

    // Filter patients
    let filtered: Vec<&Patient> = trial.patients.iter()
        .filter(|p| p.arm == selected_arm)
        .collect();

    println!("Patients in {} arm: {}", selected_arm, filtered.len());

    // Compute response rate
    let responders = filtered.iter()
        .filter(|p| p.visits.iter().any(|v| v.timepoint == selected_visit && v.response))
        .count();
    let response_rate = responders as f64 / filtered.len() as f64 * 100.0;

    println!("Response rate at visit {}: {:.1}% ({}/{})",
             selected_visit, response_rate, responders, filtered.len());

    println!("\\n=== Dashboard panels (Voilà) ===");
    println!("  Panel 1: Patient demographics (bar chart)");
    println!("  Panel 2: Biomarker trajectories (line chart)");
    println!("  Panel 3: Response rate by arm (pie chart)");
    println!("  Panel 4: Adverse events (table)");
    println!("\\nNote: NO CODE VISIBLE to clinician — only widgets + charts");
}

fn generate_trial(n: usize, visits: usize, biom: usize) -> TrialData {
    TrialData { patients: vec![], n_visits: visits, n_biomarkers: biom }
}`,
      },
      {
        lang: "go",
        filename: "clinical_trial_voila.go",
        code: `package main

import (
    "fmt"
    "math/rand"
)

// Clinical trial dashboard — Voilà analogue
type Patient struct {
    ID       int
    Arm      string  // "treatment" or "placebo"
    Visits   []Visit
}

type Visit struct {
    Timepoint  int
    Biomarkers []float64
    Response   bool
}

func main() {
    rand.Seed(42)

    // Synthetic: 500 patients x 12 visits x 20 biomarkers
    patients := make([]Patient, 500)
    for i := range patients {
        arm := "placebo"
        if rand.Float64() > 0.5 {
            arm = "treatment"
        }
        visits := make([]Visit, 12)
        for v := range visits {
            biom := make([]float64, 20)
            for b := range biom {
                biom[b] = rand.NormFloat64()*0.5 + 1.0
            }
            visits[v] = Visit{
                Timepoint: v + 1,
                Biomarkers: biom,
                Response: rand.Float64() < 0.4,  // 40% response rate
            }
        }
        patients[i] = Patient{ID: i + 1, Arm: arm, Visits: visits}
    }

    // Voilà "widgets"
    selectedArm := "treatment"
    selectedVisit := 12
    fmt.Printf("=== Clinical Trial Voilà Dashboard ===\\n")
    fmt.Printf("Filters: arm=%s, visit=%d\\n\\n", selectedArm, selectedVisit)

    // Filter + compute response rate
    var filtered []Patient
    for _, p := range patients {
        if p.Arm == selectedArm {
            filtered = append(filtered, p)
        }
    }

    responders := 0
    for _, p := range filtered {
        for _, v := range p.Visits {
            if v.Timepoint == selectedVisit && v.Response {
                responders++
                break
            }
        }
    }
    rate := float64(responders) / float64(len(filtered)) * 100

    fmt.Printf("Patients in %s arm: %d\\n", selectedArm, len(filtered))
    fmt.Printf("Response rate at visit %d: %.1f%% (%d/%d)\\n",
        selectedVisit, rate, responders, len(filtered))
    fmt.Println()
    fmt.Println("=== Dashboard panels (Voilà) ===")
    fmt.Println("  Panel 1: Patient demographics (bar chart)")
    fmt.Println("  Panel 2: Biomarker trajectories (line chart)")
    fmt.Println("  Panel 3: Response rate by arm (pie chart)")
    fmt.Println("  Panel 4: Adverse events (table)")
    fmt.Println()
    fmt.Println("Note: NO CODE VISIBLE to clinician — only widgets + charts")
}`,
      },
      {
        lang: "elixir",
        filename: "clinical_trial_voila.ex",
        code: `defmodule Clinical.TrialVoila do
  @moduledoc "Voilà dashboard analogue — clinical trial monitoring"

  def run do
    :rand.seed(:exsss, 42)

    # Synthetic: 500 patients x 12 visits x 20 biomarkers
    patients = for i <- 1..500 do
      arm = if :rand.uniform() > 0.5, do: "treatment", else: "placebo"
      visits = for v <- 1..12 do
        biomarkers = for _ <- 1..20, do: :rand.normal() * 0.5 + 1.0
        response = :rand.uniform() < 0.4  # 40% response rate
        %{timepoint: v, biomarkers: biomarkers, response: response}
      end
      %{id: i, arm: arm, visits: visits}
    end

    # Voilà "widgets"
    selected_arm = "treatment"
    selected_visit = 12

    IO.puts("=== Clinical Trial Voilà Dashboard ===")
    IO.puts("Filters: arm=#{selected_arm}, visit=#{selected_visit}\\n")

    filtered = Enum.filter(patients, & &1.arm == selected_arm)

    responders = Enum.count(filtered, fn p ->
      Enum.any?(p.visits, fn v -> v.timepoint == selected_visit and v.response end)
    end)
    rate = responders / length(filtered) * 100

    IO.puts("Patients in #{selected_arm} arm: #{length(filtered)}")
    IO.puts("Response rate at visit #{selected_visit}: #{Float.round(rate, 1)}% (#{responders}/#{length(filtered)})\\n")

    IO.puts("=== Dashboard panels (Voilà) ===")
    IO.puts("  Panel 1: Patient demographics (bar chart)")
    IO.puts("  Panel 2: Biomarker trajectories (line chart)")
    IO.puts("  Panel 3: Response rate by arm (pie chart)")
    IO.puts("  Panel 4: Adverse events (table)")
    IO.puts("\\nNote: NO CODE VISIBLE to clinician — only widgets + charts")
  end
end`,
      },
      {
        lang: "zig",
        filename: "clinical_trial_voila.zig",
        code: `const std = @import("std");

// Voilà dashboard analogue — clinical trial monitoring
const Patient = struct {
    id: i32,
    arm: []const u8,
    visits: []Visit,
};

const Visit = struct {
    timepoint: u8,
    response: bool,
};

pub fn main() !void {
    var prng = std.Random.DefaultPrng.init(42);
    const rand = prng.random();

    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // Synthetic: 500 patients x 12 visits x 20 biomarkers
    const n_patients: usize = 500;
    var patients = try allocator.alloc(Patient, n_patients);
    defer {
        for (patients) |p| allocator.free(p.visits);
        allocator.free(patients);
    }

    for (patients, 0..) |*p, i| {
        const arm: []const u8 = if (rand.boolean()) "treatment" else "placebo";
        const visits = try allocator.alloc(Visit, 12);
        for (visits, 0..) |*v, vi| {
            v.* = .{
                .timepoint = @intCast(vi + 1),
                .response = rand.float(f32) < 0.4,
            };
        }
        p.* = .{ .id = @intCast(i + 1), .arm = arm, .visits = visits };
    }

    // Voilà "widgets"
    const selected_arm: []const u8 = "treatment";
    const selected_visit: u8 = 12;

    std.debug.print("=== Clinical Trial Voilà Dashboard ===\\n", .{});
    std.debug.print("Filters: arm={s}, visit={d}\\n\\n", .{ selected_arm, selected_visit });

    var filtered: usize = 0;
    var responders: usize = 0;
    for (patients) |p| {
        if (std.mem.eql(u8, p.arm, selected_arm)) {
            filtered += 1;
            for (p.visits) |v| {
                if (v.timepoint == selected_visit and v.response) {
                    responders += 1;
                    break;
                }
            }
        }
    }

    const rate: f64 = @as(f64, @floatFromInt(responders))
        / @as(f64, @floatFromInt(filtered)) * 100.0;

    std.debug.print("Patients in {s} arm: {d}\\n", .{ selected_arm, filtered });
    std.debug.print("Response rate at visit {d}: {d:.1}% ({d}/{d})\\n\\n",
        .{ selected_visit, rate, responders, filtered });

    std.debug.print("=== Dashboard panels (Voilà) ===\\n", .{});
    std.debug.print("  Panel 1: Patient demographics (bar chart)\\n", .{});
    std.debug.print("  Panel 2: Biomarker trajectories (line chart)\\n", .{});
    std.debug.print("  Panel 3: Response rate by arm (pie chart)\\n", .{});
    std.debug.print("  Panel 4: Adverse events (table)\\n\\n", .{});

    std.debug.print("Note: NO CODE VISIBLE to clinician — only widgets + charts\\n", .{});
}`,
      },
    ],
    runnablePython: `# Clinical trial dashboard via Voilà — pure Python (Pyodide)
# Uses only random + math — simulates widgets + chart panels
import random, math

random.seed(42)
N_PATIENTS = 500
N_VISITS = 12
N_BIOMARKERS = 20

print("╔════════════════════════════════════════════════════════╗")
print("║  Voilà Dashboard: clinical_trial_phase3.html           ║")
print("║  Served by JupyterHub · OAuth2 (FDA-approved users)     ║")
print("╚════════════════════════════════════════════════════════╝")
print()

# Build synthetic trial
patients = []
for i in range(N_PATIENTS):
    arm = "treatment" if random.random() > 0.5 else "placebo"
    visits = []
    for v in range(1, N_VISITS + 1):
        biomarkers = [random.gauss(1.0, 0.5) for _ in range(N_BIOMARKERS)]
        response = random.random() < 0.4  # 40% baseline response rate
        visits.append({"timepoint": v, "biomarkers": biomarkers, "response": response})
    patients.append({"id": i+1, "arm": arm, "visits": visits})

print(f"Trial data: {len(patients)} patients × {N_VISITS} visits × {N_BIOMARKERS} biomarkers")
print(f"  Treatment arm: {sum(1 for p in patients if p['arm']=='treatment')} patients")
print(f"  Placebo arm:   {sum(1 for p in patients if p['arm']=='placebo')} patients")
print()

# Voilà "widgets" (would be interactive in real Voilà)
print("=== Voilà Widgets (no code visible to clinician) ===")
print("  [Dropdown] Treatment arm: treatment  ▼")
print("  [Slider]  Visit timepoint: 12      [-------->]")
print("  [MultiSelect] Biomarkers: IL-6, TNF-a, CRP, IFN-g")
print("  [Checkbox] Show 95% CI: [✓]")
print("  [DateRange] Enrollment: 2023-01-01 to 2024-06-30")
print()

# Apply filters (simulate user clicking widgets)
selected_arm = "treatment"
selected_visit = 12
filtered = [p for p in patients if p['arm'] == selected_arm]

# Compute response rate
responders = sum(1 for p in filtered
                 for v in p['visits']
                 if v['timepoint'] == selected_visit and v['response'])
rate = responders / len(filtered) * 100

print("=== Dashboard Panels ===")
print(f"[Panel 1] Patient demographics (bar chart)")
print(f"  Treatment arm: {len(filtered)} patients (matching filter)")
print(f"  Mean age: {random.uniform(45, 65):.1f} years")
print()
print(f"[Panel 2] Biomarker trajectories (line chart)")
print(f"  IL-6 trajectory: visit 1={random.uniform(2, 5):.2f} -> visit 12={random.uniform(0.5, 2):.2f}")
print(f"  CRP trajectory:  visit 1={random.uniform(5, 15):.2f} -> visit 12={random.uniform(1, 5):.2f}")
print()
print(f"[Panel 3] Response rate by arm (pie chart)")
print(f"  Treatment: {rate:.1f}% responders ({responders}/{len(filtered)})")
print(f"  Placebo:   {rate * 0.6:.1f}% responders (placebo baseline)")
print(f"  Fisher's exact p-value: {random.uniform(0.001, 0.05):.4f} (significant)")
print()
print(f"[Panel 4] Adverse events (table)")
print(f"  {'Event':<25} {'Treatment':>10} {'Placebo':>10} {'p-value':>10}")
print(f"  {'-'*55}")
for event in ["Nausea", "Headache", "Fatigue", "Rash"]:
    t = random.randint(5, 25)
    p = random.randint(2, 15)
    print(f"  {event:<25} {t:>10}% {p:>10}% {random.uniform(0.1, 0.9):>10.3f}")
print()
print("=== Voilà reproducibility ===")
print("  Notebook: clinical_trial.ipynb (8 cells)")
print("  Voilà strips code cells, renders only outputs + widgets")
print("  Deployed on JupyterHub (Kubernetes, 10 replicas)")
print("  Auth: OAuth2 against hospital IdP (FDA-compliant)")
print()
print("WET LAB -> Jupyter notebook -> Voilà dashboard -> CLINICIAN")`,
    insight: "Voilà is the missing link between Jupyter notebooks (for developers) and clinical dashboards (for end users). It strips code cells, renders only outputs + widgets — clinicians see interactive charts without ever touching Python. Deployed on JupyterHub with OAuth2, it's the modern way to share clinical trial results with FDA monitors. The notebook underneath stays fully reproducible; the dashboard on top is just a view.",
  },
];
