"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PAGES, hrefFor, pathnameToPageId, type PageId } from "../_lib/router";
import { Icon } from "./icon";
import { ThemeToggle } from "./theme-toggle";
import { LoginButton } from "./login-button";
import { ContextualBandit } from "./contextual-bandit";
import { FloatingLiveButton } from "./floating-live-button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Home, Github, Mail, ShieldCheck } from "lucide-react";

interface AppShellProps {
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
  { title: "About", ids: ["about"] },
  { title: "Knowledge Loop", ids: ["knowledge", "dashboard", "evolution", "research"] },
  { title: "Modern Big Data", ids: ["modern-big-data"] },
  { title: "Databases", ids: ["duckdb"] },
  { title: "Streaming", ids: ["streaming"] },
  { title: "Columnar", ids: ["arrow"] },
  { title: "Patterns", ids: ["patterns"] },
  { title: "Data Mesh", ids: ["data-mesh"] },
  { title: "DataFrames", ids: ["polars"] },
  { title: "Machine Learning", ids: ["ml-platform"] },
  { title: "Deep Learning", ids: ["neural-networks"] },
  { title: "MLOps", ids: ["feature-store", "model-registry", "model-monitoring"] },
  { title: "GenAI", ids: ["rag-llms", "vector-db"] },
  { title: "Reinforcement Learning", ids: ["rl-agentic"] },
  { title: "LLM Training", ids: ["fine-tuning"] },
  { title: "Transformer", ids: ["transformer"] },
  { title: "Comp. Science", ids: ["comp-sci-materials"] },
  { title: "Generative AI", ids: ["gen-ai-patterns"] },
  { title: "Computer Vision", ids: ["computer-vision"] },
  { title: "Diffusion Models", ids: ["diffusion-models"] },
  { title: "Distributed Training", ids: ["distributed-training"] },
  { title: "MLOps & Tracing", ids: ["mlops-tracing"] },
  { title: "Quantization & Inference", ids: ["quantization-inference"] },
  { title: "Inference Serving", ids: ["inference-serving"] },
  { title: "RAG Deep Dive", ids: ["rag-deep-dive"] },
  { title: "Multi-modal RAG", ids: ["multimodal-rag"] },
  { title: "Bioinformatics", ids: ["bioinformatics"] },
  { title: "Cheminformatics", ids: ["cheminformatics"] },
  { title: "Molecular Modelling", ids: ["molecular-modelling"] },
  { title: "Genetic Materials", ids: ["genetic-materials"] },
  { title: "Macro Structures", ids: ["macro-structures"] },
  { title: "Systems Biology", ids: ["systems-biology"] },
  { title: "Cryo-EM", ids: ["cryo-em"] },
  { title: "Spatial Transcriptomics", ids: ["spatial-transcriptomics"] },
  { title: "Single-cell Multi-omics", ids: ["singlecell-multiomics"] },
  { title: "AlphaMissense", ids: ["alphamissense"] },
  { title: "AlphaProteo", ids: ["alphaproteo"] },
  { title: "Boltz", ids: ["boltz"] },
  { title: "AI Drug Discovery", ids: ["ai-drug-discovery"] },
  { title: "Spatial Multi-omics", ids: ["spatial-multiomics"] },
  { title: "Co-evolution & DCA", ids: ["coevolution-dca"] },
  { title: "NN Potentials", ids: ["neural-network-potentials"] },
  { title: "Enhanced Sampling", ids: ["enhanced-sampling"] },
  { title: "Gen Chem 2.0", ids: ["generative-chemistry-2"] },
];

