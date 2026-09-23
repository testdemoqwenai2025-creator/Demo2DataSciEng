"use client";

import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { SOURCE_SYSTEMS, REVERSE_ETL_AUDIENCES } from "../_data/synthetic";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, Activity, Boxes, Workflow, ShieldCheck, Zap, Database, RefreshCw } from "lucide-react";

const FIVETRAN_API = `# ============================================================
# Programmatic source onboarding via Fivetran REST API
# Triggered by Airflow when a new source appears in the catalog
# ============================================================
import requests, os

FIVETRAN_API = "https://api.fivetran.com/v1"
HEADERS = {"Authorization": f"Bearer {os.environ['FIVETRAN_API_KEY']}"}
GROUP_ID   = "moderndatascieng_bronze"

def create_connector(system: str, service: str, config: dict) -> str:
    """Create a Fivetran connector inside the Bronze group."""
    payload = {
        "group_id": GROUP_ID,
        "service": service,                    # 'shopify', 'salesforce', ...
        "trust_certificates": True,
        "run_setup_tests": True,
        "config": config,
    }
    r = requests.post(f"{FIVETRAN_API}/connectors", json=payload, headers=HEADERS)
    r.raise_for_status()
    connector_id = r.json()["data"]["id"]
    # Sync frequency: 15min for transactional, 1hr for marketing, 6hr for ERP
    sync_freq = {"transactional": 15, "marketing": 60, "erp": 360}[service]
    requests.patch(
        f"{FIVETRAN_API}/connectors/{connector_id}",
        json={"sync_frequency": sync_freq, "schedule_type": "automated"},
        headers=HEADERS,
    )
    return connector_id

# Example: new Shopify Plus store onboarded in minutes
shopify_cfg = {
    "domain": "moderndatascieng-eu.myshopify.com",
    "api_key": "{REDACTED}",
    "sync_mode": "Incremental via Shopify webhook",
}
connector = create_connector("Shopify Plus EU", "shopify", shopify_cfg)
print(f"Bronze connector live: {connector}")
`;

const HIGHTOUCH_SYNC = `-- ============================================================
-- Hightouch SQL model — VIP audience (top 5% by LTV)
-- Executed on Snowflake WH_GOLD_SERVING every hour
-- Sync target: Salesforce CRM (Account team outreach)
-- ============================================================
WITH customer_ltv AS (
  SELECT
    c.customer_sk,
    c.customer_id,
    c.full_name,
    c.customer_email_hash,
    c.region_code,
    c.loyalty_tier,
    SUM(o.order_net_amount_gbp) AS ltv_gbp,
    COUNT(DISTINCT o.order_id)   AS orders_12m
  FROM ANALYTICS.GOLD.DIM_CUSTOMER   c
  JOIN ANALYTICS.GOLD.FCT_ORDERS_SERVING o
    ON o.customer_sk = c.customer_sk
  WHERE o.order_ts >= DATEADD('month', -12, CURRENT_TIMESTAMP())
    AND o.is_deleted = FALSE
    AND c.is_active  = TRUE
  GROUP BY 1,2,3,4,5,6
),

ranked AS (
  SELECT
    *,
    PERCENT_RANK() OVER (ORDER BY ltv_gbp DESC) AS ltv_pct
  FROM customer_ltv
)

SELECT
  customer_id   AS salesforce_account_id,
  full_name     AS vip_label,
  customer_email_hash AS email_hash,
  ltv_gbp       AS vip_lifetime_value_gbp,
  orders_12m    AS vip_orders_12m,
  loyalty_tier  AS vip_loyalty_tier
FROM ranked
WHERE ltv_pct <= 0.05            -- top 5% by LTV
  AND ltv_gbp  >= 1000           -- minimum threshold
  AND region_code IN ('UK','EU','NA')   -- RLS context-aware
`;

const HIGHTOUCH_SETTINGS = `# hightouch-sync.yml — declarative sync definition
sync:
  name: vip_loyalty_top_5_percent
  description: Hourly sync to Salesforce for account team outreach
  source:
    model: vip_loyalty_top_5_percent
    warehouse: WH_GOLD_SERVING
    database: MODERNDATASCIENG_PROD
    schema: GOLD
  destination:
    type: salesforce
    object: Account
    upsert_key: salesforce_account_id
    mapping:
      - source: vip_label
        target: Name
      - source: vip_lifetime_value_gbp
        target: VIP_LTV_GBP__c
      - source: vip_loyalty_tier
        target: Loyalty_Tier__c
  schedule:
    type: hourly
    cron: "0 * * * *"
    tz: Europe/London
  notifications:
    on_failure: pagerduty:data-platform
    on_success: slack:#data-platform
  governance:
    pii_columns: [customer_email_hash]
    masking: hash
    audit_log: true
    owner: data_platform
`;

