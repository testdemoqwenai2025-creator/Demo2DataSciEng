"use client";

import { type ReactNode, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  highlight?: number[]; // line numbers to highlight (1-indexed)
}

/**
 * Lightweight, dependency-free code block with copy-to-clipboard.
 * Keeps comment / keyword colours in CSS so we don't pull a heavy
 * syntax highlighter on every page.
 */
export function CodeBlock({ code, language = "sql", filename, highlight = [] }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\n$/, "").split("\n");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be blocked in some sandboxes — silently ignore
    }
  };

  return (
    <div className="rounded-md border border-border/60 bg-[oklch(0.16_0.005_240)] text-[oklch(0.97_0.005_60)] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2 text-[11px] text-white/60 font-mono">
          <span className="h-2 w-2 rounded-full bg-rose-400" />
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="ml-2 uppercase tracking-wider">{language}</span>
          {filename && <span className="text-white/40">· {filename}</span>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px] text-white/70 hover:text-white hover:bg-white/10"
          onClick={copy}
          aria-label="Copy code"
        >
          {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="code-scroll overflow-x-auto p-3 text-[12.5px] leading-relaxed font-mono">
        <code>
          {lines.map((line, i) => {
            const lineNo = i + 1;
            const isHi = highlight.includes(lineNo);
            return (
              <div
                key={lineNo}
                className={[
                  "flex",
                  isHi ? "bg-primary/20 -mx-3 px-3 border-l-2 border-primary" : "",
                ].join(" ")}
              >
                <span className="select-none text-white/30 w-8 inline-block text-right pr-3 shrink-0">
                  {lineNo}
                </span>
                <span className="whitespace-pre">{line || " "}</span>
              </div>
            );
          })}
        </code>
      </pre>
    </div>
  );
}

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 text-[12px] font-mono text-foreground/90 border border-border/60">
      {children}
    </code>
  );
}