const CONTACT_EMAIL = "testdemoqwenai2025-creator@users.noreply.github.com";
const PUBLIC_REPO_URL = "https://github.com/testdemoqwenai2025-creator/DemoAppDataSci";
const PRIVATE_REPO_URL = "https://github.com/testdemoqwenai2025-creator/AppDataSci-Advanced";

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
  const isHome = active === "home";
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
            M
          </div>
          <div className="hidden md:flex flex-col leading-tight min-w-0">
            <p className="text-xs text-muted-foreground truncate">ModernDataSciEng Platform</p>
            <p className="text-sm font-semibold truncate">Trusted, governed analytics at scale</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Return to Home button — visible on every page except home */}
          {!isHome && (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href={hrefFor("home")} aria-label="Return to home">
                <Home className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Home</span>
              </Link>
            </Button>
          )}
          <Badge variant="outline" className="hidden sm:inline-flex gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Prod · v2.4.0
          </Badge>
          <LoginButton />
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

/** Footer — GDPR notice + GitHub contact + repo links, used on every page */
function FooterContent({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "space-y-2" : "max-w-[1400px] mx-auto w-full space-y-3"}>
      <div className={compact ? "" : "flex flex-col md:flex-row items-start md:items-center justify-between gap-3"}>
        <div className="space-y-1">
          <p className="font-medium text-foreground">© ModernDataSciEng Ltd · Synthetic data platform reference architecture</p>
          <p className="text-[11px]">Built with Snowflake · Databricks · dbt · Tableau · Airflow · Fivetran · Hightouch</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
          <a
            href={PUBLIC_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
          >
            <Github className="h-3.5 w-3.5" /> Public preview repo
          </a>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
          >
            <Mail className="h-3.5 w-3.5" /> {CONTACT_EMAIL}
          </a>
        </div>
      </div>
      <div className="border-t border-border/40 pt-2">
        <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/70" />
          <span>
            <strong className="text-foreground/80">GDPR:</strong> This platform processes personal data in accordance
            with EU Regulation 2016/679 (GDPR). All PII is tagged, masked and access-controlled via Unity Catalogue;
            data subject requests (access, rectification, erasure, portability) can be raised via the contact above.
            Synthetic reference data is used throughout — no real personal data is processed, stored or transmitted.
          </span>
        </p>
      </div>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const active = pathnameToPageId(pathname);

  // Backward-compat: redirect old hash URLs (e.g. /#/databricks → /databricks)
  // Runs once on mount, client-side only.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.startsWith("#/")) {
      const targetId = hash.slice(2).trim();
      const target = PAGES.find((p) => p.id === targetId);
      if (target && target.id !== "home") {
        // Replace history so the back button doesn't bounce to the hash
        window.history.replaceState(null, "", hrefFor(target.id));
        // Force a navigation via hash change to trigger router update
        window.location.hash = "";
        // Navigate using assign to the real route
        window.location.assign(hrefFor(target.id));
      } else if (hash === "#/" || hash === "#") {
        // Home — just clear the hash
        window.history.replaceState(null, "", "/");
        window.location.hash = "";
      }
    }
  }, []);

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
                  M
                </div>
                <p className="text-sm font-semibold">ModernDataSciEng Platform</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <Link href={hrefFor("home")} aria-label="Return to home">
                    <Home className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <LoginButton />
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
                M
              </div>
              <div className="flex flex-col leading-tight">
                <p className="text-xs text-muted-foreground">ModernDataSciEng</p>
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
            {/* Contextual bandit — recommended next pages */}
            <ContextualBandit currentPage={active} />
          </main>
          <footer className="mt-auto border-t border-border/60 bg-muted/30 py-5 px-4 md:px-8">
            <FooterContent />
          </footer>
        </div>
      </div>

      {/* Mobile content (no sidebar visible) */}
      <div className="lg:hidden flex-1 pt-14">
        <TopBar active={active} />
        <main className="px-4 py-5">
          {children}
          <ContextualBandit currentPage={active} />
        </main>
        <footer className="border-t border-border/60 bg-muted/30 py-5 px-4 text-xs text-muted-foreground">
          <FooterContent compact />
        </footer>
      </div>

      {/* Floating live-data button — appears on every non-home page,
          opens the LiveResourcesDrawer with topic pre-set per page */}
      <FloatingLiveButton />
    </div>
  );
}
