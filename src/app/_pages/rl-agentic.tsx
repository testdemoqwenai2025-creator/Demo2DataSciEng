"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { NextSteps } from "../_components/next-steps";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Brain, Cpu, Layers, Zap, TrendingUp, Terminal,
  Activity, Network, GitBranch, ArrowRight, Sparkles, RotateCw,
} from "lucide-react";

const KPIS = [
  { label: "RL algorithms", value: "4+", hint: "Q-learning · DQN · REINFORCE · PPO", deltaTone: "flat" as const },
  { label: "Agent loop", value: "S→A→R→S'", hint: "State → Action → Reward → Next State", deltaTone: "flat" as const },
  { label: "Agentic stages", value: "4", hint: "ReAct → CoT → ISR → Self-improve", deltaTone: "flat" as const },
  { label: "3D animations", value: "3", hint: "Agent loop + Q-table + reward landscape", deltaTone: "flat" as const },
];

// ============================================================
// 3D Agent-Environment Loop Animation
// ============================================================
function AgentLoopAnimation() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => (t + 1) % 4), 1200);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    { label: "Observe State", icon: "👁", color: "var(--chart-2)" },
    { label: "Take Action", icon: "⚡", color: "var(--chart-1)" },
    { label: "Receive Reward", icon: "🎁", color: "var(--chart-5)" },
    { label: "Update Policy", icon: "🔄", color: "var(--chart-3)" },
  ];

  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <style>{`
        .rl-3d { perspective: 600px; }
        .rl-card {
          transform: rotateX(15deg) rotateY(-10deg);
          transform-style: preserve-3d;
          transition: transform 0.3s;
        }
        .rl-card:hover { transform: rotateX(5deg) rotateY(0deg); }
      `}</style>
      <div className="rl-3d flex items-center justify-center py-4">
        <div className="rl-card flex flex-col items-center gap-3">
          {/* Agent box */}
          <motion.div
            animate={{ scale: tick === 3 ? 1.1 : 1, opacity: tick === 3 ? 1 : 0.7 }}
            className="rounded-lg border-2 border-primary bg-primary/10 px-6 py-3 text-center"
          >
            <p className="text-sm font-bold text-primary">AGENT</p>
            <p className="text-[10px] text-muted-foreground">π(a|s) — policy</p>
          </motion.div>
          {/* Arrows: Agent → Environment (action) */}
          <div className="flex items-center gap-1">
            <motion.div
              animate={{ opacity: tick === 1 ? 1 : 0.3 }}
              className="flex items-center gap-1"
            >
              <span className="text-[10px] font-mono text-foreground/60">action a</span>
              <ArrowRight className="h-3 w-3 text-primary" />
            </motion.div>
            <motion.div
              animate={{ opacity: tick === 3 ? 1 : 0.3 }}
              className="flex items-center gap-1"
            >
              <RotateCw className="h-3 w-3 text-violet-500" />
              <span className="text-[10px] font-mono text-foreground/60">update π</span>
            </motion.div>
          </div>
          {/* Environment box */}
          <motion.div
            animate={{ scale: tick === 0 ? 1.1 : 1, opacity: tick === 0 ? 1 : 0.7 }}
            className="rounded-lg border-2 border-amber-500/60 bg-amber-500/10 px-6 py-3 text-center"
          >
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">ENVIRONMENT</p>
            <p className="text-[10px] text-muted-foreground">s' = T(s, a)</p>
          </motion.div>
          {/* Arrow: Environment → Agent (state + reward) */}
          <motion.div
            animate={{ opacity: tick === 2 ? 1 : 0.3 }}
            className="flex items-center gap-1"
          >
            <ArrowRight className="h-3 w-3 rotate-180 text-amber-500" />
            <span className="text-[10px] font-mono text-foreground/60">reward r, state s'</span>
          </motion.div>
        </div>
      </div>
      {/* Step indicator */}
      <div className="flex justify-center gap-2 mt-3">
        {steps.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] transition-all ${
              tick === i ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground opacity-50"
            }`}
          >
            <span>{s.icon}</span>
            {s.label}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        3D-perspective agent-environment loop. The agent observes the state, takes an action, receives a reward,
        and updates its policy. This loop IS reinforcement learning.
      </p>
    </div>
  );
}

// ============================================================
// Q-Table Heatmap Animation
// ============================================================
function QTableAnimation() {
  const [epoch, setEpoch] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setEpoch((e) => (e + 1) % 10), 800);
    return () => clearInterval(interval);
  }, []);

  // 4 states × 4 actions Q-table (values change with epoch to simulate learning)
  const states = ["S0", "S1", "S2", "S3"];
  const actions = ["←", "→", "↑", "↓"];

  function qValue(s: number, a: number) {
    // Simulate Q-values converging over epochs
    const target = [[0.1, 0.9, 0.3, 0.2], [0.2, 0.1, 0.8, 0.3], [0.3, 0.2, 0.1, 0.95], [0.85, 0.2, 0.3, 0.1]];
    const progress = Math.min(epoch / 9, 1);
    return (target[s][a] * progress + Math.random() * 0.05 * (1 - progress));
  }

  function colorFor(v: number) {
    if (v > 0.7) return "oklch(0.55 0.16 165 / 0.8)"; // emerald
    if (v > 0.4) return "oklch(0.70 0.15 75 / 0.6)";  // amber
    if (v > 0.2) return "oklch(0.55 0.14 280 / 0.4)";  // violet
    return "oklch(0.7 0 0 / 0.15)"; // gray
  }

  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <p className="text-sm font-semibold mb-2">Q-Table — learning the optimal policy</p>
      <div className="overflow-x-auto">
        <table className="mx-auto">
          <thead>
            <tr>
              <th className="text-[10px] text-muted-foreground px-2 py-1">State \ Action</th>
              {actions.map((a) => <th key={a} className="text-sm px-2 py-1">{a}</th>)}
            </tr>
          </thead>
          <tbody>
            {states.map((s, si) => (
              <tr key={s}>
                <td className="text-[10px] font-mono text-muted-foreground px-2 py-1">{s}</td>
                {actions.map((_, ai) => {
                  const v = qValue(si, ai);
                  return (
                    <td key={ai} className="p-0.5">
                      <motion.div
                        animate={{ backgroundColor: colorFor(v) }}
                        transition={{ duration: 0.3 }}
                        className="h-10 w-12 rounded flex items-center justify-center text-[10px] font-mono text-white"
                      >
                        {v.toFixed(2)}
                      </motion.div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        Epoch {epoch}/9 — Q-values converge as the agent learns. Bright green = high value (optimal action).
        The greedy policy: π(s) = argmax<sub>a</sub> Q(s, a).
      </p>
    </div>
  );
}

// ============================================================
// Reward Landscape (3D-ish bar chart)
// ============================================================
function RewardLandscapeAnimation() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setStep((s) => (s + 1) % 20), 300);
    return () => clearInterval(interval);
  }, []);

  const bars = Array.from({ length: 12 }, (_, i) => {
    const target = Math.sin(i * 0.5) * 0.5 + 0.5;
    const current = target * Math.min(step / 19, 1) + Math.random() * 0.05;
    return { x: i, height: current * 100, color: current > 0.6 ? "var(--chart-1)" : current > 0.3 ? "var(--chart-5)" : "var(--chart-3)" };
  });

  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <style>{` .reward-3d { perspective: 400px; } .reward-bar { transform: rotateX(20deg); transform-style: preserve-3d; } `}</style>
      <p className="text-sm font-semibold mb-3">Reward Landscape — agent explores the value surface</p>
      <div className="reward-3d flex items-end justify-center gap-1 h-32">
        {bars.map((bar, i) => (
          <motion.div
            key={i}
            className="reward-bar rounded-t"
            animate={{ height: `${bar.height}%`, backgroundColor: bar.color }}
            transition={{ duration: 0.3 }}
            style={{ width: 20, minHeight: 4 }}
          />
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        Step {step}/19 — The agent explores the reward landscape. Higher bars = higher expected return.
        Exploration (try new actions) vs exploitation (choose best known) is the core tension in RL.
      </p>
    </div>
  );
}

// ============================================================
// Agentic Workflow Evolution
// ============================================================
const AGENTIC_STAGES = [
  {
    stage: "Stage 1: Single-shot",
    year: "2023",
    pattern: "Prompt → LLM → Output",
    desc: "Today's basic LLM usage. Ask a question, get an answer. No reasoning, no tool use, no self-reflection. The LLM is a fancy autocomplete.",
    example: "User: 'What was UK revenue?' → LLM: 'I don't have access to your data.'",
    color: "var(--chart-2)",
  },
  {
    stage: "Stage 2: ReAct (Reasoning + Acting)",
    year: "2023-2024",
    pattern: "Think → Act → Observe → Think → ...",
    desc: "The agent reasons about what to do, takes an action (SQL query, API call), observes the result, and reasons again. Loops until the task is done. This is what LangChain + ReAct pioneered.",
    example: "Think: 'I need UK revenue' → Act: SQL('SELECT sum(revenue) FROM fct_orders WHERE region=UK') → Observe: '£2.1M' → Answer: 'UK revenue was £2.1M'",
    color: "var(--chart-3)",
  },
  {
    stage: "Stage 3: ISR (Iterative Self-Refinement)",
    year: "2024-2025",
    pattern: "Generate → Evaluate → Refine → Repeat",
    desc: "The agent generates an answer, evaluates its own quality (self-critique), refines it, and repeats. ISR is the 'self-reflection' loop — the agent becomes its own reviewer. This is the pattern behind GPT-4's 'thinking' mode and Claude's extended reasoning.",
    example: "Generate: 'Revenue was £2.1M' → Evaluate: 'Missing Q3 qualifier + order count' → Refine: 'UK Q3 revenue was £2.1M across 1,200 orders, up 15% YoY'",
    color: "var(--chart-1)",
  },
  {
    stage: "Stage 4: Self-Improving (Meta-Learning)",
    year: "2025+",
    pattern: "Learn → Improve Policy → Repeat",
    desc: "The agent doesn't just refine individual answers — it improves its own reasoning process. RL fine-tuning on self-generated trajectories. The agent's policy π(a|s) is updated based on which reasoning paths led to correct answers. This is where RL meets LLMs.",
    example: "The agent tracks: 'Chain-of-thought with SQL verification → 92% accuracy. Direct answer → 67%.' → Updates policy to always verify with SQL first.",
    color: "var(--chart-4)",
  },
];

// ============================================================
// RL considerations
// ============================================================
const CONSIDERATIONS = [
  { name: "Exploration vs Exploitation", desc: "Try new actions (explore) vs choose best known (exploit). Epsilon-greedy: ε=0.1 means 10% random exploration. UCB (Upper Confidence Bound) balances information gain vs expected reward.", icon: Activity },
  { name: "Reward Hacking", desc: "The agent finds a shortcut that maximises reward without solving the real task. E.g. a cleaning robot that sweeps dust under the rug. Solution: reward shaping + constraint penalties + multi-objective rewards.", icon: ShieldCheck },
  { name: "Credit Assignment", desc: "Which action in a long sequence caused the reward? TD(λ) elegibility traces propagate reward backward through time. The longer the sequence, the harder this becomes.", icon: GitBranch },
  { name: "Sample Efficiency", desc: "How many episodes does the agent need to learn? Model-based RL (learn dynamics model, plan in model) is 100× more sample-efficient than model-free (DQN, PPO). Critical for real-world agents.", icon: Cpu },
  { name: "Reward Sparsity", desc: "If reward only comes at the end of a long episode, the agent can't learn. Solution: intrinsic motivation (curiosity-driven exploration) + reward shaping + hierarchical RL.", icon: Sparkles },
  { name: "Sim-to-Real Gap", desc: "Agent trained in simulation fails in reality because the sim doesn't match. Domain randomisation + system identification + fine-tuning on real data bridge the gap.", icon: Network },
];

import { ShieldCheck } from "lucide-react";

export function RlAgenticPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Reinforcement Learning · agentic AI"
        title="RL & Agentic AI — ISR, 3D Animations & the Next Stage"
        description="The agent-environment loop, Q-learning, policy gradients, and the 4-stage evolution of agentic workflows: single-shot → ReAct → ISR (Iterative Self-Refinement) → self-improving. With 3D-perspective animations of the RL loop, Q-table learning, and the reward landscape. Plus a Pyodide demo of Q-learning on a grid world."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Brain className="h-3 w-3" /> 3D animated</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Pyodide</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />)}
      </div>

      {/* 3D Agent-Environment Loop */}
      <SectionCard title="3D Animation: The Agent-Environment Loop" description="The fundamental loop of RL: observe state → take action → receive reward → update policy. Animated with 3D CSS perspective. This loop IS reinforcement learning." icon={<Network className="h-5 w-5" />} badge="3D animated">
        <AgentLoopAnimation />
      </SectionCard>

      {/* Q-Table Learning */}
      <SectionCard title="Animation: Q-Table Learning" description="Watch Q-values converge as the agent learns. Bright green = high value (optimal action). The greedy policy: π(s) = argmax Q(s,a)." icon={<Layers className="h-5 w-5" />} badge="animated">
        <QTableAnimation />
      </SectionCard>

      {/* Reward Landscape */}
      <SectionCard title="3D Animation: Reward Landscape" description="The agent explores the value surface. Higher bars = higher expected return. Exploration vs exploitation is the core tension." icon={<TrendingUp className="h-5 w-5" />} badge="3D animated">
        <RewardLandscapeAnimation />
      </SectionCard>

      {/* RL Math */}
      <SectionCard title="The 3 equations of RL" description="Q-learning, policy gradient, and the Bellman equation — the mathematical foundation." icon={<Cpu className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-border/60 p-3 bg-muted/10">
            <p className="font-mono text-xs text-foreground/90 font-semibold">1. Bellman Equation (value function):</p>
            <p className="font-mono text-sm ml-4 mt-1">V(s) = max<sub>a</sub> [ R(s,a) + γ · E[V(s') ] ]</p>
            <p className="text-[11px] text-muted-foreground ml-4 mt-1">where γ = discount factor (0.99), R = reward, s' = next state. The value of a state = best immediate reward + discounted future value.</p>
          </div>
          <div className="rounded-md border border-border/60 p-3 bg-muted/10">
            <p className="font-mono text-xs text-foreground/90 font-semibold">2. Q-Learning update (temporal difference):</p>
            <p className="font-mono text-sm ml-4 mt-1">Q(s,a) ← Q(s,a) + α[r + γ · max<sub>a'</sub> Q(s',a') − Q(s,a)]</p>
            <p className="text-[11px] text-muted-foreground ml-4 mt-1">where α = learning rate. The TD error (r + γ·max Q(s',a') − Q(s,a)) drives learning. Off-policy — can learn from any experience.</p>
          </div>
          <div className="rounded-md border border-border/60 p-3 bg-muted/10">
            <p className="font-mono text-xs text-foreground/90 font-semibold">3. Policy Gradient (REINFORCE):</p>
            <p className="font-mono text-sm ml-4 mt-1">∇<sub>θ</sub>J(θ) = E[∇<sub>θ</sub> log π<sub>θ</sub>(a|s) · G<sub>t</sub>]</p>
            <p className="text-[11px] text-muted-foreground ml-4 mt-1">where G<sub>t</sub> = cumulative discounted reward, π<sub>θ</sub> = policy parameterised by θ. Gradient ascent on expected return. PPO adds clipping for stability.</p>
          </div>
        </div>
      </SectionCard>

      {/* Pyodide Q-learning demo */}
      <SectionCard title="Try it: Q-learning on a grid world (Pyodide)" description="A 4×4 grid world agent learns to reach the goal. Pure Python Q-learning with epsilon-greedy exploration. Watch the Q-values converge and the optimal path emerge." icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={`# Q-Learning on a 4x4 grid world — pure Python
