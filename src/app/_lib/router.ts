/**
 * Real-route router for the ModernDataSciEng Platform.
 *
 * Each page is a real Next.js route: /snowflake, /databricks, etc.
 * Hash anchors (e.g. /#knowledge-loop) are reserved for in-page
 * section scrolling on the home page only.
 */

export type PageId =
  | "home"
  | "architecture"
  | "snowflake"
  | "dbt"
  | "databricks"
  | "tableau"
  | "fivetran-hightouch"
  | "orchestration"
  | "governance"
  | "cicd"
  | "about"
  | "knowledge"
  | "dashboard"
  | "evolution"
  | "research";

export interface PageMeta {
  id: PageId;
  label: string;
  shortLabel: string;
  group: "Overview" | "Ingestion" | "Storage & Compute" | "Transformation" | "Analytics" | "Governance" | "Delivery" | "About" | "Knowledge Loop";
  icon: string;
  description: string;
}

export const PAGES: PageMeta[] = [
  {
    id: "home",
    label: "Platform Overview",
    shortLabel: "Overview",
    group: "Overview",
    icon: "LayoutDashboard",
    description: "Single source of truth across the ModernDataSciEng business — value, KPIs and end-to-end picture.",
  },
  {
    id: "architecture",
    label: "Reference Architecture",
    shortLabel: "Architecture",
    group: "Overview",
    icon: "Network",
    description: "End-to-end modern data platform spanning ingestion, lakehouse, warehouse, semantic layer and consumption.",
  },
  {
    id: "fivetran-hightouch",
    label: "Fivetran & Hightouch",
    shortLabel: "ELT + rETL",
    group: "Ingestion",
    icon: "ArrowLeftRight",
    description: "Managed ELT ingestion from 14 source systems and reverse-ETL activation back into business tools.",
  },
  {
    id: "databricks",
    label: "Databricks Lakehouse",
    shortLabel: "Databricks",
    group: "Storage & Compute",
    icon: "Boxes",
    description: "Spark, PySpark, Delta Lake and the Bronze-Silver-Gold medallion architecture powering analytics at scale.",
  },
  {
    id: "snowflake",
    label: "Snowflake & SQL",
    shortLabel: "Snowflake",
    group: "Storage & Compute",
    icon: "Database",
    description: "Snowflake serving layer with multi-cluster compute, RBAC and governed SQL for analytics & BI.",
  },
  {
    id: "dbt",
    label: "dbt & Dimensional Modelling",
    shortLabel: "dbt",
    group: "Transformation",
    icon: "GitBranch",
    description: "Modular dbt project, dimensional marts, SCD2 history, tests, docs and the semantic layer.",
  },
  {
    id: "orchestration",
    label: "Airflow & Dagster",
    shortLabel: "Orchestration",
    group: "Delivery",
    icon: "Workflow",
    description: "DAG-driven orchestration across Bronze-Silver-Gold with idempotent retries and SLA monitoring.",
  },
  {
    id: "tableau",
    label: "Tableau & Analytics",
    shortLabel: "Tableau",
    group: "Analytics",
    icon: "BarChart3",
    description: "Self-service analytics on top of governed datasets, dashboards, semantic layer and row-level security.",
  },
  {
    id: "governance",
    label: "Data Governance & Observability",
    shortLabel: "Governance",
    group: "Governance",
    icon: "ShieldCheck",
    description: "Unity Catalogue, data quality, lineage, observability and security controls across the platform.",
  },
  {
    id: "cicd",
    label: "Git, CI/CD & DevOps",
    shortLabel: "CI/CD",
    group: "Delivery",
    icon: "GitMerge",
    description: "Trunk-based Git flow, GitHub Actions pipelines, environment promotion and infrastructure as code.",
  },
  {
    id: "about",
    label: "About & Compliance",
    shortLabel: "About",
    group: "About",
    icon: "Info",
    description: "Mission, synthetic-data disclaimer, GDPR compliance, contact and repository links.",
  },
  {
    id: "knowledge",
    label: "Knowledge Hub",
    shortLabel: "Knowledge",
    group: "Knowledge Loop",
    icon: "BookOpen",
    description: "Architecture Decision Records, pattern library, trade-off matrices — the why behind every choice.",
  },
  {
    id: "dashboard",
    label: "Live Dashboard",
    shortLabel: "Dashboard",
    group: "Knowledge Loop",
    icon: "Activity",
    description: "Synthetic real-time pipeline observatory — runs, cost, anomalies, what-if simulator.",
  },
  {
    id: "evolution",
    label: "Evolution Timeline",
    shortLabel: "Evolution",
    group: "Knowledge Loop",
    icon: "GitCompare",
    description: "Versioned history of the platform — decisions made, lessons learned, future roadmap.",
  },
  {
    id: "research",
    label: "Research Papers",
    shortLabel: "Research",
    group: "Knowledge Loop",
    icon: "GraduationCap",
    description: "Academic foundations — papers that inspired each component, with citation graph.",
  },
];

export function pageById(id: string): PageMeta {
  return PAGES.find((p) => p.id === id) ?? PAGES[0];
}

/** Real path for a page: home -> "/", others -> "/<id>" */
export function hrefFor(id: PageId): string {
  return id === "home" ? "/" : `/${id}`;
}

/** Map a pathname (from usePathname()) back to a PageId */
export function pathnameToPageId(pathname: string | null | undefined): PageId {
  if (!pathname || pathname === "/") return "home";
  // Strip leading slash + trailing slash
  const cleaned = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  const match = PAGES.find((p) => p.id === cleaned);
  return match ? (match.id as PageId) : "home";
}
