"use client";

import { useState } from "react";
import { CodeBlock } from "./code-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export interface LangSample {
  language: string;
  filename: string;
  code: string;
  highlight?: number[];
  note?: string;
}

interface MultiLangSamplesProps {
  title: string;
  description?: string;
  samples: LangSample[];
}

const LANG_LABELS: Record<string, string> = {
  python:    "Python",
  scala:     "Scala",
  go:        "Go",
  rust:      "Rust",
  java:      "Java",
  sql:       "SQL",
  yaml:      "YAML",
  hcl:       "Terraform",
  bash:      "Bash",
  typescript:"TypeScript",
};

/**
 * Multi-language code sample selector.
 * Lets the reader compare idiomatic implementations across languages.
 */
export function MultiLangSamples({ title, description, samples }: MultiLangSamplesProps) {
  const [active, setActive] = useState(0);
  const sample = samples[active];

  return (
    <div className="rounded-md border border-border/60 overflow-hidden">
      <div className="bg-muted/30 px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">{title}</p>
          <Badge variant="outline" className="ml-auto text-[10px]">{samples.length} languages</Badge>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {/* Language tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border/60 bg-muted/20 px-2 py-2">
        {samples.map((s, i) => (
          <button
            key={s.language + s.filename}
            onClick={() => setActive(i)}
            className={`text-[11px] px-2.5 py-1 rounded border transition-colors font-mono ${
              i === active
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border/60 hover:bg-accent"
            }`}
          >
            {LANG_LABELS[s.language] ?? s.language}
          </button>
        ))}
      </div>
      {/* Active sample */}
      <div className="p-3 bg-card">
        {sample.note && (
          <p className="text-xs text-muted-foreground mb-2 italic">{sample.note}</p>
        )}
        <CodeBlock
          code={sample.code}
          language={sample.language}
          filename={sample.filename}
          highlight={sample.highlight}
        />
      </div>
    </div>
  );
}