export function FivetranHightouchPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Ingestion & activation"
        title="Fivetran (ELT) + Hightouch (reverse-ETL)"
        description="Fivetran ingests 14 source systems (3.1B rows / month) into Bronze with schema-on-read CDC. Hightouch pushes governed audiences back into Salesforce, Klaviyo, Meta Ads and HubSpot — every audience is a SQL model on Snowflake, versioned in Git, PII-tagged and audit-logged."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Activity className="h-3 w-3" /> 14 sources</Badge>
            <Badge variant="outline" className="gap-1.5"><RefreshCw className="h-3 w-3" /> 5 audiences</Badge>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Source systems" value="14" delta="onboarded in 6 months" deltaTone="up" hint="ELT" />
        <KpiCard label="Rows / month" value="3.1B" delta="+22% YoY" deltaTone="up" hint="Bronze ingest" />
        <KpiCard label="Median freshness" value="9 min" delta="−37% vs FY24" deltaTone="up" hint="Bronze→Gold SLA" />
        <KpiCard label="Reverse-ETL audiences" value="5" delta="+3 in pipeline" deltaTone="up" hint="Activated segments" />
      </div>

      {/* Sources table */}
      <SectionCard
        title="Fivetran — source connectors"
        description="Every source is provisioned via Terraform / API. Schema drift auto-PRs to a schema registry repo. Bronze is append-only, schema-on-read."
        icon={<Boxes className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/60 backdrop-blur">
              <tr className="border-b border-border/60">
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Source</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Volume / mo</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Method</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Freshness</th>
              </tr>
            </thead>
            <tbody>
              {SOURCE_SYSTEMS.map((s) => (
                <tr key={s.name} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{s.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{s.type}</td>
                  <td className="px-4 py-2.5 font-mono text-xs tabular-nums">{s.records}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline" className="text-[10px]">{s.method}</Badge>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{s.freshness}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Code */}
      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard
          title="Fivetran API — programmatic onboarding"
          description="New sources are onboarded in minutes via Terraform + Fivetran REST API, with sync frequency set per source class."
          icon={<ArrowLeftRight className="h-5 w-5" />}
          badge="Python"
        >
          <CodeBlock code={FIVETRAN_API} language="python" filename="fivetran_onboard.py" highlight={[14, 15, 16, 17, 18, 19, 20, 21, 26, 27, 28, 29, 30]} />
        </SectionCard>

        <SectionCard
          title="Hightouch — VIP audience SQL model"
          description="Audiences are SQL models in Snowflake, version-controlled in Git. Every sync upserts by a stable business key (e.g. salesforce_account_id)."
          icon={<Database className="h-5 w-5" />}
          badge="SQL"
        >
          <CodeBlock code={HIGHTOUCH_SYNC} language="sql" filename="vip_loyalty.sql" highlight={[18, 19, 20, 21, 22, 23, 24, 25, 31, 38, 39, 40, 41, 42, 43]} />
        </SectionCard>
      </div>

      {/* Reverse ETL table */}
      <SectionCard
        title="Reverse-ETL activations (Hightouch)"
        description="Each activation has an owner, a PII classification and an SLA. Sync cadence is matched to the upstream dbt run so audiences are never stale."
        icon={<Workflow className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Audience</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Destination</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Records</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Cadence</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {REVERSE_ETL_AUDIENCES.map((a) => (
                <tr key={a.audience} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-2.5 font-medium">{a.audience}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{a.destination}</td>
                  <td className="px-4 py-2.5 font-mono text-xs tabular-nums">{a.records}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{a.cadence}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{a.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Sync settings */}
      <SectionCard
        title="Hightouch sync definition (declarative)"
        description="Every sync is defined as a YAML file in Git. PII columns are auto-masked; failures page on-call; success posts to Slack."
        icon={<RefreshCw className="h-5 w-5" />}
      >
        <CodeBlock code={HIGHTOUCH_SETTINGS} language="yaml" filename="syncs/vip_loyalty.yml" highlight={[3, 4, 12, 13, 14, 15, 22, 23, 24, 28, 29, 30, 31, 32]} />
      </SectionCard>

      {/* Operational */}
      <div className="grid md:grid-cols-3 gap-4">
        <SectionCard title="Freshness SLA" icon={<Zap className="h-5 w-5" />}>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• Transactional (Shopify, Stripe): <InlineCode>15 min</InlineCode></li>
            <li>• Marketing (Klaviyo, Meta): <InlineCode>1 hr</InlineCode></li>
            <li>• ERP / HRIS (NetSuite, Workday): <InlineCode>6 hr</InlineCode></li>
            <li>• Behavioural (Snowplow): <InlineCode>5 min</InlineCode> streaming</li>
            <li>• SLA breach → auto-backfill via Fivetran API</li>
          </ul>
        </SectionCard>
        <SectionCard title="Schema drift handling" icon={<Workflow className="h-5 w-5" />}>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• Fivetran `ALTER TABLE` events trigger schema registry PR</li>
            <li>• Bronze schema is mutable; Silver / Gold are locked</li>
            <li>• PR runs Great Expectations on new column</li>
            <li>• Approver = data_platform owner in CODEOWNERS</li>
            <li>• Old columns retained with `__deprecated` suffix for 90 days</li>
          </ul>
        </SectionCard>
        <SectionCard title="Governance" icon={<ShieldCheck className="h-5 w-5" />}>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• Every audience has owner + DPO classification</li>
            <li>• PII columns auto-masked (hash, truncate, K-anonymity)</li>
            <li>• Salesforce sync writes to a `__ht_` prefixed field set</li>
            <li>• Audit log: who approved, when, target record count</li>
            <li>• Opt-out registry synced daily from Zendesk → Hightouch</li>
          </ul>
        </SectionCard>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("orchestration")} className="text-sm text-primary hover:underline">
          → Continue to Orchestration
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("tableau")} className="text-sm text-primary hover:underline">
          → Back to Tableau
        </Link>
      </div>
    </div>
  );
}
