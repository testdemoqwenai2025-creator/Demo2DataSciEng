"use client";

import { type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SectionCardProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline" | "destructive";
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SectionCard({
  title,
  description,
  icon,
  badge,
  badgeVariant = "outline",
  children,
  className,
  contentClassName,
}: SectionCardProps) {
  return (
    <Card className={["border-border/60", className].filter(Boolean).join(" ")}>
      {(title || description) && (
        <CardHeader className="flex flex-row items-start gap-3 space-y-0 border-b border-border/60 bg-muted/30">
          {icon && <div className="mt-0.5 text-primary">{icon}</div>}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {title && <CardTitle className="text-base">{title}</CardTitle>}
              {badge && <Badge variant={badgeVariant} className="text-[10px]">{badge}</Badge>}
            </div>
            {description && (
              <CardDescription className="mt-1 text-xs">{description}</CardDescription>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className={["p-4 md:p-5", contentClassName].filter(Boolean).join(" ")}>
        {children}
      </CardContent>
    </Card>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/80 mb-1.5">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-balance">{title}</h1>
        {description && (
          <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-3xl text-pretty">
            {description}
          </p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "up" | "down" | "flat";
  hint?: string;
}

export function KpiCard({ label, value, delta, deltaTone = "flat", hint }: KpiCardProps) {
  const toneClass =
    deltaTone === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : deltaTone === "down"
      ? "text-rose-600 dark:text-rose-400"
      : "text-muted-foreground";
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        <div className="mt-1 flex items-center gap-2">
          {delta && <span className={`text-xs ${toneClass}`}>{delta}</span>}
          {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