# Agent learns to reach the goal (G) from start (S)

import random

# Grid: 4x4, S at (0,0), G at (3,3), hole at (1,1)
# Actions: 0=up, 1=right, 2=down, 3=left
GRID = 4
START = (0, 0)
GOAL = (3, 3)
HOLES = [(1, 1), (2, 0)]

# Q-table: states × actions
Q = {}
for r in range(GRID):
    for c in range(GRID):
        Q[(r, c)] = [0.0, 0.0, 0.0, 0.0]

def step(state, action):
    r, c = state
    if action == 0: r = max(0, r-1)      # up
    elif action == 1: c = min(GRID-1, c+1)  # right
    elif action == 2: r = min(GRID-1, r+1)  # down
    elif action == 3: c = max(0, c-1)      # left
    next_state = (r, c)
    if next_state == GOAL:
        return next_state, 1.0, True       # goal: reward 1, done
    if next_state in HOLES:
        return next_state, -1.0, True       # hole: reward -1, done
    return next_state, -0.01, False         # step cost

# Train: 200 episodes of Q-learning
alpha = 0.1   # learning rate
gamma = 0.95  # discount factor
epsilon = 0.2 # exploration rate

for episode in range(200):
    state = START
    for _ in range(50):  # max 50 steps per episode
        if random.random() < epsilon:
            action = random.randint(0, 3)  # explore
        else:
            action = max(range(4), key=lambda a: Q[state][a])  # exploit
        
        next_state, reward, done = step(state, action)
        
        # Q-learning update
        best_next = max(Q[next_state])
        Q[state][action] += alpha * (reward + gamma * best_next - Q[state][action])
        
        state = next_state
        if done:
            break

