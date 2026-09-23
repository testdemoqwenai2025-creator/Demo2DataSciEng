/**
 * Hash-based router for the Northwind Data Platform MPA.
 * Simulates a true multi-page application within the sandbox single-route constraint.
 * Each "page" is addressed by its hash: e.g. #/snowflake, #/databricks.
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
  | "cicd";

export interface PageMeta {
  id: PageId;
  label: string;
  shortLabel: string;
  group: "Overview" | "Ingestion" | "Storage & Compute" | "Transformation" | "Analytics" | "Governance" | "Delivery";
  icon: string; // lucide icon name
  description: string;
}

export const PAGES: PageMeta[] = [
  {
    id: "home",
    label: "Platform Overview",
    shortLabel: "Overview",
    group: "Overview",
    icon: "LayoutDashboard",
    description: "Single source of truth across the Northwind business — value, KPIs and end-to-end picture.",
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
];

export function pageById(id: string): PageMeta {
  return PAGES.find((p) => p.id === id) ?? PAGES[0];
}

/** Parse `#/snowflake` → `snowflake`. Default = `home`. */
export function parseHash(): PageId {
  if (typeof window === "undefined") return "home";
  const raw = window.location.hash.replace(/^#\/?/, "").trim();
  if (!raw) return "home";
  const match = PAGES.find((p) => p.id === raw);
  return match ? (match.id as PageId) : "home";
}

export function hrefFor(id: PageId): string {
  return `#/${id}`;
}
