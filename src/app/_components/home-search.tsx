"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PAGES, hrefFor } from "../_lib/router";
import { Search, X, ArrowRight, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Search box — appears on the home hero. Filters across all 15 pages by
 * label, description, or group. Live results dropdown with keyboard nav.
 */
export function HomeSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter(); // use router.push — respects basePath on GitHub Pages

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return PAGES.filter((p) => {
      return (
        p.label.toLowerCase().includes(q) ||
        p.shortLabel.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.group.toLowerCase().includes(q)
      );
    }).slice(0, 8);
  }, [query]);

  // Reset active idx when query changes — done inline at the onChange site
  // (no useEffect, avoids setState-in-effect)

  // Close dropdown on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIdx]) {
      const target = results[activeIdx];
      // router.push applies basePath automatically (window.location.assign would
      // strip it on GitHub Pages, causing a 404)
      router.push(hrefFor(target.id));
      setQuery("");
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSelect = (pageId: typeof PAGES[number]["id"]) => {
    // router.push applies basePath automatically (window.location.assign would
    // strip it on GitHub Pages, causing a 404)
    router.push(hrefFor(pageId));
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIdx(0); // reset active selection on new query
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search 15 pages — Snowflake, dbt, ADRs, research papers…"
          className="pl-9 pr-9 h-11 text-sm bg-background/80 backdrop-blur border-border/60 shadow-sm"
          aria-label="Search platform pages"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && query && (
        <div className="absolute top-full mt-1 left-0 right-0 rounded-md border border-border/60 bg-popover shadow-md max-h-80 overflow-y-auto z-50">
          {results.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No pages match <code className="font-mono">&ldquo;{query}&rdquo;</code>
            </div>
          ) : (
            <ul className="py-1">
              {results.map((p, i) => (
                <li key={p.id}>
                  <button
                    onClick={() => handleSelect(p.id)}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`w-full text-left px-3 py-2 flex items-start gap-2.5 transition-colors ${
                      i === activeIdx ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5 mt-0.5 text-primary/70 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-tight">{p.label}</p>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.group}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-1 mt-0.5">
                        {p.description}
                      </p>
                    </div>
                    <ArrowRight className="h-3 w-3 mt-1 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-border/60 px-3 py-1.5 text-[10px] text-muted-foreground flex items-center justify-between">
            <span>{results.length} of {PAGES.length} pages</span>
            <span className="font-mono">↑↓ navigate · ↵ open · esc close</span>
          </div>
        </div>
      )}
    </div>
  );
}
