"use client";

import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { REVENUE_TREND, CHANNEL_MIX, CUSTOMER_SEGMENTS } from "../_data/synthetic";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar,
  Cell,
} from "recharts";
import { BarChart3, Users, ShieldCheck, Layers, FileText, Gauge, Boxes, Lock } from "lucide-react";

const TABLEAU_RLS = `-- ============================================================
-- Tableau row-level security — governed Snowflake context
-- Stored proc applies current_region() when Tableau service user logs in
-- ============================================================
CREATE OR REPLACE PROCEDURE ANALYTICS.ADMIN.SET_RLS_CONTEXT(region VARCHAR)
RETURNS STRING LANGUAGE JAVASCRIPT AS
$$
  // Sets the session context that Snowflake RLS policies read from
  snowflake.execute({
    sqlText: \`ALTER SESSION SET ROW_ACCESS_REGION = '\${REGION}'\`,
  });
  return \`OK: '\${REGION}'\`;
$$;

-- Embed: Tableau uses service user TSVC_BI_UK with role MARKETING_READER_UK
-- BI extracts are filtered at extract-build time via the same proc,
-- so a UK analyst can never see EU / NA rows even via download.

-- Row access policy (consumed by Tableau extracts + live queries)
CREATE OR REPLACE ROW ACCESS POLICY region_rls
  AS (region_code VARCHAR) RETURNS BOOLEAN
  CURRENT_ROLE() IN ('SYSADMIN','PIE_READER')
  OR region_code = COALESCE(
    SESSION_CONTEXT('ROW_ACCESS_REGION'),
    CURRENT_REGION()
  );

APPLY ROW ACCESS POLICY region_rls
  ON ANALYTICS.GOLD.DIM_CUSTOMER (region_code)
  ON ANALYTICS.GOLD.FCT_ORDERS_SERVING (region_code);
`;

const CERTIFICATION = [
  { name: "Executive Revenue (Board)", owner: "Data Platform", refresh: "06:00 daily", certified: true, status: "Certified" },
  { name: "Channel mix — weekly", owner: "Marketing Analytics", refresh: "Mon 07:00", certified: true, status: "Certified" },
  { name: "Customer segments — RFM", owner: "CRM Engineering", refresh: "Daily 01:00", certified: true, status: "Certified" },
  { name: "Returns rate — Ops", owner: "Operations BI", refresh: "Hourly", certified: true, status: "Certified" },
  { name: "Inventory health (Beta)", owner: "Supply Chain", refresh: "4 hr", certified: false, status: "In review" },
  { name: "Ad-hoc —promo uplift", owner: "Marketing", refresh: "On-demand", certified: false, status: "Self-service" },
];

const KPIS = [
  { label: "Active analysts", value: "312", delta: "+118 YoY", tone: "up" as const, hint: "Across 9 markets" },
  { label: "Certified dashboards", value: "84", delta: "+26 YoY", tone: "up" as const, hint: "vs uncertified" },
  { label: "Self-service queries", value: "47k/mo", delta: "+61%", tone: "up" as const, hint: "Tableau Catalog" },
  { label: "Certified datasets", value: "268", delta: "+54 YoY", tone: "up" as const, hint: "Gold tier" },
];

const SEGMENT_DATA = CUSTOMER_SEGMENTS.map((s) => ({
  segment: s.segment,
  revenue: s.revenue,
  arpu: s.arpu,
}));