# Show learned policy
print("=" * 50)
print("Q-LEARNING — Learned Policy (4x4 Grid)")
print("=" * 50)

arrows = {0: "↑", 1: "→", 2: "↓", 3: "←"}
print("\\n  ", end="")
for c in range(GRID):
    print(f"  {c} ", end="")
print()

for r in range(GRID):
    print(f"{r} ", end="")
    for c in range(GRID):
        pos = (r, c)
        if pos == GOAL:
            print(" [G]", end="")
        elif pos in HOLES:
            print(" [X]", end="")
        elif pos == START:
            print(" [S]", end="")
        else:
            best = max(range(4), key=lambda a: Q[pos][a])
            print(f"  {arrows[best]} ", end="")
    print()

# Show Q-values for a few states
print(f"\\n{'=' * 50}")
print("Q-VALUES (sample states):")
print(f"{'State':<10} {'↑':<8} {'→':<8} {'↓':<8} {'←':<8} {'Best'}")
print("-" * 50)
for pos in [(0,0), (0,1), (1,0), (2,2), (2,3)]:
    vals = Q[pos]
    best = max(range(4), key=lambda a: vals[a])
    print(f"  {pos}  {vals[0]:<8.3f} {vals[1]:<8.3f} {vals[2]:<8.3f} {vals[3]:<8.3f} {arrows[best]}")

