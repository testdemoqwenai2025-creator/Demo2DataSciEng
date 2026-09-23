import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

/**
 * POST /api/agent-triage
 *
 * Agentic DQ triage endpoint (LangGraph-style single-step agent).
 * Takes an anomaly description + lineage context, calls the LLM with
 * a system prompt that constrains it to investigate + propose a root
 * cause + suggest a fix. Returns the structured hypothesis.
 *
 * Per AGENTIC_WORKFLOW.md design — but collapsed into a single LLM call
 * for the synthetic reference. In production this would be a multi-node
 * LangGraph with read_lineage / sample_rows / classify / auto_fix steps.
 */

interface TriageRequest {
  signal: string;
  layer: string;
  severity: "info" | "warning" | "critical";
  detail: string;
  ts: string;
}

interface TriageResponse {
  root_cause: string;
  confidence: "low" | "medium" | "high";
  suggested_action: string;
  known_pattern: boolean;
  steps_taken: string[];
  raw_response: string;
}

const SYSTEM_PROMPT = `You are an observability agent for the ModernDataSciEng Platform — a synthetic reference data platform with Bronze/Silver/Gold Medallion layers, dbt + PySpark transformations, Airflow + Dagster orchestration, Snowflake serving with RLS, Unity Catalogue governance, and Monte Carlo + OpenLineage observability.

When given an anomaly alert, you must:
1. PROPOSE A ROOT CAUSE — based on the signal type, layer, and detail. Be specific to the platform components.
2. CLASSIFY CONFIDENCE — "high" if this matches a known pattern (schema drift, freshness breach, DQ failure, volume anomaly), "medium" if plausibly diagnostic, "low" if speculative.
3. SUGGEST AN ACTION — concrete next step (e.g. "open schema-registry PR", "trigger Fivetran backfill", "quarantine row + page on-call", "investigate query plan").
4. FLAG KNOWN PATTERN — true if the anomaly is one the platform has standard handling for (per the AGENTIC_WORKFLOW.md agent inventory).
5. LIST STEPS TAKEN — sequence of investigation steps you would have performed (read lineage, sample rows, check recent commits, look up ADRs).

Format your response as STRICT JSON with exactly these keys:
{
  "root_cause": string,
  "confidence": "low" | "medium" | "high",
  "suggested_action": string,
  "known_pattern": boolean,
  "steps_taken": string[]
}

Be concise. Maximum 80 words across all fields combined. No prose outside the JSON. The platform never writes without human approval — your role is to investigate and propose, never to act.`;

export async function POST(req: Request) {
  let body: TriageRequest;
  try {
    body = (await req.json()) as TriageRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Expected {signal, layer, severity, detail, ts}." },
      { status: 400 }
    );
  }

  const { signal, layer, severity, detail, ts } = body;
  if (!signal || !layer || !severity || !detail) {
    return NextResponse.json(
      { error: "Missing required fields: signal, layer, severity, detail, ts." },
      { status: 422 }
    );
  }

  // Construct the agent's task
  const userPrompt = `Anomaly received at ${ts}.

Signal: ${signal}
Layer: ${layer}
Severity: ${severity}
Detail: ${detail}

Investigate and respond with the JSON structure specified.`;

  try {
    // Call the LLM via the z-ai-web-dev-sdk
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
      temperature: 0.3,
      max_tokens: 400,
    });

    const rawResponse = completion?.choices?.[0]?.message?.content ?? "";

    // Parse the JSON response (LLM may wrap in ```json fences — strip them)
    let parsed: TriageResponse | null = null;
    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]) as TriageResponse;
      }
    } catch (parseErr) {
      console.warn("[agent-triage] JSON parse failed:", parseErr);
    }

    if (!parsed) {
      // Fall back to a structured stub if LLM didn't return valid JSON
      parsed = {
        root_cause: rawResponse.slice(0, 200) || "LLM returned no usable content.",
        confidence: "low",
        suggested_action: "Manual review required — agent response did not parse.",
        known_pattern: false,
        steps_taken: ["llm_call", "json_parse_failed"],
        raw_response: rawResponse,
      };
    } else {
      parsed.raw_response = rawResponse;
    }

    return NextResponse.json({
      ...parsed,
      _meta: {
        model: completion?.model ?? "unknown",
        tokens: completion?.usage?.total_tokens ?? 0,
        latency_ms: Date.now() - Date.now(), // placeholder; SDK doesn't expose timing
        agent_id: "dq-triage-v1",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[agent-triage] LLM call failed:", message);
    // Graceful degradation — return a deterministic stub so the dashboard keeps working
    return NextResponse.json(
      {
        root_cause: "Agent unavailable — LLM call failed. See AGENTIC_WORKFLOW.md for the full agent design.",
        confidence: "low",
        suggested_action: "Retry the request; if it persists, investigate the /api/agent-triage route logs.",
        known_pattern: false,
        steps_taken: ["llm_call_failed"],
        raw_response: "",
        _meta: {
          agent_id: "dq-triage-v1",
          error: message,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 503 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/agent-triage",
    method: "POST",
    description: "Agentic DQ triage — investigates an anomaly and returns a root-cause hypothesis.",
    request_schema: {
      signal: "string",
      layer: "Bronze | Silver | Gold",
      severity: "info | warning | critical",
      detail: "string",
      ts: "ISO timestamp string",
    },
    response_schema: {
      root_cause: "string",
      confidence: "low | medium | high",
      suggested_action: "string",
      known_pattern: "boolean",
      steps_taken: "string[]",
      raw_response: "string (full LLM output)",
    },
    design_doc: "AGENTIC_WORKFLOW.md (see agent #1: DQ Triage Agent)",
    guardrails: [
      "Never writes to production without human approval",
      "Read-only service user (SELECT on Bronze/Silver/Gold)",
      "Audit log to Datadog + immutable S3 bucket",
      "Daily LLM-token cost cap enforced",
      "PII never leaves the warehouse — Unity Catalogue masks columns",
    ],
  });
}
