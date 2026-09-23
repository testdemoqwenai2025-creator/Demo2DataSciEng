"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, Database, ShieldCheck, Workflow, GitBranch, BarChart3, ArrowLeftRight, GitMerge, Network, LayoutDashboard } from "lucide-react";
import { PAGES, hrefFor, type PageId } from "../_lib/router";
import { Icon } from "./icon";
import { ThemeToggle } from "./theme-toggle";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface AppShellProps {
  active: PageId;
  children: React.ReactNode;
}

const GROUPS: Array<{ title: string; ids: PageId[] }> = [
  { title: "Overview", ids: ["home", "architecture"] },
  { title: "Ingestion", ids: ["fivetran-hightouch"] },
  { title: "Storage & Compute", ids: ["databricks", "snowflake"] },
  { title: "Transformation", ids: ["dbt"] },
  { title: "Orchestration & Delivery", ids: ["orchestration", "cicd"] },
  { title: "Analytics", ids: ["tableau"] },
  { title: "Governance", ids: ["governance"] },
];

function SidebarNav({ active, onNavigate }: { active: PageId; onNavigate?: () => void }) {
  return (
    <nav aria-label="Platform sections" className="flex flex-col gap-6">
      {GROUPS.map((g) => (
        <div key={g.title} className="space-y-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {g.title}
          </p>
          <ul className="space-y-1">
            {g.ids.map((id) => {
              const page = PAGES.find((p) => p.id === id)!;
              const isActive = active === id;
              return (
                <li key={id}>
                  <Link
                    href={hrefFor(id)}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      "group flex items-start gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
                    ].join(" ")}
                  >
                    <Icon name={page.icon} className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
                    <span className="flex flex-col">
                      <span className="leading-tight">{page.shortLabel}</span>
                      <span className="text-[11px] text-muted-foreground leading-tight line-clamp-1">
                        {page.description}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function TopBar({ active, onOpenSidebar }: { active: PageId; onOpenSidebar?: () => void }) {
  const page = PAGES.find((p) => p.id === active) ?? PAGES[0];
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        {onOpenSidebar && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onOpenSidebar}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-mono text-sm font-bold">
            N
          </div>
          <div className="hidden md:flex flex-col leading-tight min-w-0">
            <p className="text-xs text-muted-foreground truncate">Northwind Data Platform</p>
            <p className="text-sm font-semibold truncate">Trusted, governed analytics at scale</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="hidden sm:inline-flex gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Prod · v2.4.0
          </Badge>
          <ThemeToggle />
        </div>
      </div>
      {/* Page title bar */}
      <div className="flex items-center gap-2 border-t border-border/60 px-4 md:px-6 py-2.5 bg-muted/30">
        <Icon name={page.icon} className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">{page.label}</p>
        <span className="text-xs text-muted-foreground hidden md:inline">— {page.description}</span>
      </div>
    </header>
  );
}

export function AppShell({ active, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col">
      {/* Mobile sidebar (sheet) */}
      <div className="lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <div className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/85 backdrop-blur border-b border-border/60 flex items-center px-4">
              <Button variant="ghost" size="icon" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <div className="ml-2 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-mono text-sm font-bold">
                  N
                </div>
                <p className="text-sm font-semibold">Northwind Data Platform</p>
              </div>
              <div className="ml-auto">
                <ThemeToggle />
              </div>
            </div>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 pr-0">
            <div className="px-4 pt-2 pb-6">
              <SidebarNav active={active} onNavigate={() => setMobileOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:flex flex-1">
        <aside className="sticky top-0 h-screen w-72 shrink-0 border-r border-border/60 bg-sidebar/40 overflow-y-auto">
          <div className="sticky top-0 bg-sidebar/40 backdrop-blur px-4 py-4 border-b border-border/60">
            <Link href={hrefFor("home")} className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-mono font-bold">
                N
              </div>
              <div className="flex flex-col leading-tight">
                <p className="text-xs text-muted-foreground">Northwind</p>
                <p className="text-sm font-semibold">Data Platform</p>
              </div>
            </Link>
          </div>
          <div className="px-2 py-4">
            <SidebarNav active={active} />
          </div>
          <div className="px-4 pb-6 mt-4 border-t border-border/60 pt-4">
            <p className="text-[11px] text-muted-foreground">
              Synthetic reference implementation · 14 source systems · 4 environments · 99.97% SLA
            </p>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar active={active} />
          <main className="flex-1 px-4 md:px-8 py-6 max-w-[1400px] mx-auto w-full">
            <div key={active} className="page-enter">{children}</div>
          </main>
          <footer className="mt-auto border-t border-border/60 bg-muted/30 py-4 px-4 md:px-8">
            <div className="max-w-[1400px] mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
              <p>© Northwind Retail Ltd · Synthetic data platform reference architecture</p>
              <p>Built with Snowflake · Databricks · dbt · Tableau · Airflow · Fivetran · Hightouch</p>
            </div>
          </footer>
        </div>
      </div>

      {/* Mobile content (no sidebar visible) */}
      <div className="lg:hidden flex-1 pt-14">
        <TopBar active={active} />
        <main className="px-4 py-5">{children}</main>
        <footer className="border-t border-border/60 bg-muted/30 py-4 px-4 text-xs text-muted-foreground">
          © Northwind Retail Ltd · Synthetic data platform reference architecture
        </footer>
      </div>
    </div>
  );
}