# Trace optimal path
print(f"\\n{'=' * 50}")
print("OPTIMAL PATH (greedy policy from start):")
state = START
path = [state]
for _ in range(20):
    if state == GOAL:
        break
    action = max(range(4), key=lambda a: Q[state][a])
    state, _, done = step(state, action)
    path.append(state)
    if done:
        break
print(f"  {' → '.join(str(p) for p in path)}")
print(f"  Steps: {len(path)-1}, Reached goal: {state == GOAL}")
print("=" * 50)`} buttonLabel="Run Q-learning grid world (Pyodide)" />
      </SectionCard>

      {/* Agentic Workflow Evolution */}
      <SectionCard title="The 4-stage evolution of agentic workflows" description="From single-shot LLM calls to self-improving agents. ISR (Iterative Self-Refinement) is the current frontier — the agent becomes its own reviewer." icon={<GitBranch className="h-5 w-5" />} badge="evolution">
        <div className="space-y-0">
          {AGENTIC_STAGES.map((s, i) => (
            <div key={s.stage} className="flex gap-4 pb-4 last:pb-0">
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold shrink-0" style={{ background: s.color, color: "white" }}>
                  {i + 1}
                </div>
                {i < AGENTIC_STAGES.length - 1 && <div className="w-0.5 flex-1 mt-1" style={{ background: s.color, opacity: 0.3 }} />}
              </div>
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{s.stage}</p>
                  <Badge variant="outline" className="text-[10px]">{s.year}</Badge>
                </div>
                <p className="text-[11px] font-mono text-primary mt-1">{s.pattern}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.desc}</p>
                <div className="mt-2 rounded-md border border-border/40 p-2 bg-muted/10 text-[11px] text-muted-foreground font-mono leading-relaxed">
                  {s.example}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Common considerations */}
      <SectionCard title="Common considerations of RL networks" description="The 6 challenges that make RL hard — and how the platform's architecture addresses them." icon={<ShieldCheck className="h-5 w-5" />}>
        <div className="grid md:grid-cols-2 gap-3">
          {CONSIDERATIONS.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.name} className="rounded-md border border-border/60 p-3 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">{c.name}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Insight */}
      <SectionCard title="My deeper thought: the platform's bandit IS RL" description="The Thompson sampling bandit (ADR-019) is the simplest form of RL. The 4-stage agentic evolution is the trajectory from that bandit to self-improving LLM agents." icon={<TrendingUp className="h-5 w-5" />} badge="Insight">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>The platform already has 2 RL systems in production: the Knowledge Shorts bandit and the page-recommendations bandit (ADR-019). Both use Thompson sampling — Beta(α, β) posterior + Marsaglia-Tsang Gamma sampling. This IS reinforcement learning — the simplest form. The bandit is a 1-state, K-action MDP where the reward is binary (click/skip).</p>
          <p><strong className="text-foreground/80">The 4-stage agentic evolution maps directly to the platform's roadmap:</strong></p>
          <ul className="ml-4 space-y-1 text-xs">
            <li>• Stage 1 (single-shot): today's <code className="font-mono">/api/agent-triage</code> — one LLM call per anomaly</li>
            <li>• Stage 2 (ReAct): the LangGraph sketch in AGENTIC_WORKFLOW.md — multi-step investigate → classify → act</li>
            <li>• Stage 3 (ISR): the next iteration — the agent evaluates its own triage + refines before posting</li>
            <li>• Stage 4 (self-improving): the agent's policy is RL-fine-tuned on which triage paths led to correct fixes</li>
          </ul>
          <p>The Q-learning Pyodide demo on this page shows the core algorithm — the agent learns by updating Q(s,a) based on reward. In production, the <strong className="text-foreground/80">"state" is the anomaly context, the "action" is the investigation path, and the "reward" is whether the human approved the fix</strong>. The same Q-learning update equation runs on real platform telemetry. The 3D animations visualise what happens inside the agent's mind.</p>
          <p><strong className="text-foreground/80">ISR (Iterative Self-Refinement) is the current frontier.</strong> The agent generates an answer, evaluates it ("did I check all relevant tables?"), refines, and repeats. This is the pattern behind GPT-4's "thinking" mode and Claude's extended reasoning. The platform's agentic DQ triage agent (AGENTIC_WORKFLOW.md) is at Stage 2 — the next iteration moves it to Stage 3 (ISR) by adding a self-evaluation step before posting the root-cause hypothesis.</p>
        </div>
      </SectionCard>

      <DeeperThoughtSection pageTitle="Reinforcement Learning & Agentic AI">
        <DeeperThought title="Reinforcement Learning & Agentic AI IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Reinforcement Learning & Agentic AI is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Reinforcement Learning & Agentic AI connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Reinforcement Learning & Agentic AI sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Reinforcement Learning & Agentic AI) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
        </DeeperThought>
        <DeeperThought title="The fold pattern respects the reader's attention" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"This page has fold sections (collapsed by default) that reveal deeper content on demand — equation family comparisons, LaTeX derivations, production patterns, expected outputs, and citations. The basic content is visible immediately; the deeper phases are there when the reader is ready. Progressive disclosure isn't just UX — it's epistemological. A reader who wants the summary gets it; a reader who wants the derivation clicks to expand. Both are served by the same page."}</p>
        </DeeperThought>
        <DeeperThought title="The output IS the proof — not just the equation" connectedTo="ADR-034 (ESM-2 + AlphaFold2 adoption)">
          <p>{"Where this page has interactive demos (Pyodide + sliders + charts), the visual output IS the argument. Seeing a chart update as you drag a slider communicates the math in a way no formula can. The brain's pattern-recognition system processes the visual output faster than the verbal/analytical pathway. That's why the platform pairs every equation with a live demo — the output plays to a different level of the brain than the prose."}</p>
        </DeeperThought>
        <DeeperThought title="In a decade, this page will evolve — and that's the point" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"The datasets, libraries, and tools on this page will be updated as technology evolves. The 1000-Genomes Project will become the 10M-Genomes Project. NumPy may be replaced by a WebGPU-native array library. PyTorch may give way to a successor. But the math — SVD, Attention, Poisson, FFT, Bayes, Kalman, GBM — will be the same. The platform is designed for this evolution: the equations are the anchor, the tools are the amplifier, and the fold sections let us update the tools without rewriting the page."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "neural-networks" as const, reason: "Continue to neural networks — see also from this page" }, { id: "rag-llms" as const, reason: "Continue to rag llms — see also from this page" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("neural-networks")} className="text-sm text-primary hover:underline">→ Neural Networks (architecture + backprop)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("rag-llms")} className="text-sm text-primary hover:underline">→ RAG & LLMs (Gold tables as knowledge base)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">→ ADR-019 (bandit) + ADR-022 (pgvector)</Link>
      </div>
    </div>
  );
}
