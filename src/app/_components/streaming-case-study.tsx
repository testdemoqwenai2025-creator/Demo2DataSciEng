"use client";

import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Zap, Radio, Activity, Database, Server, Cloud, Gauge, ArrowRight } from "lucide-react";
import { PyodideRunner } from "./pyodide-runner";
import { CodeBlock } from "./code-block";

/**
 * StreamingCaseStudy — real-world case study for the Streaming page.
 * Shows Kafka at LinkedIn scale: 7 trillion messages/day, 100+ clusters,
 * 14K+ topics, 2.5 PB/day. Mirrors the LHC ingestion scenario pattern.
 *
 * Features:
 *   - KPIs (7T msgs/day, 100+ clusters, 14K topics, 2.5 PB/day)
 *   - Animated pipeline viz (producers → Kafka brokers → consumers)
 *   - Pyodide-runnable Python code (Kafka producer/consumer simulation)
 *   - Data toggle (real LinkedIn stats vs synthetic Kafka events)
 *   - All in browser popups (lazy evaluation)
 */

interface LazyModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  accent: string;
  icon: ReactNode;
  children: ReactNode;
}

function LazyModal({ open, onClose, title, subtitle, accent, icon, children }: LazyModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 md:p-6 overflow-y-auto"
          onClick={onClose}
        >
          <button type="button" onClick={onClose}
            className="absolute top-3 right-3 z-30 p-2 rounded-full bg-background/90 border border-border hover:bg-accent transition-colors"
            aria-label="Close">
            <X className="h-5 w-5" />
          </button>
          <div className="absolute top-3 left-3 z-30 px-3 py-1.5 rounded-full bg-background/90 border border-border flex items-center gap-2 text-xs font-semibold">
            <span style={{ color: accent }}>{icon}</span>
            <span style={{ color: accent }}>{title}</span>
          </div>
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-4xl my-8 rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border/40 bg-muted/20 px-4 md:px-6 py-3 flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                style={{ backgroundColor: accent + "20" }}>
                {icon}
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold leading-tight" style={{ color: accent }}>{title}</p>
                {subtitle && <p className="text-xs text-muted-foreground font-mono">{subtitle}</p>}
              </div>
            </div>
            <div className="p-4 md:p-6 max-h-[80vh] overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// Animated pipeline visualization
// ============================================================
function KafkaPipelineViz() {
  const [activeStage, setActiveStage] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActiveStage(s => (s + 1) % 5), 1500);
    return () => clearInterval(id);
  }, []);

  const stages = [
    { name: "Producers", rate: "7T msgs/day", desc: "100K+ microservices writing to Kafka" },
    { name: "Kafka Brokers", rate: "2.5 PB/day", desc: "100+ clusters, 14K+ topics, replication factor 3" },
    { name: "Consumers", rate: "~5ms latency", desc: "Samoa, Brooklin, Espresso — 100+ consumer groups" },
    { name: "Schema Registry", rate: "Avro + Protobuf", desc: "Schema evolution + backward compatibility" },
    { name: "Monitoring", rate: "Burrow + Cruise Control", desc: "Lag monitoring, auto-rebalance partitions" },
  ];

  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <svg viewBox="0 0 500 200" className="w-full h-auto">
        {stages.map((s, i) => {
          const x = 20 + i * 95;
          const isActive = i === activeStage;
          return (
            <motion.g key={i} animate={{ opacity: isActive ? 1 : 0.4 }} transition={{ duration: 0.3 }}>
              {i < stages.length - 1 && (
                <motion.line x1={x + 65} y1="100" x2={x + 85} y2="100"
                  stroke={isActive ? "oklch(0.75 0.16 250)" : "oklch(0.55 0.05 250 / 0.3)"}
                  strokeWidth={isActive ? 2 : 1}
                />
              )}
              <motion.rect x={x} y="55" width="65" height="55" rx="4"
                fill={isActive ? "oklch(0.65 0.16 250 / 0.3)" : "oklch(0.55 0.05 250 / 0.1)"}
                stroke={isActive ? "oklch(0.75 0.16 250)" : "oklch(0.55 0.05 250)"}
                strokeWidth={isActive ? 1.5 : 0.8}
              />
              <text x={x + 32.5} y="80" textAnchor="middle" fontSize="8"
                fill={isActive ? "oklch(0.85 0.16 250)" : "oklch(0.55 0.05 250)"} fontWeight="bold">
                {s.name}
              </text>
              <text x={x + 32.5} y="92" textAnchor="middle" fontSize="7"
                fill={isActive ? "oklch(0.75 0.10 250)" : "oklch(0.45 0.05 250)"}>
                {s.rate}
              </text>
              {isActive && (
                <motion.circle cx={x + 32.5} cy="130" r="3" fill="oklch(0.85 0.16 250)"
                  animate={{ cx: [x + 5, x + 60, x + 5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.g>
          );
        })}
        <text x="250" y="160" textAnchor="middle" fontSize="9" fill="oklch(0.75 0.16 250)" fontWeight="bold">
          {stages[activeStage].name}: {stages[activeStage].desc}
        </text>
        <text x="250" y="175" textAnchor="middle" fontSize="8" fill="oklch(0.55 0.05 250)">
          Data rate: {stages[activeStage].rate}
        </text>
      </svg>
    </div>
  );
}

// ============================================================
// Data toggle: real LinkedIn stats vs synthetic Kafka events
// ============================================================
function DataToggle() {
  const [mode, setMode] = useState<"real" | "synthetic">("real");

  const realStats = `LinkedIn Kafka Cluster Stats (2024)
──────────────────────────────────
Clusters:           100+
Topics:             14,000+
Partitions:         200,000+
Brokers:            1,500+
Messages/day:       7 trillion (7T)
Data/day:           2.5 PB
Peak throughput:    450 GB/s
Replication factor: 3 (every msg on 3 brokers)
Consumer groups:    100,000+
Consumer lag p99:   < 5 seconds
Schema formats:     Avro (primary), Protobuf
Cluster manager:    Cruise Control (auto-rebalance)
MirrorMaker2:        Geo-replication to DR region
Monitoring:          Burrow (lag), JMX, Pinot dashboards`;

  const generateSynthetic = () => {
    const events = [];
    for (let i = 0; i < 8; i++) {
      const topics = ["user-activity", "profile-updates", "messages", "feed-impressions", "ad-clicks", "job-applications"];
      const topic = topics[i % topics.length];
      const partition = Math.floor(Math.random() * 200);
      const offset = Math.floor(Math.random() * 1000000);
      const key = "user-" + Math.floor(Math.random() * 900000);
      const latency = Math.floor(Math.random() * 10 + 1);
      events.push(`topic=${topic}  partition=${partition}  offset=${offset}  key=${key}  latency=${latency}ms`);
    }
    return "Synthetic Kafka Events (simulated producer/consumer)\n" + "─".repeat(60) + "\n" + events.join("\n");
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setMode("real")}
          className={`h-10 rounded-md border text-xs font-semibold transition-all ${mode === "real" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary hover:bg-accent"}`}>
          <Database className="h-3 w-3 inline mr-1.5" /> Real LinkedIn stats
        </button>
        <button type="button" onClick={() => setMode("synthetic")}
          className={`h-10 rounded-md border text-xs font-semibold transition-all ${mode === "synthetic" ? "bg-amber-600 text-white border-amber-600" : "bg-card border-border hover:border-amber-500"}`}>
          <Activity className="h-3 w-3 inline mr-1.5" /> Synthetic events
        </button>
      </div>
      <div className="rounded-md border border-border/60 bg-card p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          {mode === "real" ? "LinkedIn Kafka production stats (publicly disclosed)" : "Synthetic Kafka producer/consumer events (simulated)"}
        </p>
        <pre className="text-[10px] font-mono text-foreground/80 leading-relaxed overflow-x-auto whitespace-pre-wrap">
          {mode === "real" ? realStats : generateSynthetic()}
        </pre>
      </div>
    </div>
  );
}

// ============================================================
// Code: Kafka producer + consumer simulation (Pyodide-runnable)
// ============================================================
const KAFKA_CODE = `import random
import time

print("=== LinkedIn Kafka Simulation (Python) ===")
print()

# Simulate Kafka producer (7T msgs/day = ~81M msgs/sec)
topics = ["user-activity", "profile-updates", "messages", "feed-impressions", "ad-clicks", "job-applications"]
partitions = {t: random.randint(50, 200) for t in topics}

print("=== Kafka Cluster Configuration ===")
print("  Brokers: 1500 (100+ clusters)")
print("  Topics: " + str(len(topics)))
print("  Total partitions: " + str(sum(partitions.values())))
print("  Replication factor: 3")
print("  Messages/day: ~7 trillion (81M/sec average)")
print()

# Simulate producing events
print("=== Producer Simulation (1000 events) ===")
n_events = 1000
topic_counts = {}
total_bytes = 0
for i in range(n_events):
    topic = random.choice(topics)
    partition = random.randint(0, partitions[topic] - 1)
    key = "user-" + str(random.randint(1, 900000))
    value_len = random.randint(100, 2000)
    total_bytes += value_len
    topic_counts[topic] = topic_counts.get(topic, 0) + 1

print("  Events produced: " + str(n_events))
print("  Total bytes: " + str(total_bytes) + " (" + str(round(total_bytes / 1024, 1)) + " KB)")
print("  Average event size: " + str(round(total_bytes / n_events)) + " bytes")
print()

print("  Topic distribution:")
for topic, count in sorted(topic_counts.items(), key=lambda x: -x[1]):
    pct = count / n_events * 100
    bar = "#" * int(pct / 2)
    print("    " + topic + ": " + str(count) + " (" + str(round(pct, 1)) + "%) " + bar)

print()

# Simulate consumer lag monitoring (Burrow-style)
print("=== Consumer Lag Monitoring (Burrow) ===")
consumer_groups = ["samoa-feed", "espresso-jobs", "brooklin-mirror", "pinot-realtime"]
for group in consumer_groups:
    lag = random.randint(0, 50)
    status = "OK" if lag < 10 else "WARNING" if lag < 30 else "CRITICAL"
    print("  " + group + ": lag=" + str(lag) + " msgs  [" + status + "]")

print()
print("=== LinkedIn Scale Extrapolation ===")
daily_msgs = 7e12
daily_bytes = 2.5e15
avg_msg_size = daily_bytes / daily_msgs
print("  7T msgs/day = " + str(int(daily_msgs / 86400)) + " msgs/sec average")
print("  2.5 PB/day = " + str(round(daily_bytes / 86400 / 1e9, 1)) + " GB/sec average")
print("  Avg message size: " + str(round(avg_msg_size)) + " bytes")
print("  Storage per topic (avg): " + str(round(daily_bytes / 14000 / 1e12, 2)) + " TB/day")
print()
print("  At LinkedIn scale, Kafka IS the nervous system of the company.")
print("  Every page view, message, job application flows through Kafka.")`;

// ============================================================
// Main component
// ============================================================
export function StreamingCaseStudy() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-md border border-border/60 bg-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Messages/day</p>
          <p className="font-mono text-base font-bold text-primary">7 trillion</p>
          <p className="text-[10px] text-muted-foreground">81M msgs/sec average</p>
        </div>
        <div className="rounded-md border border-border/60 bg-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Kafka clusters</p>
          <p className="font-mono text-base font-bold text-primary">100+</p>
          <p className="text-[10px] text-muted-foreground">1,500 brokers total</p>
        </div>
        <div className="rounded-md border border-border/60 bg-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Topics</p>
          <p className="font-mono text-base font-bold text-primary">14,000+</p>
          <p className="text-[10px] text-muted-foreground">200K+ partitions</p>
        </div>
        <div className="rounded-md border border-border/60 bg-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Data/day</p>
          <p className="font-mono text-base font-bold text-primary">2.5 PB</p>
          <p className="text-[10px] text-muted-foreground">replication factor 3</p>
        </div>
      </div>

      {/* Pipeline visualization */}
      <KafkaPipelineViz />

      {/* Data toggle */}
      <div className="rounded-md border border-border/60 bg-card p-4">
        <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <Database className="h-4 w-4 text-primary" /> Data: real LinkedIn stats vs synthetic events
        </p>
        <DataToggle />
      </div>

      {/* Code card */}
      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-amber-600" />
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            Kafka producer + consumer simulation (Pyodide-runnable)
          </p>
        </div>
        <CodeBlock language="python" filename="linkedin_kafka.py" code={KAFKA_CODE} />
        <PyodideRunner
          buttonLabel="Run Kafka simulation (Pyodide)"
          code={KAFKA_CODE}
        />
      </div>

      {/* Architecture notes */}
      <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
        <p className="text-sm font-semibold text-primary mb-2">LinkedIn&apos;s Kafka architecture — the world&apos;s largest streaming deployment</p>
        <div className="grid md:grid-cols-2 gap-3 text-xs text-muted-foreground leading-relaxed">
          <div>
            <p className="font-semibold text-foreground/80 mb-1">Why Kafka at LinkedIn?</p>
            <p>LinkedIn pioneered Kafka (2010, now Apache) to handle their real-time activity feed. Before Kafka, they used ActiveMQ which couldn&apos;t scale past ~10K msgs/sec. Kafka&apos;s key insight: treat messages as an append-only log (like a database WAL), not a queue — enabling replay, parallel consumption, and massive throughput.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground/80 mb-1">LinkedIn&apos;s streaming stack</p>
            <p>Built on Kafka: <strong>SAMOA</strong> (stream processing), <strong>Brooklin</strong> (cross-cluster replication — open-sourced 2018), <strong>Espresso</strong> (distributed key-value store backed by Kafka), <strong>Pinot</strong> (real-time analytics — now Apache Pinot). Every LinkedIn feature touches Kafka.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground/80 mb-1">Scaling challenges</p>
            <p>At 7T msgs/day, LinkedIn faces: broker rebalancing (Cruise Control), consumer lag (Burrow), schema evolution (Schema Registry with Avro), geo-replication (MirrorMaker2 → Brooklin), storage pressure (Tiered Storage to S3), and cross-region failover.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground/80 mb-1">Connection to the platform</p>
            <p>The ModernDataSciEng platform uses Kafka for: CDC from Bronze (Debezium), real-time anomaly alerts to the Dashboard, event-driven Airflow triggers, and feature store feature updates. Same Kafka patterns, 100x smaller scale (~7B rows/month vs 7T msgs/day).</p>
          </div>
        </div>
      </div>

      {/* Open popup button */}
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Zap className="h-3.5 w-3.5" /> Open detailed case study
      </Button>

      {/* Lazy modal */}
      <LazyModal
        open={open}
        onClose={() => setOpen(false)}
        title="LinkedIn Kafka — Deep Dive"
        subtitle="7T msgs/day, 100+ clusters, the world's largest streaming deployment"
        accent="oklch(0.55 0.16 250)"
        icon={<Radio className="h-4 w-4" />}
      >
        <div className="space-y-4">
          <KafkaPipelineViz />
          <DataToggle />
          <CodeBlock language="python" filename="linkedin_kafka.py" code={KAFKA_CODE} />
          <PyodideRunner buttonLabel="Run Kafka simulation (Pyodide)" code={KAFKA_CODE} />
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs">
            <p className="font-semibold text-emerald-700 dark:text-emerald-300 mb-1">Implementation insight</p>
            <p className="text-muted-foreground">LinkedIn&apos;s Kafka deployment is 1000x larger than the platform&apos;s (7T msgs/day vs 3.1B rows/month). But the patterns are identical: append-only log, consumer groups, schema evolution, replication factor 3, lag monitoring. The only difference is scale — Kafka is linearly scalable. The platform could grow to LinkedIn&apos;s scale by adding more brokers + partitions without changing any application code.</p>
          </div>
        </div>
      </LazyModal>
    </div>
  );
}
