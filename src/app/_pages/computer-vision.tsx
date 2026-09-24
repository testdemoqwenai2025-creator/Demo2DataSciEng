"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import {
  Cpu, Layers, Zap, TrendingUp, Terminal,
  Brain, Network, Activity, Image as ImageIcon,
} from "lucide-react";

const KPIS = [
  { label: "Core operation", value: "conv2d", hint: "Y[i,j] = Σ_{u,v,c} X[i+u,j+v,c] · K[u,v,c] + b", deltaTone: "flat" as const },
  { label: "ViT patch size", value: "16×16", hint: "Standard ViT: 224×224 image → 196 patches", deltaTone: "flat" as const },
  { label: "ResNet-50 params", value: "25.6M", hint: "CNN workhorse — ImageNet winner 2015", deltaTone: "flat" as const },
  { label: "Hardware", value: "Tensor cores", hint: "Same A100 FLOPS for conv & attention — both are matmul", deltaTone: "flat" as const },
];

// ============================================================
// Animated 3D Convolution (kernel sliding over feature map)
// ============================================================
function ConvolutionAnimation() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setStep((s) => (s + 1) % 9), 700);
    return () => clearInterval(interval);
  }, []);

  // 6x6 input image (synthetic values 0-9)
  const input = [
    [1, 2, 0, 3, 1, 4],
    [0, 5, 3, 2, 1, 0],
    [2, 1, 4, 5, 2, 3],
    [3, 0, 1, 4, 5, 2],
    [1, 4, 2, 0, 3, 5],
    [0, 2, 3, 1, 4, 2],
  ];
  // 3x3 kernel (Sobel-ish edge detector)
  const kernel = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ];
  // 4x4 output (no padding, stride 1)
  const output = [
    [4, 5, 3, 7],
    [3, 6, 4, 5],
    [2, 4, 6, 8],
    [5, 3, 7, 4],
  ];

  // step 0-3: kernel at position (0,0), (0,1), (0,2), (0,3) — row 0
  // step 4-8: row 1 (positions 0..3) then row 2 (positions 0..3) etc
  const ki = Math.floor(step / 4);
  const kj = step % 4;

  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <style>{`
        .conv-3d { perspective: 800px; }
        .conv-stage { transform: rotateX(18deg); transform-style: preserve-3d; }
      `}</style>
      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Layers className="h-4 w-4 text-primary" />
        Convolution in motion — kernel sliding over input
      </p>
      <div className="conv-3d">
        <div className="conv-stage flex justify-center items-start gap-6">
          {/* Input + kernel overlay */}
          <div>
            <p className="text-[10px] text-muted-foreground text-center mb-1.5">Input (6×6)</p>
            <div className="inline-block">
              {input.map((row, i) => (
                <div key={i} className="flex">
                  {row.map((v, j) => {
                    const inKernel = i >= ki && i < ki + 3 && j >= kj && j < kj + 3;
                    const relI = i - ki;
                    const relJ = j - kj;
                    const kVal = inKernel ? kernel[relI][relJ] : 0;
                    return (
                      <motion.div
                        key={`${i}-${j}`}
                        animate={{
                          backgroundColor: inKernel
                            ? kVal > 0
                              ? "oklch(0.55 0.16 165 / 0.35)"
                              : kVal < 0
                              ? "oklch(0.6 0.20 25 / 0.30)"
                              : "oklch(0.7 0 0 / 0.20)"
                            : "oklch(0.7 0 0 / 0.10)",
                          scale: inKernel ? 1.08 : 1,
                        }}
                        className="w-7 h-7 flex items-center justify-center text-[10px] font-mono border border-border/40 rounded-sm"
                      >
                        {v}
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
            <p className="text-[9px] text-muted-foreground text-center mt-1.5">
              Green = kernel +, Red = kernel −, Gray = 0
            </p>
          </div>

          {/* Kernel */}
          <div>
            <p className="text-[10px] text-muted-foreground text-center mb-1.5">Kernel (3×3)</p>
            <div className="inline-block p-1.5 rounded border border-primary/40 bg-primary/5">
              {kernel.map((row, i) => (
                <div key={i} className="flex">
                  {row.map((v, j) => (
                    <motion.div
                      key={`${i}-${j}`}
                      animate={{
                        scale: 1.1,
                        boxShadow: "0 0 0 2px oklch(0.55 0.16 165 / 0.6)",
                      }}
                      className="w-7 h-7 flex items-center justify-center text-[10px] font-mono font-bold border border-border/40 rounded-sm"
                    >
                      {v > 0 ? `+${v}` : v}
                    </motion.div>
                  ))}
                </div>
              ))}
            </div>
            <p className="text-[9px] text-muted-foreground text-center mt-1.5 font-mono">
              Sobel-x edge detector
            </p>
          </div>

          {/* Output */}
          <div>
            <p className="text-[10px] text-muted-foreground text-center mb-1.5">Output (4×4)</p>
            <div className="inline-block">
              {output.map((row, i) => (
                <div key={i} className="flex">
                  {row.map((v, j) => {
                    const isCurrent = i === ki && j === kj;
                    const isPast = i < ki || (i === ki && j < kj);
                    return (
                      <motion.div
                        key={`${i}-${j}`}
                        animate={{
                          backgroundColor: isCurrent
                            ? "oklch(0.55 0.16 165 / 0.5)"
                            : isPast
                            ? "oklch(0.7 0 0 / 0.18)"
                            : "oklch(0.7 0 0 / 0.05)",
                          scale: isCurrent ? 1.15 : 1,
                        }}
                        className="w-7 h-7 flex items-center justify-center text-[10px] font-mono border border-border/40 rounded-sm"
                      >
                        {isPast || isCurrent ? v : "·"}
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
            <p className="text-[9px] text-muted-foreground text-center mt-1.5">
              Filled as kernel slides
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-center gap-2 mt-3">
        <span className="text-[10px] px-2 py-0.5 rounded bg-primary text-primary-foreground font-mono">
          step ({ki},{kj}) → output[ki][kj]
        </span>
        <span className="text-[10px] text-muted-foreground">
          stride=1, padding=0 → (6−3+1)² = 16 outputs
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        Each output cell = weighted sum of a 3×3 region of the input. The kernel is the learnable filter.
        Different kernels detect different features: edges, corners, textures, colours.
      </p>
    </div>
  );
}

// ============================================================
// CNN Architecture Evolution (LeNet → AlexNet → VGG → ResNet → ViT)
// ============================================================
function ArchitectureTimeline() {
  const architectures = [
    { name: "LeNet-5", year: "1998", params: "60K", key: "Conv + pool + FC. First CNN. MNIST digits.", color: "var(--chart-2)" },
    { name: "AlexNet", year: "2012", params: "60M", key: "ReLU + dropout + GPU. ImageNet winner.", color: "var(--chart-3)" },
    { name: "VGG-16", year: "2014", params: "138M", key: "3×3 convs stacked deep. Simple, uniform.", color: "var(--chart-4)" },
    { name: "ResNet-50", year: "2015", params: "25.6M", key: "Skip connections. 152 layers trainable. Workhorse.", color: "var(--chart-5)" },
    { name: "EfficientNet", year: "2019", params: "66M", key: "Compound scaling (depth/width/resolution).", color: "var(--chart-1)" },
    { name: "ConvNeXt", year: "2022", params: "89M", key: "Modernised conv — matches ViT, same data.", color: "var(--chart-2)" },
    { name: "ViT-22B", year: "2023", params: "22B", key: "Pure transformer. Scales better with data.", color: "var(--chart-3)" },
    { name: "CLIP / SigLIP", year: "2024+", params: "1-7B", key: "Multi-modal. Image+text joint embeddings.", color: "var(--chart-4)" },
  ];
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        25 years of vision architectures. Each line is a top-of-class model — the key innovation, parameter count,
        and what changed. Notice ViT-22B is 350,000× larger than LeNet-5 — same mathematical structure (matmul),
        different scale.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/60">
              <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Year</th>
              <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Architecture</th>
              <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Params</th>
              <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Key innovation</th>
            </tr>
          </thead>
          <tbody>
            {architectures.map((a) => (
              <tr key={a.name} className="border-b border-border/30">
                <td className="px-2 py-1.5 font-mono text-[11px]">{a.year}</td>
                <td className="px-2 py-1.5">
                  <span
                    className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold"
                    style={{ color: a.color }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.color }} />
                    {a.name}
                  </span>
                </td>
                <td className="px-2 py-1.5 font-mono text-[11px]">{a.params}</td>
                <td className="px-2 py-1.5 text-[11px] text-muted-foreground">{a.key}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const CONV2D_DEMO = `# 2D Convolution — the core operation of CNNs
# Implements conv2d from scratch, no libraries needed
# Same algorithm as torch.nn.functional.conv2d (but slower)

import random

def conv2d(input_img, kernel, stride=1, padding=0):
    """
    2D convolution (cross-correlation in DL terms).
    
    input_img: H x W (grayscale for simplicity)
    kernel:    kH x kW
    output:    ((H + 2*pad - kH) // stride + 1) x similar for W
    
    Formula: Y[i,j] = sum_{u,v} X[i*stride + u - pad, j*stride + v - pad] * K[u,v] + b
    """
    H, W = len(input_img), len(input_img[0])
    kH, kW = len(kernel), len(kernel[0])
    
    # Apply padding (zero-pad)
    if padding > 0:
        padded = [[0] * (W + 2*padding) for _ in range(H + 2*padding)]
        for i in range(H):
            for j in range(W):
                padded[i+padding][j+padding] = input_img[i][j]
        input_img = padded
        H, W = len(input_img), len(input_img[0])
    
    out_h = (H - kH) // stride + 1
    out_w = (W - kW) // stride + 1
    output = [[0.0]*out_w for _ in range(out_h)]
    
    for i in range(out_h):
        for j in range(out_w):
            s = 0.0
            for u in range(kH):
                for v in range(kW):
                    s += input_img[i*stride + u][j*stride + v] * kernel[u][v]
            output[i][j] = s
    return output

def maxpool2d(input_img, size=2, stride=2):
    "Max pooling — downsamples by taking max over windows."
    H, W = len(input_img), len(input_img[0])
    out_h = (H - size) // stride + 1
    out_w = (W - size) // stride + 1
    output = [[0.0]*out_w for _ in range(out_h)]
    for i in range(out_h):
        for j in range(out_w):
            m = float('-inf')
            for u in range(size):
                for v in range(size):
                    val = input_img[i*stride + u][j*stride + v]
                    if val > m:
                        m = val
            output[i][j] = m
    return output

# 6x6 "image" — could be a 6x6 region of a feature map
random.seed(42)
image = [[random.randint(0, 9) for _ in range(6)] for _ in range(6)]

# 3 kernels: edge-x, edge-y, blur
sobel_x = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]
sobel_y = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]]
blur    = [[1/9, 1/9, 1/9], [1/9, 1/9, 1/9], [1/9, 1/9, 1/9]]

print("=" * 60)
print("2D Convolution — 3 Kernels (Pyodide)")
print("=" * 60)

print("\\nInput image (6×6):")
for row in image:
    print("  " + " ".join(f"{v:2d}" for v in row))

# Apply each kernel
for name, kernel in [("Sobel-X (vertical edges)", sobel_x),
                     ("Sobel-Y (horizontal edges)", sobel_y),
                     ("Blur (3×3 average)", blur)]:
    out = conv2d(image, kernel)
    print(f"\\nAfter conv with {name} → {len(out)}×{len(out[0])} output:")
    for row in out:
        print("  " + " ".join(f"{v:5.1f}" for v in row))

# Stack outputs as 3-channel feature map, then maxpool
feat_map = [conv2d(image, sobel_x), conv2d(image, sobel_y), conv2d(image, blur)]
print(f"\\nStacked: {len(feat_map)} channels × {len(feat_map[0])}×{len(feat_map[0][0])}")
print("  (this is what a Conv2d(3, 3, kernel_size=3) layer produces)")

# Max-pool each channel
pooled = [maxpool2d(ch, size=2, stride=2) for ch in feat_map]
print(f"\\nAfter maxpool(2,2): {len(pooled)} channels × {len(pooled[0])}×{len(pooled[0][0])}")
print("  Each channel halved in H,W — keeps dominant features, drops noise.")
print("  This is the 'hierarchical feature' flow: edges → motifs → objects.")

print(f"\\n{'=' * 60}")
print("PRODUCTION FORMULA:")
print("  Conv2d output shape = (batch, out_channels,")
print("    (H + 2*pad - kernel) // stride + 1,")
print("    (W + 2*pad - kernel) // stride + 1)")
print("  Parameters = out_channels * (in_channels * kH * kW + 1)")
print(f"\\n  Conv2d(3, 64, 3, padding=1) has {3 * (64 * 3 * 3 + 1):,} params (first layer)")
print("  Total ResNet-50: 25.6M params, all from this pattern stacked deep.")
print("=" * 60)`;

const BACKPROP_DEMO = `# Convolutional Backpropagation — how kernels are learned
# Shows the gradient flow: how the kernel changes given a loss

import random, math

def conv2d(X, K, stride=1):
    "Forward: Y = X * K (cross-correlation)"
    H, W = len(X), len(X[0])
    kH, kW = len(K), len(K[0])
    out_h = (H - kH) // stride + 1
    out_w = (W - kW) // stride + 1
    Y = [[0.0]*out_w for _ in range(out_h)]
    for i in range(out_h):
        for j in range(out_w):
            s = 0.0
            for u in range(kH):
                for v in range(kW):
                    s += X[i*stride+u][j*stride+v] * K[u][v]
            Y[i][j] = s
    return Y

def conv2d_input_grad(dY, K, X_shape, stride=1):
    """
    Backward wrt input: dX = conv2d(dY, rot180(K), padding=kH-1)
    This is the transpose convolution — used in deconvnets, segmentation.
    """
    H, W = X_shape
    kH, kW = len(K), len(K[0])
    dY_h, dY_w = len(dY), len(dY[0])
    dX = [[0.0]*W for _ in range(H)]
    for i in range(dY_h):
        for j in range(dY_w):
            for u in range(kH):
                for v in range(kW):
                    if 0 <= i*stride+u < H and 0 <= j*stride+v < W:
                        dX[i*stride+u][j*stride+v] += dY[i][j] * K[u][v]
    return dX

def conv2d_kernel_grad(X, dY, K_shape, stride=1):
    """
    Backward wrt kernel: dK[u,v] = sum over (i,j) of X[i+u, j+v] * dY[i,j]
    This is the gradient we use to UPDATE the kernel via SGD.
    """
    kH, kW = K_shape
    dK = [[0.0]*kW for _ in range(kH)]
    for u in range(kH):
        for v in range(kW):
            s = 0.0
            for i in range(len(dY)):
                for j in range(len(dY[0])):
                    s += X[i*stride+u][j*stride+v] * dY[i][j]
            dK[u][v] = s
    return dK

# Set up a tiny CNN: 1 conv layer + ReLU + MSE loss
random.seed(42)
# 5x5 input (synthetic)
X = [[random.gauss(0, 1) for _ in range(5)] for _ in range(5)]
# 3x3 random kernel (initial weights)
K = [[random.gauss(0, 0.1) for _ in range(3)] for _ in range(3)]
# Target output (what we want Y to be — supervised signal)
target = [[1.0, 0.5, 0.0], [0.5, 1.0, 0.5], [0.0, 0.5, 1.0]]

def loss_mse(Y, target):
    "MSE loss = mean((Y - target)^2)"
    n = len(Y) * len(Y[0])
    s = 0.0
    for i in range(len(Y)):
        for j in range(len(Y[0])):
            s += (Y[i][j] - target[i][j]) ** 2
    return s / n

def loss_grad(Y, target):
    "dL/dY = 2/N * (Y - target)"
    n = len(Y) * len(Y[0])
    return [[2 * (Y[i][j] - target[i][j]) / n for j in range(len(Y[0]))] for i in range(len(Y))]

print("=" * 60)
print("Convolutional Backprop — Kernel Learning Demo")
print("=" * 60)

# Training loop
lr = 0.05
for epoch in range(30):
    # Forward
    Y = conv2d(X, K)
    # ReLU
    Y_relu = [[max(0.0, Y[i][j]) for j in range(len(Y[0]))] for i in range(len(Y))]
    # Loss
    L = loss_mse(Y_relu, target)
    # dL/dY (after ReLU: gradient is 0 where Y < 0)
    dY = loss_grad(Y_relu, target)
    for i in range(len(Y)):
        for j in range(len(Y[0])):
            if Y[i][j] < 0:
                dY[i][j] = 0
    # Backward: dK = conv2d_kernel_grad(X, dY)
    dK = conv2d_kernel_grad(X, dY, (3, 3))
    # Update: K -= lr * dK
    for i in range(3):
        for j in range(3):
            K[i][j] -= lr * dK[i][j]
    if epoch % 5 == 0 or epoch == 29:
        print(f"  Epoch {epoch:2d}: loss = {L:.4f}, K[0][0] = {K[0][0]:+.4f}")

print(f"\\n{'=' * 60}")
print("BACKPROP MECHANICS:")
print("  Forward:  Y = X * K       (conv2d)")
print("  Loss:     L = MSE(Y, target)")
print("  dL/dY:    2/N * (Y - target)")
print("  ReLU:     dL/dY[i,j] *= 0 if Y[i,j] < 0")
print("  dL/dK:    dK[u,v] = Σ_ij X[i+u, j+v] * dY[i,j]")
print("            (cross-correlation of X with dY)")
print("  Update:   K -= lr * dK   (gradient descent)")
print("\\n  Each epoch, the kernel 'moves' to reduce the loss.")
print("  After 30 epochs: kernel has converged toward the filter")
print("  that maps X → target.")
print("=" * 60)`;

const PYTORCH_CODE = `import torch
import torch.nn as nn
import torch.nn.functional as F

# ============================================================
# Conv2d layer — what's actually happening under the hood
# ============================================================

class Conv2d(nn.Module):
    """Conv2d implemented as a learnable convolution layer.
    
    Shape: (N, C_in, H, W) -> (N, C_out, H_out, W_out)
    where H_out = (H + 2*pad - kH) // stride + 1
    
    Parameters: C_out * (C_in * kH * kW + 1)  -- the +1 is the bias
    """
    def __init__(self, in_channels, out_channels, kernel_size, 
                 stride=1, padding=0):
        super().__init__()
        self.stride = stride
        self.padding = padding
        self.kH, self.kW = (kernel_size, kernel_size) \\
            if isinstance(kernel_size, int) else kernel_size
        # Learnable kernel + bias
        self.weight = nn.Parameter(
            torch.randn(out_channels, in_channels, self.kH, self.kW) 
            * (2 / (in_channels * self.kH * self.kW) ** 0.5)  # Kaiming init
        )
        self.bias = nn.Parameter(torch.zeros(out_channels))
    
    def forward(self, x):
        # x: (N, C_in, H, W)
        # Use F.conv2d for production speed (cuDNN underneath)
        return F.conv2d(x, self.weight, self.bias, 
                        stride=self.stride, padding=self.padding)
    
    def backward(self, grad_output):
        # PyTorch autograd handles this — but conceptually:
        # dW = conv2d_kernel_grad(x, grad_output)  ← see Pyodide demo
        # dx = conv2d_input_grad(grad_output, weight)  ← transpose conv
        pass


# ============================================================
# A small CNN — LeNet-style, the architecture that started it all
# ============================================================

class LeNet5(nn.Module):
    """LeNet-5 (Yann LeCun, 1998) — first production CNN.
    Used by US Postal Service to read handwritten digits.
    
    Architecture:
        Input: 1×32×32 (grayscale digit)
        Conv1: 1→6 channels, 5×5 kernel  →  6×28×28
        Pool:  2×2 max, stride 2          →  6×14×14
        Conv2: 6→16 channels, 5×5 kernel  → 16×10×10
        Pool:  2×2 max, stride 2          → 16×5×5
        FC1:   16*5*5 = 400 → 120
        FC2:   120 → 84
        FC3:   84 → 10 (10 digits)
    
    Total params: ~60K (vs ViT-22B: 22B — 350,000× larger)
    """
    def __init__(self, num_classes=10):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 6, kernel_size=5)
        self.conv2 = nn.Conv2d(6, 16, kernel_size=5)
        self.fc1 = nn.Linear(16 * 5 * 5, 120)
        self.fc2 = nn.Linear(120, 84)
        self.fc3 = nn.Linear(84, num_classes)
    
    def forward(self, x):
        # Block 1: conv → tanh → pool
        x = F.max_pool2d(F.relu(self.conv1(x)), 2)
        # Block 2: conv → tanh → pool
        x = F.max_pool2d(F.relu(self.conv2(x)), 2)
        # Flatten (keep batch dim)
        x = x.flatten(1)
        # MLP head
        x = F.relu(self.fc1(x))
        x = F.relu(self.fc2(x))
        return self.fc3(x)


# ============================================================
# ViT — Vision Transformer (modern alternative)
# ============================================================

class PatchEmbedding(nn.Module):
    """ViT patch embedding: split image into 16x16 patches, linear project.
    
    Shape: (N, 3, 224, 224) -> (N, 196, 768)
    where 196 = (224/16)^2 patches, 768 = embedding dim
    """
    def __init__(self, img_size=224, patch_size=16, in_chans=3, embed_dim=768):
        super().__init__()
        self.num_patches = (img_size // patch_size) ** 2  # 196
        # A Conv2d with kernel_size=stride=patch_size IS a patch embedding!
        self.proj = nn.Conv2d(in_chans, embed_dim, 
                             kernel_size=patch_size, stride=patch_size)
    
    def forward(self, x):
        # x: (N, 3, 224, 224) -> (N, 768, 14, 14) -> (N, 196, 768)
        x = self.proj(x)  # conv2d: stride=patch_size means non-overlapping
        x = x.flatten(2).transpose(1, 2)  # (N, embed_dim, num_patches) -> (N, num_patches, embed_dim)
        return x


class ViTBlock(nn.Module):
    """One ViT block = LayerNorm -> MultiHeadAttention -> residual
                          -> LayerNorm -> MLP -> residual
    Identical to a Transformer encoder block (see /transformer page).
    """
    def __init__(self, dim=768, heads=12, mlp_dim=3072):
        super().__init__()
        self.norm1 = nn.LayerNorm(dim)
        self.attn = nn.MultiheadAttention(dim, heads, batch_first=True)
        self.norm2 = nn.LayerNorm(dim)
        self.mlp = nn.Sequential(
            nn.Linear(dim, mlp_dim),
            nn.GELU(),
            nn.Linear(mlp_dim, dim),
        )
    
    def forward(self, x):
        # Pre-norm transformer block
        h = self.norm1(x)
        a, _ = self.attn(h, h, h, need_weights=False)
        x = x + a
        h = self.norm2(x)
        x = x + self.mlp(h)
        return x


class VisionTransformer(nn.Module):
    """Full ViT: patch embed + positional enc + N blocks + head."""
    def __init__(self, img_size=224, patch_size=16, in_chans=3,
                 embed_dim=768, depth=12, heads=12, num_classes=1000):
        super().__init__()
        self.patch_embed = PatchEmbedding(img_size, patch_size, in_chans, embed_dim)
        num_patches = self.patch_embed.num_patches
        # CLS token (prepended)
        self.cls_token = nn.Parameter(torch.zeros(1, 1, embed_dim))
        # Positional embedding (learnable)
        self.pos_embed = nn.Parameter(torch.zeros(1, num_patches + 1, embed_dim))
        self.blocks = nn.ModuleList([ViTBlock(embed_dim, heads) for _ in range(depth)])
        self.norm = nn.LayerNorm(embed_dim)
        self.head = nn.Linear(embed_dim, num_classes)
    
    def forward(self, x):
        # (N, 3, 224, 224) -> (N, 196, 768)
        x = self.patch_embed(x)
        # Prepend CLS token
        cls = self.cls_token.expand(x.shape[0], -1, -1)
        x = torch.cat([cls, x], dim=1)  # (N, 197, 768)
        # Add positional embedding
        x = x + self.pos_embed
        # Transformer encoder
        for blk in self.blocks:
            x = blk(x)
        x = self.norm(x)
        # CLS token output → classification head
        return self.head(x[:, 0])  # (N, num_classes)


# ============================================================
# Hybrid architecture (ADR-026): CNN stem + ViT body
# ============================================================

class HybridViT(nn.Module):
    """
    ADR-026: hybrid architecture — CNN stem (cheap inductive bias) 
    + ViT body (scalable attention).
    
    The first 2-3 conv layers act as a 'tokeniser' — they extract local
    features cheaply, then the ViT body does global reasoning.
    """
    def __init__(self, num_classes=1000):
        super().__init__()
        # CNN stem: 3 conv + pool, 224x224 -> 14x14 feature map
        self.stem = nn.Sequential(
            nn.Conv2d(3, 64, 7, stride=2, padding=3),  # 224 -> 112
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.Conv2d(64, 128, 3, padding=1),         # 112 -> 112
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2),                            # 112 -> 56
            nn.Conv2d(128, 256, 3, padding=1),         # 56 -> 56
            nn.BatchNorm2d(256),
            nn.ReLU(),
            nn.MaxPool2d(4),                            # 56 -> 14
        )
        # Now treat 14x14 = 196 patches, 256 dim as ViT input
        self.vit = VisionTransformer(
            img_size=14, patch_size=1,  # patch_size=1: each pixel is a patch
            in_chans=256, embed_dim=256, depth=6, heads=8, num_classes=num_classes
        )
    
    def forward(self, x):
        x = self.stem(x)  # (N, 256, 14, 14)
        return self.vit(x)


# Sanity check
if __name__ == "__main__":
    # LeNet-5
    model = LeNet5()
    x = torch.randn(1, 1, 32, 32)
    out = model(x)
    print(f"LeNet-5: input {tuple(x.shape)} -> output {tuple(out.shape)}")
    print(f"  Parameters: {sum(p.numel() for p in model.parameters()):,}")
    
    # ViT
    vit = VisionTransformer()
    x = torch.randn(1, 3, 224, 224)
    out = vit(x)
    print(f"\\nViT: input {tuple(x.shape)} -> output {tuple(out.shape)}")
    print(f"  Parameters: {sum(p.numel() for p in vit.parameters()):,}")
    
    # Hybrid
    hybrid = HybridViT()
    x = torch.randn(1, 3, 224, 224)
    out = hybrid(x)
    print(f"\\nHybrid ViT: input {tuple(x.shape)} -> output {tuple(out.shape)}")
    print(f"  Parameters: {sum(p.numel() for p in hybrid.parameters()):,}")`;

export function ComputerVisionPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Computer Vision · CNNs → ViT"
        title="Computer Vision — Convolutional Networks to Vision Transformers"
        description="The math behind image understanding: 2D convolution (cross-correlation with learnable kernels), max pooling, convolutional backpropagation (gradient through kernel updates), and the ViT alternative (patches → transformer encoder). With low-level PyTorch implementations of Conv2d, LeNet-5, full VisionTransformer, and the ADR-026 hybrid architecture (CNN stem + ViT body). Code-oriented, mathematical, scientific."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><ImageIcon className="h-3 w-3" /> CNN + ViT</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Pyodide</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />)}
      </div>

      {/* 3D convolution animation */}
      <SectionCard title="Convolution in motion — kernel sliding over input" description="The 3×3 kernel slides across the 6×6 input. At each position, it computes a weighted sum of the 9 overlapping cells (kernel weights × input values). The output is a 4×4 feature map. The kernel IS the learnable filter — different kernels detect edges, corners, textures, colours." icon={<Layers className="h-5 w-5" />} badge="3D animation">
        <ConvolutionAnimation />
      </SectionCard>

      {/* Convolution math */}
      <SectionCard title="The convolution equation" description="The 2D convolution (technically cross-correlation in DL) formula. The output is computed by sliding the kernel over the input, multiplying elementwise, and summing. Padding adds zeros at the boundary to control output size; stride controls how far the kernel jumps between positions." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">Y[i, j] = Σ<sub>u=0</sub><sup>kH-1</sup> Σ<sub>v=0</sub><sup>kW-1</sup> Σ<sub>c=0</sub><sup>C-1</sup> X[i·stride + u − pad, j·stride + v − pad, c] · K[u, v, c] + b</p>
            <p className="text-[11px] text-muted-foreground mt-1">2D convolution with multi-channel input. The kernel K ∈ ℝ^(kH×kW×C_in×C_out) is the learnable parameter.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-border/60 p-2.5">
              <p className="font-semibold mb-1">Output shape</p>
              <p className="font-mono text-[11px]">(H + 2·pad − kH) / stride + 1</p>
              <p className="text-muted-foreground text-[11px] mt-1">For 6×6 input, 3×3 kernel, pad=0, stride=1 → 4×4 output. pad=1 → 6×6 output.</p>
            </div>
            <div className="rounded-md border border-border/60 p-2.5">
              <p className="font-semibold mb-1">Parameter count</p>
              <p className="font-mono text-[11px]">C_out × (C_in × kH × kW + 1)</p>
              <p className="text-muted-foreground text-[11px] mt-1">Conv2d(3, 64, 3): 3 × (64 × 9 + 1) = 1,728 params. Small! Depth comes from stacking.</p>
            </div>
            <div className="rounded-md border border-border/60 p-2.5">
              <p className="font-semibold mb-1">Receptive field</p>
              <p className="font-mono text-[11px]">RF(layer L) = RF(L-1) + (kL − 1) × ∏<sub>i&lt;L</sub> stride<sub>i</sub></p>
              <p className="text-muted-foreground text-[11px] mt-1">Grows with depth. 5 conv layers of 3×3 = RF of 11 — sees a third of a 32×32 image.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Pyodide conv2d demo */}
      <SectionCard title="Try it: 2D convolution + max pooling — 3 kernels (Pyodide)" description="Implements conv2d from scratch, applies 3 different kernels (Sobel-X for vertical edges, Sobel-Y for horizontal edges, blur for smoothing) to a 6×6 image, stacks the outputs as a multi-channel feature map, and max-pools them. This is one Conv2d + MaxPool block — the building block of every CNN." icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={CONV2D_DEMO} buttonLabel="Run conv2d demo (Pyodide)" />
      </SectionCard>

      {/* Architecture timeline */}
      <SectionCard title="Architecture timeline — LeNet to ViT-22B" description="25 years of vision architectures. Notice ViT-22B is 350,000× larger than LeNet-5 — same mathematical structure (matmul), different scale. The journey: convolutions (LeNet), GPU training (AlexNet), depth (VGG/ResNet), compound scaling (EfficientNet), modernised conv (ConvNeXt), pure attention (ViT), multi-modal (CLIP)." icon={<Activity className="h-5 w-5" />}>
        <ArchitectureTimeline />
      </SectionCard>

      {/* Convolutional backprop */}
      <SectionCard title="Convolutional backpropagation — how kernels are learned" description="The forward pass: Y = X ∗ K. The backward pass: dK = X ⊛ dY (cross-correlation of input with output gradient). The kernel is updated via gradient descent: K ← K − η · dK. This is the same chain rule as for MLPs, but the parameter-sharing structure of convolution makes the gradient a cross-correlation." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">∂L/∂K[u, v] = Σ<sub>i, j</sub> X[i + u, j + v] · ∂L/∂Y[i, j]</p>
            <p className="text-[11px] text-muted-foreground mt-1">Kernel gradient = cross-correlation of input with output gradient. Same as the forward pass with roles swapped.</p>
          </div>
          <div className="rounded-md border border-border/60 p-3 bg-muted/10">
            <p className="font-mono text-xs text-foreground/90 font-semibold mb-2">Three gradient rules:</p>
            <ul className="text-xs space-y-1 ml-3">
              <li><span className="font-mono text-primary">dK</span> = conv2d_kernel_grad(X, dY) — gradient wrt kernel (used to update weights)</li>
              <li><span className="font-mono text-primary">dX</span> = conv2d_input_grad(dY, K) — gradient wrt input (propagated to previous layer)</li>
              <li><span className="font-mono text-primary">db</span> = Σ<sub>i,j</sub> dY[i, j] — gradient wrt bias (simple sum)</li>
            </ul>
            <p className="text-[11px] text-muted-foreground mt-2">The magic: convolution + cross-correlation share the same mathematical structure, so backprop is just another convolution. GPUs run both forward and backward on the same tensor cores.</p>
          </div>
        </div>
      </SectionCard>

      {/* Pyodide backprop demo */}
      <SectionCard title="Try it: Convolutional backprop — train a 3×3 kernel (Pyodide)" description="Implements conv2d forward + conv2d_kernel_grad backward from scratch. Trains a single 3×3 kernel via SGD to map a 5×5 input to a 3×3 target. Watch the loss decrease and the kernel weights evolve. This is the EXACT mechanism PyTorch uses to train Conv2d layers (just slower — PyTorch uses cuDNN's optimised im2col + GEMM)." icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={BACKPROP_DEMO} buttonLabel="Run conv backprop (Pyodide)" />
      </SectionCard>

      {/* Low-level PyTorch */}
      <SectionCard title="Low-level PyTorch — Conv2d, LeNet-5, VisionTransformer, HybridViT (ADR-026)" description="The actual PyTorch implementations. Conv2d with Kaiming init. LeNet-5 (1998, 60K params). Full VisionTransformer with patch embedding + CLS token + positional encoding + 12 transformer blocks. HybridViT — the ADR-026 architecture with a CNN stem (cheap inductive bias) feeding a ViT body (scalable attention)." icon={<Cpu className="h-5 w-5" />} badge="low-level">
        <CodeBlock language="python" filename="vision_models.py" highlight={[14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259]} code={PYTORCH_CODE} />
      </SectionCard>

      {/* Hardware implications */}
      <SectionCard title="Hardware implications — both conv and attention are matmul" description="The Comp Sci & Materials page (#33) showed that matmul is the ONE operation that powers all AI. Convolutions can be implemented as im2col + matmul. Attention is matmul + softmax + matmul. The same A100 GPU runs both at 312 TFLOPS via tensor cores. ViT vs CNN is not a hardware question — both are matmul-bound." icon={<Cpu className="h-5 w-5" />}>
        <CodeBlock language="text" filename="vision_hardware.txt" code={`┌─────────────────────────────────────────────────────────────────────┐
│  VISION MODEL → HARDWARE MAPPING                                       │
│                                                                         │
│  Conv2d(3, 64, 3):                                                      │
│    im2col(X) → (batch*H_out*W_out, C_in*kH*kW) = (N*30*30, 27)          │
│    matmul(im2col(X), reshape(K, (27, 64)))  → (N*30*30, 64)             │
│    reshape → (N, 64, H_out, W_out)                                       │
│    Cost: N*30*30*27*64 FLOPs = 1.55M FLOPs per image                    │
│                                                                         │
│  ViT patch embed:                                                       │
│    Conv2d(3, 768, kernel=16, stride=16)  ← EXACTLY a Conv2d!            │
│    Output: (N, 768, 14, 14) → (N, 196, 768)                            │
│    Cost: N*14*14*3*768 = 451K FLOPs per image (smaller)                 │
│                                                                         │
│  ViT attention block (12 heads, d=768, seq=196):                        │
│    Q,K,V projections: 3 × (196 × 768 × 768) = 345M FLOPs               │
│    Attention: 2 × (196 × 196 × 768) = 59M FLOPs                        │
│    FFN: 2 × (196 × 768 × 3072) = 924M FLOPs                            │
│    Per block: 1.32B FLOPs   ×12 blocks = 15.8B FLOPs total             │
│                                                                         │
│  Both run on the same A100 tensor cores at 312 TFLOPS                  │
│  Conv im2col → matmul: same shape as ViT projection                     │
│  Attention → matmul: same shape as Conv im2col                          │
│                                                                         │
│  THE INSIGHT: the "CNN vs ViT" debate is a SOFTWARE question            │
│  (inductive bias vs data scale), not a HARDWARE question.               │
│  The hardware sees only matmul either way.                               │
└─────────────────────────────────────────────────────────────────────────┘`} />
      </SectionCard>

      {/* Insight */}
      <SectionCard title="My deeper thought: convolutions ARE learnable DSP filters" description="Convolutional neural networks rediscovered 50 years of digital signal processing (DSP) research. The Sobel edge detector, Gabor filters, wavelets — all hand-engineered convolutions. CNNs just make the filter coefficients learnable. ViT generalises further: it learns the filter AND the spatial weighting via attention." icon={<TrendingUp className="h-5 w-5" />} badge="Insight">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>The convolution operation <strong className="text-foreground/80">predates deep learning by decades</strong>. The discrete 2D convolution Y[i,j] = Σ X[i+u,j+v] · K[u,v] is the fundamental operation of digital signal processing — image filtering, audio equalisation, radar processing, medical imaging (CT, MRI reconstruction). The Sobel edge detector in the Pyodide demo above was published in 1968. Canny edge detection (1986). Gabor filters (1946). Wavelet transforms (1980s). All are convolutions with fixed (hand-engineered) kernels. What Yann LeCun did with LeNet-5 in 1998 was to make the kernel coefficients learnable via backpropagation — and the rest is history.</p>
          <p><strong className="text-foreground/80">This connects to the platform in three concrete ways:</strong> First, the platform's vision pipeline (ADR-026) takes dashboard screenshots and invoice scans — these go through convolutions that, when visualised, look exactly like the Sobel-X/Y filters in the Pyodide demo. The model rediscovers classical DSP filters because they're the optimal linear filters for low-level vision. Second, the platform's RAG pipeline (ADR-022) uses CLIP embeddings — CLIP's image encoder IS a Vision Transformer. The same attention mechanism that powers the LLM (see /transformer) powers the image encoder. pgvector stores text AND image embeddings in the same HNSW index — multi-modal retrieval is one index. Third, the platform's semantic layer (ADR-024) NL-to-SQL: when a user uploads a chart image and asks "what does this show?", the image is encoded by a ViT, the embedding retrieves similar chart descriptions via pgvector, and the LLM generates SQL grounded in those retrieved patterns. The vision pipeline IS a retrieval-augmented generation pipeline — just with images as the modality.</p>
          <p><strong className="text-foreground/80">The deep mathematical unification:</strong> convolution is a special case of attention where the attention weights are spatially-fixed (the kernel) rather than content-dependent (the softmax of QKᵀ). Or equivalently: attention is a "soft convolution" where the kernel is dynamically computed from the query. This is why ViT works — it generalises convolution by making the filter input-dependent. The platform's trajectory from CNN (ADR-026 fallback) to ViT (ADR-026 default) to multi-modal CLIP (ADR-026 future) is the same trajectory as the field: from fixed filters to learned filters to content-addressable filters. The Math.md mathematical structure (matmul + reduction + nonlinearity) is invariant under this trajectory.</p>
        </div>
      </SectionCard>

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("transformer")} className="text-sm text-primary hover:underline">→ Transformer (ViT IS a Transformer)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("comp-sci-materials")} className="text-sm text-primary hover:underline">→ Comp Sci & Materials (the hardware)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("neural-networks")} className="text-sm text-primary hover:underline">→ Neural Networks (the MLP foundation)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("rag-llms")} className="text-sm text-primary hover:underline">→ RAG (multi-modal pgvector)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">→ ADR-026 (hybrid vision architecture)</Link>
      </div>
    </div>
  );
}
