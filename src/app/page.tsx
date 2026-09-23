"use client";

import { AppShell } from "./_components/app-shell";
import { useHashRoute } from "./_lib/use-hash-route";
import { HomePage } from "./_pages/home";
import { ArchitecturePage } from "./_pages/architecture";
import { SnowflakePage } from "./_pages/snowflake";
import { DbtPage } from "./_pages/dbt";
import { DatabricksPage } from "./_pages/databricks";
import { TableauPage } from "./_pages/tableau";
import { FivetranHightouchPage } from "./_pages/fivetran-hightouch";
import { OrchestrationPage } from "./_pages/orchestration";
import { GovernancePage } from "./_pages/governance";
import { CicdPage } from "./_pages/cicd";
import { AboutPage } from "./_pages/about";
import { KnowledgePage } from "./_pages/knowledge";
import { DashboardPage } from "./_pages/dashboard";
import { EvolutionPage } from "./_pages/evolution";
import { ResearchPage } from "./_pages/research";

/**
 * ModernDataSciEng Platform — MPA entry point.
 *
 * Pages are routed via URL hash (#/snowflake, #/databricks, ...) so that the
 * sandbox single-route constraint is respected while delivering a true
 * multi-page experience: each "page" is a distinct URL, navigation causes a
 * full content swap + scroll-to-top, and the URL is shareable.
 */
export default function Home() {
  const route = useHashRoute();

  const Page = (() => {
    switch (route) {
      case "home": return <HomePage />;
      case "architecture": return <ArchitecturePage />;
      case "snowflake": return <SnowflakePage />;
      case "dbt": return <DbtPage />;
      case "databricks": return <DatabricksPage />;
      case "tableau": return <TableauPage />;
      case "fivetran-hightouch": return <FivetranHightouchPage />;
      case "orchestration": return <OrchestrationPage />;
      case "governance": return <GovernancePage />;
      case "cicd": return <CicdPage />;
      case "about": return <AboutPage />;
      case "knowledge": return <KnowledgePage />;
      case "dashboard": return <DashboardPage />;
      case "evolution": return <EvolutionPage />;
      case "research": return <ResearchPage />;
      default: return <HomePage />;
    }
  })();

  return <AppShell active={route}>{Page}</AppShell>;
}
