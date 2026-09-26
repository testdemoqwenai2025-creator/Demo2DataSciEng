"use client";

import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Network, Brain, Atom, Sparkles, History, TrendingUp, Boxes, Server, Cpu, Zap, Layers } from "lucide-react";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";

const KPIS = [
  { label: "Origin", value: "ReAct 2022 (Yao et al.)", hint: "ReAct paired reasoning and acting in LLMs — Thought→Action→Observation loop. AutoGPT (2023) made it autonomous. CrewAI / LangGraph / MetaGPT (2023-2024) made it multi-agent.", deltaTone: "flat" as const },
  { label: "Tools", value: "1 → 100+ (MCP)", hint: "Anthropic's Model Context Protocol (MCP, 2024) standardizes tool/function schemas so any LLM can call any tool — like USB-C for AI.", deltaTone: "up" as const },
  { label: "Architecture", value: "Single → multi-agent", hint: "LangGraph models agents as nodes + edges (a state machine). CrewAI uses role-based crews. MetaGPT encodes software-engineering roles (PM/Architect/Engineer).", deltaTone: "up" as const },
  { label: "Adoption", value: "AutoGPT / CrewAI / LangGraph", hint: "Agent frameworks are the hot layer of LLM tooling in 2024-2025. Used by Cursor, Devin, Perplexity, Cognition, and most enterprise chat copilots.", deltaTone: "up" as const },
];

const MATH_DEMO = `# ============================================================
# Agent Math — ReAct loop, tool selection, memory retrieval
# Pure Python (Pyodide, math + random + collections only)
# ============================================================

import math
import random
from collections import deque

random.seed(42)

# --- 1. ReAct state and policy
# State: S = (messages, tools, memory)
# Action distribution: P(a_t | s_t, thought_t) ~ softmax over tool list

def softmax(scores):
    m = max(scores)
    exps = [math.exp(s - m) for s in scores]
    s = sum(exps)
    return [e / s for e in exps]

# Simulate: agent sees a query, thinks, picks an action

tools = ["search", "calculator", "code_runner", "none"]
tool_desc_similarity = {
    "search": 0.10,
    "calculator": 0.85,
    "code_runner": 0.55,
    "none": 0.05,
}

def react_policy(thought, tools, sim_scores, temperature=0.3):
    """Pick action given thought + tools. Softmax over similarity."""
    scores = [sim_scores[t] + random.gauss(0, temperature) for t in tools]
    probs = softmax(scores)
    return list(zip(tools, probs))

print("=== ReAct Action Selection ===")
thought_1 = "User wants a math result -> use calculator"
probs = react_policy(thought_1, tools, tool_desc_similarity)
for tool, p in sorted(probs, key=lambda x: -x[1]):
    print(f"  {tool:>14s}: P = {p:.3f}")
chosen = max(probs, key=lambda x: x[1])[0]
print(f"  -> chosen: {chosen}")
print()

# --- 2. ReAct loop: Thought -> Action -> Observation -> ... -> Answer

def fake_tool(action, arg):
    if action == "calculator":
        try:
            return ("OK", eval(arg, {"__builtins__": {}}, {}))
        except Exception as e:
            return ("ERR", str(e))
    if action == "search":
        return ("OK", f"Found 3 results about '{arg}'. Top: ...")
    if action == "code_runner":
        return ("OK", "Program exited 0, stdout: 'answer=60'")
    return ("OK", "(no-op)")

def react_loop(query, max_iters=4):
    history = []
    memory = deque(maxlen=4)  # short-term conversational memory
    for step in range(max_iters):
        if step == 0:
            thought = f"Parse query '{query}', plan: call calculator"
            action, arg = "calculator", "7 * 8 + 4"
        elif step == 1:
            thought = "Got result. Verify with code_runner."
            action, arg = "code_runner", "print(7 * 8 + 4)"
        elif step == 2:
            thought = "Both agree -> emit final answer."
            action, arg = "none", ""
        else:
            thought = "Done."
            action, arg = "none", ""

        status, obs = fake_tool(action, arg)
        history.append((thought, action, arg, obs))
        memory.append((action, obs))

        print(f"  Step {step + 1}:")
        print(f"    Thought:    {thought}")
        print(f"    Action:     {action}({arg!r})")
        print(f"    Observation: {status}: {obs}")

        if action == "none":
            print(f"  => Final answer derived from observations: 60")
            break
    print()
    return history

print("=== ReAct Loop: 'compute 7 * 8 + 4' ===")
react_loop("compute 7 * 8 + 4")
print()

# --- 3. Memory: vector retrieval (top-k)
# Long-term memory = list of (text, embedding). Retrieve top-k by cosine similarity.

def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)

memory_store = [
    ("User likes Python.",            [0.9, 0.1, 0.3, 0.0]),
    ("Project uses PyTorch.",         [0.2, 0.8, 0.1, 0.5]),
    ("Docker for deployment.",        [0.0, 0.1, 0.9, 0.7]),
    ("K8s cluster on AWS.",           [0.1, 0.3, 0.8, 0.6]),
    ("Prefer concise answers.",       [0.7, 0.2, 0.4, 0.1]),
    ("Birthday: April 4.",           [0.1, 0.0, 0.2, 0.9]),
]
query_emb = [0.85, 0.15, 0.4, 0.05]

print("=== Memory: top-k=3 vector retrieval ===")
sims = [(cosine(query_emb, emb), text) for text, emb in memory_store]
sims.sort(reverse=True)
for score, text in sims[:3]:
    print(f"  sim = {score:.3f}  {text}")
print()

# --- 4. Multi-agent: 4 roles, handoff probabilities
# MetaGPT-style: PM -> Architect -> Engineer -> QA -> done

roles = ["PM", "Architect", "Engineer", "QA", "DONE"]
transitions = {
    "PM":         {"PM": 0.10, "Architect": 0.85, "Engineer": 0.05, "QA": 0.00, "DONE": 0.00},
    "Architect":  {"PM": 0.05, "Architect": 0.15, "Engineer": 0.75, "QA": 0.05, "DONE": 0.00},
    "Engineer":   {"PM": 0.00, "Architect": 0.10, "Engineer": 0.30, "QA": 0.55, "DONE": 0.05},
    "QA":         {"PM": 0.00, "Architect": 0.00, "Engineer": 0.40, "QA": 0.20, "DONE": 0.40},
    "DONE":       {"PM": 0.00, "Architect": 0.00, "Engineer": 0.00, "QA": 0.00, "DONE": 1.00},
}

print("=== Multi-Agent Role Transitions (MetaGPT-style) ===")
role = "PM"
steps = 0
print(f"  Step 0: {role}")
while role != "DONE" and steps < 10:
    probs = transitions[role]
    r = random.random()
    cum = 0.0
    next_role = "DONE"
    for k, p in probs.items():
        cum += p
        if r < cum:
            next_role = k
            break
    role = next_role
    steps += 1
    print(f"  Step {steps}: -> {role}")
print(f"  (Task complete in {steps} transitions)")
print()

# --- 5. Cost: agent tokens vs single LLM call
single_call_tokens = 1500
agent_tokens_per_step = 900
agent_steps = 4
agent_total = agent_tokens_per_step * agent_steps
print("=== Cost: Single LLM call vs ReAct Agent ===")
print(f"  Single LLM call:        ~{single_call_tokens:,} tokens")
print(f"  ReAct agent ({agent_steps} steps):       ~{agent_total:,} tokens  ({agent_total / single_call_tokens:.1f}x)")
print(f"  Trade-off: agents cost more tokens but ground in tools + memory.")`;

