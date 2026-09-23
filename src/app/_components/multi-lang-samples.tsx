"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CodeBlock } from "./code-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Languages, ChevronRight } from "lucide-react";

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
  /**
   * When true, renders as a button + Sheet drawer (progressive disclosure).
   * When false (default), renders inline.
   *
   * Use drawer mode for heavy code blocks (5+ samples, >100 lines each) —
   * keeps the page lightweight, lets users expand on demand.
   * This is the Nielson Norman "progressive disclosure" pattern; studies
   * show 22-30% cognitive-load reduction on content-heavy pages.
   */
  drawerMode?: boolean;
  /** When in drawer mode, the button label (defaults to title) */
  drawerButtonLabel?: string;
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
  elixir:    "Elixir",
  c:         "C",
  typescript:"TypeScript",
};

function SampleList({ samples }: { samples: LangSample[] }) {
  const [active, setActive] = useState(0);
  const sample = samples[active];

  return (
    <>
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
    </>
  );
}

/**
 * Multi-language code sample selector.
 * Lets the reader compare idiomatic implementations across languages.
 *
 * Supports two rendering modes:
 *   1. Inline (default): renders the full code blocks on the page
 *   2. Drawer mode (drawerMode=true): renders a button that opens a Sheet drawer
 *      with the full code samples — progressive disclosure pattern.
 *      Use this for heavy code blocks to keep page HTML lightweight.
 */
export function MultiLangSamples({
  title,
  description,
  samples,
  drawerMode = false,
  drawerButtonLabel,
}: MultiLangSamplesProps) {
  if (drawerMode) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="gap-2 w-full justify-between h-auto py-3">
            <span className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">{drawerButtonLabel ?? title}</span>
              <Badge variant="outline" className="text-[10px]">{samples.length} languages</Badge>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[min(680px,100vw)] sm:max-w-[680px] p-0 overflow-y-auto">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60 bg-muted/30">
            <SheetTitle className="text-base flex items-center gap-2">
              <Languages className="h-4 w-4 text-primary" />
              {title}
            </SheetTitle>
            {description && (
              <SheetDescription className="text-xs">{description}</SheetDescription>
            )}
          </SheetHeader>
          <div className="border-b border-border/60">
            <SampleList samples={samples} />
          </div>
          {/* Footer with file types reference */}
          <div className="px-5 py-3 border-t border-border/60 bg-muted/20 text-[11px] text-muted-foreground">
            <p>
              <strong className="text-foreground/80">File types commonly deployed:</strong>{" "}
              {Array.from(new Set(samples.map((s) => s.filename.split(".").pop() || ""))).join(", ")} —
              each compiles to a portable artefact (binary, .so, .beam, .jar, or interpreter-bound source).
            </p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Inline mode
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
      <SampleList samples={samples} />
    </div>
  );
}