export function TableauPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Analytics enablement"
        title="Tableau & analytics"
        description="Tableau sits on top of Snowflake's governed SECURE VIEWS. Certified datasets are flagged, uncertified are hidden from executive views, RLS is enforced via Snowflake session context, and the semantic layer is shared with Hightouch so metrics cannot drift between BI and reverse-ETL."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Lock className="h-3 w-3" /> RLS</Badge>
            <Badge variant="outline" className="gap-1.5"><Gauge className="h-3 w-3" /> Certified</Badge>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} delta={k.delta} deltaTone={k.tone} hint={k.hint} />
        ))}
      </div>

      {/* Synthetic dashboards */}
      <div className="grid lg:grid-cols-3 gap-4">
        <SectionCard title="Revenue & orders trend" icon={<BarChart3 className="h-5 w-5" />} badge="Synthetic">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_TREND} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="trev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="tord" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0 0 / 0.3)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="oklch(0.5 0 0)" />
                <YAxis yAxisId="rev" tick={{ fontSize: 11 }} stroke="oklch(0.5 0 0)" />
                <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11 }} stroke="oklch(0.5 0 0)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area yAxisId="rev" type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2} fill="url(#trev)" name="Revenue (£M)" />
                <Area yAxisId="ord" type="monotone" dataKey="orders" stroke="var(--chart-2)" strokeWidth={2} fill="url(#tord)" name="Orders (M)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Channel mix" icon={<BarChart3 className="h-5 w-5" />} badge="Synthetic">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CHANNEL_MIX} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0 0 / 0.3)" />
                <XAxis dataKey="channel" tick={{ fontSize: 11 }} stroke="oklch(0.5 0 0)" />
                <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.5 0 0)" />
                <Tooltip
                  formatter={(v: number) => `£${v}M`}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Customer ARPU by segment" icon={<Users className="h-5 w-5" />} badge="Synthetic">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="20%" outerRadius="100%" data={SEGMENT_DATA} startAngle={90} endAngle={-270}>
                <RadialBar background dataKey="arpu" cornerRadius={6}>
                  {SEGMENT_DATA.map((_, i) => (
                    <Cell key={i} fill={["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"][i]} />
                  ))}
                </RadialBar>
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} layout="horizontal" align="center" verticalAlign="bottom" />
                <Tooltip
                  formatter={(v: number) => `£${v.toFixed(2)}`}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* RLS */}
      <SectionCard
        title="Row-level security — Snowflake + Tableau"
        description="RLS is enforced at the Snowflake layer, never in Tableau. The Tableau service user logs in via SSO, the SSO attributes drive `SET ROW_ACCESS_REGION`, and every SECURE VIEW automatically filters rows."
        icon={<ShieldCheck className="h-5 w-5" />}
      >
        <CodeBlock code={TABLEAU_RLS} language="sql" filename="tableau_rls.sql" highlight={[10, 11, 12, 13, 14, 21, 22, 23, 24, 25, 26, 27, 28, 29]} />
      </SectionCard>

      {/* Certification matrix */}
      <SectionCard
        title="Dataset certification matrix"
        description="Tableau Catalog flags every published dataset as Certified / In review / Self-service. Only Certified dashboards appear in the executive landing zone."
        icon={<Gauge className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Dashboard</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Owner</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Refresh</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {CERTIFICATION.map((c) => (
                <tr key={c.name} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-2.5 font-medium">{c.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.owner}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{c.refresh}</td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant={c.certified ? "default" : "outline"}
                      className={c.certified ? "gap-1" : "gap-1 text-muted-foreground"}
                    >
                      {c.certified ? "✓ " : ""}
                      {c.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Enablers */}
      <div className="grid md:grid-cols-3 gap-4">
        <SectionCard title="Self-service enablement" icon={<Layers className="h-5 w-5" />}>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• Tableau Catalog: searchable inventory of every published dataset</li>
            <li>• "Ask Data" natural-language queries pinned to Certified datasets only</li>
            <li>• Onboarding path: 4-hour workshop + sandbox workbook</li>
            <li>• Power users per market own their regional dashboards</li>
            <li>• Weekly office hours with the data platform team</li>
          </ul>
        </SectionCard>
        <SectionCard title="Performance & cost" icon={<Gauge className="h-5 w-5" />}>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• Live queries on Snowflake for freshness-sensitive dashboards</li>
            <li>• Hyper extracts for big-table dashboards; refresh at 06:00 / 12:00</li>
            <li>• <InlineCode>WH_REPORTING</InlineCode> warehouse auto-suspend at 60s</li>
            <li>• Parallelism cap per site to control credit burn</li>
            <li>• Usage stats piped to Datadog for right-sizing</li>
          </ul>
        </SectionCard>
        <SectionCard title="Embedded & alerts" icon={<FileText className="h-5 w-5" />}>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• Customer portal embeds certified dashboards via JWT SSO</li>
            <li>• Subscription schedules: daily email + Slack alert digests</li>
            <li>• Threshold alerts (e.g. returns rate &gt; 7%) routed to PagerDuty</li>
            <li>• Mobile-first layout via Tableau Mobile</li>
            <li>• Server REST API used by Hightouch for dataset metadata</li>
          </ul>
        </SectionCard>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("fivetran-hightouch")} className="text-sm text-primary hover:underline">
          → Continue to Fivetran &amp; Hightouch
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("governance")} className="text-sm text-primary hover:underline">
          → or jump to Governance
        </Link>
      </div>
    </div>
  );
}
