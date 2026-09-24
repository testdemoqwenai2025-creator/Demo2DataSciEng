"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Box for a single technology in the architecture diagram */
export function ArchBox({
  title,
  subtitle,
  tech,
  tone = "default",
  href,
  icon,
  className,
}: {
  title: string;
  subtitle?: string;
  tech?: string;
  tone?: "default" | "primary" | "accent" | "muted" | "warning";
  href?: string;
  icon?: ReactNode;
  className?: string;
}) {
  const toneClasses = {
    default: "border-border/60 bg-card",
    primary: "border-primary/40 bg-primary/8",
    accent: "border-amber-500/40 bg-amber-500/8",
    muted: "border-border/60 bg-muted/50",
    warning: "border-rose-500/40 bg-rose-500/8",
  }[tone];

  const inner = (
    <div
      className={cn(
        "rounded-md border p-3 transition-colors",
        toneClasses,
        href && "hover:border-primary hover:bg-primary/10",
        className
      )}
    >
      <div className="flex items-start gap-2">
        {icon && <div className="mt-0.5 text-primary">{icon}</div>}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">{title}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{subtitle}</p>}
          {tech && (
            <p className="mt-1.5 inline-flex text-[10px] font-mono uppercase tracking-wider text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">
              {tech}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

/** A horizontal layer band — e.g. INGEST, LAKEHOUSE, etc. */
export function ArchLayer({
  label,
  colour = "var(--chart-1)",
  children,
}: {
  label: string;
  colour?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colour }} />
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">{children}</div>
    </div>
  );
}

/** Connector arrow */
export function ArchArrow({ label, direction = "down" }: { label?: string; direction?: "down" | "right" }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center text-muted-foreground/60",
        direction === "down" ? "py-1" : "px-1"
      )}
    >
      <span className="text-[10px] uppercase tracking-wider mr-1.5">{label}</span>
      {direction === "down" ? "↓" : "→"}
    </div>
  );
}