export function AgentFrameworksPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Agent Frameworks · ReAct · LangGraph · CrewAI · MetaGPT · MCP · multi-agent"
        title="Agent Frameworks — the math behind ReAct, LangGraph, and multi-agent orchestration"
        description="An agent is an LLM with tools, memory, and a control loop. The ReAct framework (Yao et al. 2022) interleaves reasoning and acting: the LLM emits a Thought, picks an Action (tool call), receives an Observation, then repeats until it can produce a final answer. The agent's state is a tuple S = (messages, tools, memory). Action selection follows P(a_t | s_t, thought_t) — typically a softmax over tool-description similarities. Long-term memory is a vector store with top-k retrieval: top_k = argmax_j sim(query, m_j). Multi-agent frameworks extend this: LangGraph models agents as nodes connected by edges (a state machine with explicit transitions); CrewAI uses role-based crews; MetaGPT encodes software-engineering roles (PM→Architect→Engineer→QA). The Model Context Protocol (MCP, Anthropic 2024) standardizes tool schemas so any LLM can call any tool. This deep dive covers the math, custom SVGs (ReAct loop, LangGraph state machine, memory architecture), a Pyodide demo simulating the full ReAct loop with tool selection + memory retrieval, and the evolution from ReAct to modern multi-agent frameworks."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Network className="h-3 w-3" /> ReAct</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Multi-agent</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* Mathematical foundations */}
      <SectionCard
        title="Mathematical foundations — ReAct, state, tool selection, memory, multi-agent"
        description="The 5 core operations in an agent: ReAct policy, state representation, tool selection, memory retrieval, and multi-agent role transitions."
        icon={<Brain className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-4">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-semibold text-primary mb-2">1. ReAct Policy — P(a_t | s_t, thought_t)</p>
            <p className="font-mono text-xs text-primary mb-2">
              a_t ~ softmax_a [ score(a | thought_t, s_t) / τ ]   ·   thought_t = LLM(s_t)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The agent maintains a state s_t = (messages, tools, memory). At each step, the LLM
              produces a <strong>thought</strong> (chain-of-thought reasoning in natural language),
              then picks an <strong>action</strong> a_t from the available tools. The action
              distribution is a softmax over scores (typically query-to-tool-description similarity),
              modulated by temperature τ. The action returns an <strong>observation</strong>
              o_t = tool(a_t), which is appended to the state. The loop terminates when the LLM
              emits the special "finish" action. This interleaving (reason + act + observe) is
              what distinguishes ReAct from pure chain-of-thought (which only reasons).
            </p>
          </div>
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">2. Agent State — S = (messages, tools, memory)</p>
            <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 mb-2">
              S_t = ( messages_t,  tools,  memory_t )   ·   memory_t ⊆ memory_t-1 ∪ (o_t)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The agent's state has 3 components. <strong>messages</strong>: the conversation
              history (system + user + assistant + tool calls) — grows linearly, often truncated
              or compressed for long sessions. <strong>tools</strong>: the static tool registry
              (function schemas, MCP endpoints). <strong>memory</strong>: persistent context
              across sessions — short-term (deque of recent actions) and long-term (vector store
              of facts). State transitions are append-only: the only mutation is adding the new
              observation to messages and short-term memory. Long-term memory updates are
              occasional (when the agent decides to remember something).
            </p>
          </div>
          <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">3. Tool Selection — P(tool | query)</p>
            <p className="font-mono text-xs text-violet-600 dark:text-violet-400 mb-2">
              P(tool_i | query)  ∝  exp( sim(query_emb, tool_desc_emb_i) / τ )
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              With many tools (100+ via MCP), the LLM can't hold all descriptions in context —
              you need a retrieval step. Encode each tool's description as a vector
              (text-embedding-3-large, etc.). At inference, embed the user's query, compute cosine
              similarity to all tool descriptions, take top-k (e.g. k=5) and inject those schemas
              into the LLM prompt. The LLM then picks one. This is exactly RAG, but applied to
              tools instead of documents. <strong>Function calling</strong> (OpenAI, Anthropic)
              bakes this into the model — the LLM was fine-tuned to emit a JSON tool-call instead
              of free text.
            </p>
          </div>
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">4. Memory Retrieval — top-k vector recall</p>
            <p className="font-mono text-xs text-amber-600 dark:text-amber-400 mb-2">
              top_k = argmax_j∈memory  cosine(query_emb, m_j.emb)   ·   return top_k to LLM context
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Long-term memory is a vector database of (text, embedding, metadata) tuples — same
              as RAG. At each agent step, embed the current thought/query, retrieve top-k similar
              memories, and prepend them to the LLM prompt as "remembered context". This is how
              ChatGPT's "memory" feature works. <strong>Episodic memory</strong>: store full
              (state, action, reward) trajectories for in-context learning or RL fine-tuning.
              <strong> Semantic memory</strong>: facts about the user. <strong> Procedural
              memory</strong>: learned tool-usage patterns. Modern agents (MemGPT, A-MEM) layer
              all three.
            </p>
          </div>
          <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3">
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-2">5. Multi-Agent — π_i(a | s, agents) and role transitions</p>
            <p className="font-mono text-xs text-rose-600 dark:text-rose-400 mb-2">
              role_(t+1) ~ P(role | role_t, s_t)   ·   each agent_i has its own policy π_i
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              For complex tasks (write a feature, ship a PR), a single agent loops too long and
              loses context. <strong>Multi-agent</strong> splits work by role: MetaGPT encodes a
              software-engineering SOP (PM → Architect → Engineer → QA → reviewer) where each role
              is a different system prompt + toolset. Role transitions are explicit
              (LangGraph edges) or learned (transition probabilities above). <strong> Supervisor
              pattern</strong>: a router agent decides which specialist to call next.
              <strong> Peer pattern</strong>: agents debate (e.g. Multi-Agent Debate, Du et al.
              2023) and converge on a better answer than any single agent.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ReAct loop SVG */}
      <SectionCard
        title="ReAct loop (custom SVG)"
        description="The Thought → Action → Observation loop. The LLM emits a thought (natural-language reasoning), picks a tool, gets an observation, appends it to state, and repeats until it can produce a final answer. Termination is when the LLM emits the 'finish' action."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 480 240" className="w-full h-auto">
            {/* Central LLM */}
            <circle cx="240" cy="120" r="36" fill="oklch(0.65 0.16 250)20" stroke="oklch(0.65 0.16 250)" strokeWidth="1.5" />
            <text x="240" y="116" textAnchor="middle" fontSize="11" fontWeight="bold" fill="oklch(0.65 0.16 250)">LLM</text>
            <text x="240" y="130" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 250)">π_θ</text>

            {/* Thought bubble (top) */}
            <rect x="200" y="20" width="80" height="30" rx="6" fill="oklch(0.65 0.16 30)30" stroke="oklch(0.65 0.16 30)" strokeWidth="1" />
            <text x="240" y="35" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 30)" fontWeight="bold">Thought</text>
            <text x="240" y="45" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 30)">"User wants math..."</text>
            <line x1="240" y1="50" x2="240" y2="84" stroke="oklch(0.65 0.16 30)" strokeWidth="1.5" markerEnd="url(#react-arrow-1)" />

            {/* Action (right) */}
            <rect x="340" y="105" width="90" height="30" rx="6" fill="oklch(0.65 0.16 165)30" stroke="oklch(0.65 0.16 165)" strokeWidth="1" />
            <text x="385" y="120" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 165)" fontWeight="bold">Action</text>
            <text x="385" y="130" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 165)">tool_call: calculator(...)</text>
            <line x1="276" y1="120" x2="340" y2="120" stroke="oklch(0.65 0.16 165)" strokeWidth="1.5" markerEnd="url(#react-arrow-2)" />

            {/* Observation (bottom) */}
            <rect x="200" y="190" width="80" height="30" rx="6" fill="oklch(0.65 0.16 320)30" stroke="oklch(0.65 0.16 320)" strokeWidth="1" />
            <text x="240" y="205" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 320)" fontWeight="bold">Observation</text>
            <text x="240" y="215" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 320)">result: 60</text>
            <line x1="385" y1="135" x2="280" y2="195" stroke="oklch(0.65 0.16 320)" strokeWidth="1.5" markerEnd="url(#react-arrow-3)" />

            {/* Back to LLM (left side loop) */}
            <path d="M 200 205 Q 100 200 100 150 Q 100 120 204 120" fill="none" stroke="oklch(0.65 0.16 250)" strokeWidth="1.5" strokeDasharray="3,2" markerEnd="url(#react-arrow-4)" />
            <text x="100" y="180" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 250)">append to state s_t</text>

            {/* Finish marker (right outside) */}
            <rect x="340" y="40" width="80" height="22" rx="4" fill="oklch(0.7 0.16 90)20" stroke="oklch(0.65 0.16 90)" strokeWidth="1" strokeDasharray="2,2" />
            <text x="380" y="55" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.16 90)" fontWeight="bold">Finish →</text>
            <text x="380" y="65" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 90)">final answer</text>

            <defs>
              <marker id="react-arrow-1" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill="oklch(0.65 0.16 30)" />
              </marker>
              <marker id="react-arrow-2" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill="oklch(0.65 0.16 165)" />
              </marker>
              <marker id="react-arrow-3" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill="oklch(0.65 0.16 320)" />
              </marker>
              <marker id="react-arrow-4" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill="oklch(0.65 0.16 250)" />
              </marker>
            </defs>
          </svg>
        </div>
      </SectionCard>

      {/* LangGraph SVG */}
      <SectionCard
        title="LangGraph state machine (custom SVG)"
        description="LangGraph models an agent system as a directed graph: nodes = agent functions (each wrapping an LLM call), edges = conditional transitions (routing logic). The state is a typed dict that flows through the graph. This explicit graph makes control flow debuggable — unlike a prompt-only loop, you can visualize, time-travel, and replay."
        icon={<Network className="h-5 w-5" />}
        badge="architecture"
      >
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 480 220" className="w-full h-auto">
            {/* Start node */}
            <circle cx="40" cy="110" r="14" fill="oklch(0.65 0.16 30)30" stroke="oklch(0.65 0.16 30)" strokeWidth="1.5" />
            <text x="40" y="114" textAnchor="middle" fontSize="8" fontWeight="bold" fill="oklch(0.65 0.16 30)">START</text>

            {/* Supervisor node */}
            <rect x="90" y="92" width="100" height="36" rx="6" fill="oklch(0.65 0.16 250)20" stroke="oklch(0.65 0.16 250)" strokeWidth="1.5" />
            <text x="140" y="108" textAnchor="middle" fontSize="9" fontWeight="bold" fill="oklch(0.65 0.16 250)">Supervisor</text>
            <text x="140" y="120" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 250)">router LLM</text>

            {/* Specialist agents (3 below) */}
            <rect x="240" y="20" width="90" height="32" rx="6" fill="oklch(0.65 0.16 165)30" stroke="oklch(0.65 0.16 165)" strokeWidth="1.5" />
            <text x="285" y="36" textAnchor="middle" fontSize="9" fontWeight="bold" fill="oklch(0.65 0.16 165)">Researcher</text>
            <text x="285" y="46" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 165)">search + summarize</text>

            <rect x="240" y="94" width="90" height="32" rx="6" fill="oklch(0.65 0.16 90)30" stroke="oklch(0.65 0.16 90)" strokeWidth="1.5" />
            <text x="285" y="110" textAnchor="middle" fontSize="9" fontWeight="bold" fill="oklch(0.65 0.16 90)">Coder</text>
            <text x="285" y="120" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 90)">write + run code</text>

            <rect x="240" y="168" width="90" height="32" rx="6" fill="oklch(0.65 0.16 320)30" stroke="oklch(0.65 0.16 320)" strokeWidth="1.5" />
            <text x="285" y="184" textAnchor="middle" fontSize="9" fontWeight="bold" fill="oklch(0.65 0.16 320)">Writer</text>
            <text x="285" y="194" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 320)">draft final answer</text>

            {/* End node */}
            <circle cx="420" cy="110" r="14" fill="oklch(0.7 0.16 90)20" stroke="oklch(0.65 0.16 90)" strokeWidth="1.5" />
            <text x="420" y="114" textAnchor="middle" fontSize="8" fontWeight="bold" fill="oklch(0.65 0.16 90)">END</text>

            {/* Edges */}
            <line x1="54" y1="110" x2="88" y2="110" stroke="var(--muted-foreground)" strokeWidth="1" markerEnd="url(#lg-arrow)" />

            {/* Supervisor -> each specialist (conditional) */}
            <line x1="190" y1="100" x2="238" y2="44" stroke="oklch(0.65 0.16 165)" strokeWidth="1" markerEnd="url(#lg-arrow)" />
            <line x1="190" y1="110" x2="238" y2="110" stroke="oklch(0.65 0.16 90)" strokeWidth="1" markerEnd="url(#lg-arrow)" />
            <line x1="190" y1="120" x2="238" y2="184" stroke="oklch(0.65 0.16 320)" strokeWidth="1" markerEnd="url(#lg-arrow)" />
            <text x="218" y="75" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 0)">if "research"</text>
            <text x="218" y="105" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 0)">if "code"</text>
            <text x="218" y="155" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 0)">if "draft"</text>

            {/* Specialists -> END (or back to supervisor - shown as one edge for clarity) */}
            <line x1="332" y1="36" x2="406" y2="100" stroke="var(--muted-foreground)" strokeWidth="0.8" strokeDasharray="2,2" markerEnd="url(#lg-arrow)" />
            <line x1="332" y1="110" x2="406" y2="110" stroke="var(--muted-foreground)" strokeWidth="0.8" strokeDasharray="2,2" markerEnd="url(#lg-arrow)" />
            <line x1="332" y1="184" x2="406" y2="120" stroke="var(--muted-foreground)" strokeWidth="0.8" strokeDasharray="2,2" markerEnd="url(#lg-arrow)" />

            {/* Legend */}
            <text x="240" y="210" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">nodes = agent fns · edges = conditional transitions · state flows through graph</text>

            <defs>
              <marker id="lg-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.6" />
              </marker>
            </defs>
          </svg>
        </div>
      </SectionCard>

      {/* Memory architecture SVG */}
      <SectionCard
        title="Memory architecture (custom SVG)"
        description="Three tiers of agent memory. Short-term = the conversation deque (recent turns). Long-term = vector store of facts about the user (top-k retrieval). Episodic = full trajectories for in-context learning or RL fine-tuning. Together these make agents stateful across sessions — the difference between ChatGPT-with-memory and a stateless completion API."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 480 220" className="w-full h-auto">
            {/* LLM center */}
            <circle cx="240" cy="110" r="28" fill="oklch(0.65 0.16 250)20" stroke="oklch(0.65 0.16 250)" strokeWidth="1.5" />
            <text x="240" y="108" textAnchor="middle" fontSize="10" fontWeight="bold" fill="oklch(0.65 0.16 250)">LLM</text>
            <text x="240" y="120" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 250)">context window</text>

            {/* Short-term memory (left) */}
            <rect x="20" y="60" width="100" height="100" rx="4" fill="oklch(0.65 0.16 30)15" stroke="oklch(0.65 0.16 30)" strokeWidth="1" />
            <text x="70" y="80" textAnchor="middle" fontSize="9" fontWeight="bold" fill="oklch(0.65 0.16 30)">Short-term</text>
            <text x="70" y="92" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 30)">conversation deque</text>
            <rect x="30" y="98" width="80" height="10" fill="oklch(0.7 0.1 30)" />
            <text x="70" y="106" textAnchor="middle" fontSize="6" fill="oklch(0.2 0.05 30)">user msg 1</text>
            <rect x="30" y="112" width="80" height="10" fill="oklch(0.7 0.1 30)" />
            <text x="70" y="120" textAnchor="middle" fontSize="6" fill="oklch(0.2 0.05 30)">asst msg 1</text>
            <rect x="30" y="126" width="80" height="10" fill="oklch(0.7 0.1 30)" />
            <text x="70" y="134" textAnchor="middle" fontSize="6" fill="oklch(0.2 0.05 30)">user msg 2</text>
            <rect x="30" y="140" width="80" height="10" fill="oklch(0.7 0.1 30)" opacity="0.4" />
            <text x="70" y="148" textAnchor="middle" fontSize="6" fill="oklch(0.5 0.05 30)">(evicted)</text>
            <line x1="120" y1="110" x2="212" y2="110" stroke="oklch(0.65 0.16 30)" strokeWidth="1.2" markerEnd="url(#mem-arrow-s)" />

            {/* Long-term memory (top) - vector store */}
            <rect x="180" y="20" width="120" height="40" rx="4" fill="oklch(0.65 0.16 165)15" stroke="oklch(0.65 0.16 165)" strokeWidth="1" />
            <text x="240" y="34" textAnchor="middle" fontSize="9" fontWeight="bold" fill="oklch(0.65 0.16 165)">Long-term</text>
            <text x="240" y="46" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 165)">vector DB · top-k retrieval</text>
            <line x1="240" y1="60" x2="240" y2="82" stroke="oklch(0.65 0.16 165)" strokeWidth="1.2" markerEnd="url(#mem-arrow-l)" />

            {/* Episodic (bottom) - trajectory store */}
            <rect x="180" y="160" width="120" height="40" rx="4" fill="oklch(0.65 0.16 320)15" stroke="oklch(0.65 0.16 320)" strokeWidth="1" />
            <text x="240" y="174" textAnchor="middle" fontSize="9" fontWeight="bold" fill="oklch(0.65 0.16 320)">Episodic</text>
            <text x="240" y="186" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 320)">trajectory store · RL replay</text>
            <line x1="240" y1="160" x2="240" y2="138" stroke="oklch(0.65 0.16 320)" strokeWidth="1.2" markerEnd="url(#mem-arrow-e)" />

            {/* Tools (right) */}
            <rect x="360" y="60" width="100" height="100" rx="4" fill="oklch(0.65 0.16 90)15" stroke="oklch(0.65 0.16 90)" strokeWidth="1" />
            <text x="410" y="80" textAnchor="middle" fontSize="9" fontWeight="bold" fill="oklch(0.65 0.16 90)">Tools (MCP)</text>
            <text x="410" y="92" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 90)">function schemas</text>
            <rect x="370" y="98" width="80" height="10" fill="oklch(0.7 0.1 90)" />
            <text x="410" y="106" textAnchor="middle" fontSize="6" fill="oklch(0.2 0.05 90)">search(query)</text>
            <rect x="370" y="112" width="80" height="10" fill="oklch(0.7 0.1 90)" />
            <text x="410" y="120" textAnchor="middle" fontSize="6" fill="oklch(0.2 0.05 90)">calc(expr)</text>
            <rect x="370" y="126" width="80" height="10" fill="oklch(0.7 0.1 90)" />
            <text x="410" y="134" textAnchor="middle" fontSize="6" fill="oklch(0.2 0.05 90)">run_py(code)</text>
            <rect x="370" y="140" width="80" height="10" fill="oklch(0.7 0.1 90)" opacity="0.4" />
            <text x="410" y="148" textAnchor="middle" fontSize="6" fill="oklch(0.5 0.05 90)">+ 97 more...</text>
            <line x1="360" y1="110" x2="268" y2="110" stroke="oklch(0.65 0.16 90)" strokeWidth="1.2" markerEnd="url(#mem-arrow-t)" />

            <defs>
              <marker id="mem-arrow-s" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill="oklch(0.65 0.16 30)" />
              </marker>
              <marker id="mem-arrow-l" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill="oklch(0.65 0.16 165)" />
              </marker>
              <marker id="mem-arrow-e" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill="oklch(0.65 0.16 320)" />
              </marker>
              <marker id="mem-arrow-t" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill="oklch(0.65 0.16 90)" />
              </marker>
            </defs>
          </svg>
        </div>
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: ReAct loop + tool selection + memory + multi-agent (Pyodide)"
        description="Pure-Python simulation of an agent: (1) softmax tool selection, (2) full ReAct loop on 'compute 7 * 8 + 4' with thought→action→observation, (3) top-k=3 vector memory retrieval via cosine similarity, (4) MetaGPT-style role transitions as a Markov chain, (5) token-cost comparison vs a single LLM call."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={MATH_DEMO} buttonLabel="Run agent math (Pyodide)" />
      </SectionCard>

      {/* Comparison */}
      <SectionCard
        title="Evolution: AutoGPT → CrewAI → LangGraph → MetaGPT"
        description="How agent frameworks evolved from the original AutoGPT (autonomous but unstructured) to modern LangGraph (graph-based, debuggable) and MetaGPT (role-based SOPs)."
        icon={<Boxes className="h-5 w-5" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30">
              <tr className="border-b border-border/60">
                <th className="text-left px-3 py-2 font-semibold">Feature</th>
                <th className="text-left px-3 py-2 font-semibold">AutoGPT (2023)</th>
                <th className="text-left px-3 py-2 font-semibold">CrewAI (2024)</th>
                <th className="text-left px-3 py-2 font-semibold text-primary">LangGraph (2024)</th>
                <th className="text-left px-3 py-2 font-semibold">MetaGPT (2023)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { f: "Year / paper", a: "Significant Gravitas 2023", b: "CrewAI Inc. 2024", c: "LangChain 2024", d: "Hong et al. 2023" },
                { f: "Pattern", a: "Single agent + ReAct", b: "Role-based crew", c: "Graph (nodes+edges)", d: "Software-engineering SOP" },
                { f: "Multi-agent", a: "No", b: "Yes (roles)", c: "Yes (any topology)", d: "Yes (PM/Arch/Eng/QA)" },
                { f: "State mgmt", a: "Implicit (prompt)", b: "Shared context", c: "Typed state dict", d: "SOP artifacts (PRD/spec)" },
                { f: "Control flow", a: "Prompt-driven", b: "Sequential/delegated", c: "Explicit graph + cycles", d: "Pipeline + reviews" },
                { f: "Language", a: "Python (OpenAI only)", b: "Python", c: "Python + JS", d: "Python" },
                { f: "Best for", a: "Demo / hobby", b: "Business automation", c: "Custom agents + RAG", d: "Code-gen workflows" },
                { f: "Strength", a: "First autonomous agent", b: "Role ergonomics", c: "Debuggable + replayable", d: "Encodes human SOP" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{row.f}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.a}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.b}</td>
                  <td className="px-3 py-2 text-primary/80">{row.c}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Why evolved */}
      <SectionCard
        title="Why agent frameworks evolved — shortfalls of single LLM calls"
        description="Agent frameworks evolved because single LLM calls had 4 fundamental limitations that the agent loop solved."
        icon={<History className="h-5 w-5" />}
        badge="Why Agents"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Shortfall 1: No tool use.</strong> A raw LLM call only emits text — it can't search the web, run code, query a database. ReAct (Yao 2022) added the action step: the LLM emits a structured tool call, the framework executes it, and the observation is fed back. This is what made ChatGPT plugins, then function calling, then MCP possible.</p>
          <p><strong className="text-foreground/80">Shortfall 2: No memory.</strong> A raw LLM is stateless — every call is independent. Agents add (a) short-term conversational memory (the message deque, often compressed), (b) long-term semantic memory (vector store of facts), and (c) episodic memory (full trajectories for replay/RL). This is what ChatGPT's "memory" feature exposes to users.</p>
          <p><strong className="text-foreground/80">Shortfall 3: No planning.</strong> A single LLM call can't break down "write a feature, ship a PR" into sub-tasks. ReAct's Thought step (chain-of-thought before each action) gives implicit planning. Multi-agent frameworks (MetaGPT, CrewAI) make this explicit: a PM agent writes the PRD, an Architect agent writes the spec, an Engineer agent implements. Each role has its own system prompt + toolset.</p>
          <p><strong className="text-foreground/80">Shortfall 4: No control flow.</strong> Pure-prompt agents (AutoGPT) drift — the LLM decides what to do next from context, and the trajectory is opaque. LangGraph makes the control flow an explicit directed graph: nodes = agent functions, edges = conditional transitions. You can visualize, debug, time-travel, and replay — the same benefits we get from Airflow/Dagster for data pipelines.</p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique agent framework features"
        description="Four features that make agent frameworks unique in the LLM stack."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. ReAct = reason + act interleaved</p>
            <p className="text-muted-foreground">LLM alternates chain-of-thought and tool calls — gets unstuck by grounding in real observations. <strong>CoT only: can drift / hallucinate.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Tools = grounding in reality</p>
            <p className="text-muted-foreground">Calculator, search, REPL — the agent can verify its claims. <strong>Pure LLM: closed-loop, no fact-checking.</strong> MCP standardizes this.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Memory = persistent state</p>
            <p className="text-muted-foreground">Short-term (deque) + long-term (vector DB) + episodic (trajectories). <strong>Raw API: stateless, every call is fresh.</strong> Agents = stateful across sessions.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Graph = explicit control flow</p>
            <p className="text-muted-foreground">LangGraph nodes/edges make agent logic inspectable, replayable, debuggable. <strong>AutoGPT: opaque prompt-driven drift.</strong> Graph = the right abstraction for multi-step control.</p>
          </div>
        </div>
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — agent frameworks"
        description="The frameworks and standards that implement agent architectures."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Frameworks</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>LangChain / LangGraph</strong> — the de facto Python agent stack</li>
              <li>• <strong>CrewAI</strong> — role-based crews, easy multi-agent</li>
              <li>• <strong>AutoGen (Microsoft)</strong> — conversational multi-agent</li>
              <li>• <strong>MetaGPT</strong> — encodes software-engineering SOPs</li>
              <li>• <strong>AutoGPT / BabyAGI</strong> — autonomous first-gen agents</li>
              <li>• <strong>OpenAI Assistants API</strong> — hosted agents with tools + memory</li>
              <li>• <strong>Anthropic Claude tools</strong> — function calling + computer use</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-primary" /> Standards + tooling</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>MCP (Model Context Protocol, Anthropic)</strong> — USB-C for AI tools</li>
              <li>• <strong>OpenAI function calling</strong> — JSON-schema tool calls</li>
              <li>• <strong>JSON-mode / structured output</strong> — typed tool args</li>
              <li>• <strong>Computer use (Anthropic, OpenAI)</strong> — agents drive GUIs</li>
              <li>• <strong>LangSmith / Langfuse</strong> — agent trace + observability</li>
              <li>• <strong>Weave (W&amp;B) / Helicone</strong> — agent eval + replay</li>
              <li>• <strong>Browser-use / Playwright</strong> — browser-driven agents</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers that defined agent frameworks."
        icon={<TrendingUp className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Yao et al. 2022 (ReAct):</strong> "ReAct: Synergizing Reasoning and Acting in Language Models" — interleaved chain-of-thought reasoning with tool actions. Showed that grounding the LLM in real observations (search results, code output) dramatically reduces hallucination and improves task success on HotpotQA, AlfWorld, etc. Every modern agent descends from this paper.</p>
          <p><strong className="text-foreground/80">Shinn et al. 2023 (Reflexion):</strong> "Reflexion: Language Agents with Verbal Reinforcement Learning" — added self-reflection: when an agent fails, it writes a verbal critique of why, stores it in episodic memory, and uses it next iteration. Solved AlfWorld at superhuman level.</p>
          <p><strong className="text-foreground/80">Hong et al. 2023 (MetaGPT):</strong> "MetaGPT: Meta Programming for Multi-Agent Collaborative Framework" — encoded a software-engineering SOP (PM → Architect → Engineer → QA → reviewer) as multi-agent roles with structured outputs (PRD, design doc, code, test). Generated whole small projects (Flappy Bird, Snake) end-to-end.</p>
          <p><strong className="text-foreground/80">Park et al. 2023 (Generative Agents):</strong> "Generative Agents: Interactive Simulacra of Human Behavior" — 25 LLM agents in a Smallville-like sandbox, each with reflection + memory + planning. Emergent behaviors: organized a Valentine's Day party, spread information through the town. Showed that agents with memory + reflection produce believable social behavior.</p>
          <p><strong className="text-foreground/80">Anthropic 2024 (MCP):</strong> "Model Context Protocol" — an open standard for tool/function schemas. Lets any LLM call any tool (Postgres, GitHub, Slack, etc.) via a uniform protocol. Like LSP for tools. Rapidly adopted by Cursor, Cline, Continue, etc.</p>
        </div>
      </SectionCard>

      {/* Insight */}
      <SectionCard
        title="My deeper thought: an agent is a stateful, tool-augmented LLM loop"
        description="The unifying view: every agent framework is a different way of structuring the same primitive — stateful LLM execution with tools."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Agent = LLM + tools + memory + control loop.</strong> A bare LLM call is stateless: input → output. An agent wraps that in a loop: state → (thought, action) → observation → updated state. The four components (LLM, tools, memory, loop) are independent — you can swap each. ReAct is the canonical loop. Multi-agent is just multiple loops coordinating. LangGraph makes the loop an explicit graph. CrewAI uses role ergonomics. MetaGPT encodes an SOP. All are variations on the same primitive.</p>
          <p><strong className="text-foreground/80">ReAct IS the gradient-descent analogue for LLMs.</strong> In optimization, you iteratively update parameters: θ ← θ - η∇L(θ). In an agent, you iteratively update state: s ← s ∪ [thought, observation]. The LLM plays the role of the gradient — it tells you which direction to move in (which tool to call). Each observation is a "step" that brings you closer to the answer. The "loss" is implicit (did you finish the task?). This is why agent loops converge: each observation adds information that constrains the next LLM call.</p>
          <p><strong className="text-foreground/80">LangGraph IS the Airflow/Dagster of LLMs.</strong> The progression in data engineering was: shell scripts → cron jobs → Airflow DAGs → Dagster assets. Each step made control flow more explicit and inspectable. The same progression is happening for agents: prompt-only (AutoGPT) → structured prompts (CrewAI) → explicit graphs (LangGraph) → asset-based (emerging). The benefits are identical: visualization, replay, debugging, versioning. <strong>Agents ARE data pipelines</strong>, just with LLM calls instead of SQL transforms.</p>
        </div>
      </SectionCard>


      <DeeperThoughtSection pageTitle="Agent Frameworks">
        <DeeperThought title="Agent frameworks IS the LLM-as-controller pattern — and it's the right abstraction" connectedTo="ADR-001 (platform architecture)">
          <p>{"LangGraph/LangChain/CrewAI/AutoGen all implement: LLM decides action → tool executes → result feeds back → LLM decides next action. This IS the agent loop (ReAct: Reason + Act). The LLM IS the controller; the tools ARE the effectors; the results ARE the observations. This IS the SAME pattern as a PID controller in engineering (sense → compute → act → sense). Agent frameworks ARE PID controllers for LLMs — the pattern (feedback loop) IS the same."}</p>
        </DeeperThought>
        <DeeperThought title="LangGraph IS the state machine — and it's the right model" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"LangGraph models agents as state machines: nodes = LLM calls, edges = transitions, state = shared memory. The graph IS the control flow. This IS the SAME pattern as Airflow's DAG (nodes = tasks, edges = dependencies). The difference: Airflow's nodes are deterministic (SQL, Python); LangGraph's nodes are stochastic (LLM). The math (directed graph + state) IS the same. LangGraph IS Airflow for LLM agents."}</p>
        </DeeperThought>
        <DeeperThought title="Tool use IS the API call — and it's the agent's hands" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"Agents call tools (search, calculator, database query, code execution). Each tool IS an API call with a typed interface. The LLM decides WHICH tool to call, with WHAT arguments. This IS the SAME pattern as function calling in programming — the LLM IS the caller, the tools ARE the functions, the arguments ARE the parameters. Tool use IS function calling for LLMs — the math (dispatch + parameters + return) IS the same."}</p>
        </DeeperThought>
        <DeeperThought title="Multi-agent IS the distributed system — and it's the right scale-up" connectedTo="ADR-001 (platform architecture)">
          <p>{"AutoGen/CrewAI deploy multiple agents that communicate: Agent A writes code, Agent B reviews, Agent C tests. Each agent IS a worker in a distributed system. The communication IS message passing (like microservices). The coordination IS a protocol (like consensus). Multi-agent IS distributed systems for LLMs — the pattern (workers + message passing + coordination) IS the same. The math (distributed consensus) IS the same."}</p>
        </DeeperThought>
        <DeeperThought title="Agent frameworks vs hand-coded pipelines IS the declarative vs imperative debate" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"Hand-coded pipeline: 'run SQL, then Python, then deploy' (imperative — you specify each step). Agent framework: 'here's the goal, here are the tools, figure it out' (declarative — the LLM decides the steps). This IS the SAME debate as SQL vs Python: SQL is declarative (say what, not how), Python is imperative (say how). Agent frameworks ARE SQL for workflows — the pattern (declarative + optimizer) IS the same. The LLM IS the query optimizer."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <RelatedTopics topics={[
        { id: "rag-llms" as const, reason: "RAG = agent's retrieval tool" },
        { id: "rag-deep-dive" as const, reason: "Deep RAG for agent memory" },
        { id: "vector-db" as const, reason: "Vector DB = agent long-term memory" },
        { id: "transformer-deep-dive" as const, reason: "The LLM at the agent's core" },
        { id: "fine-tuning-deep-dive" as const, reason: "Fine-tune agent LLMs" },
        { id: "llmops" as const, reason: "Operate agents in production" },
        { id: "inference-serving" as const, reason: "vLLM for fast agent loops" },
        { id: "diffusion-models-deep-dive" as const, reason: "Agents can call diffusion tools" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("rag-llms")} className="text-sm text-primary hover:underline">&rarr; RAG + LLMs</Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("transformer-deep-dive")} className="text-sm text-primary hover:underline">&rarr; Transformer Deep Dive</Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("diffusion-models-deep-dive")} className="text-sm text-primary hover:underline">&rarr; Diffusion Models Deep Dive</Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("fine-tuning-deep-dive")} className="text-sm text-primary hover:underline">&rarr; Fine-Tuning Deep Dive</Link>
      </div>
    </div>
  );
}
