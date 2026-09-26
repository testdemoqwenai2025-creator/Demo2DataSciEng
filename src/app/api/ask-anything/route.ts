import { NextResponse } from "server/runtime";
import ZAI from "z-ai-web-dev-sdk";

/**
 * POST /api/ask-anything
 *
 * General-purpose Q&A endpoint for the AskMeAnything widget (and other
 * platform features that want a real LLM response in dev mode).
 *
 * Body: { question: string }
 * Response: { answer: string, inPlatformContext: boolean }
 *
 * The system prompt primes the LLM with the platform's content so it can
 * answer questions like "what does SVD do on DNA?" with reference to the
 * platform's elegant-code cards and living-equation pages.
 *
 * Static-build note: Next.js `output: 'export'` does NOT support API
 * routes. The deploy workflow moves src/app/api/ out before the static
 * build, then restores it. On GitHub Pages, this route 404s and the
 * AskMeAnything widget falls back to its smart-search + external AI
 * platform links (Gemini, Grok, Qwen AI, MiniMax, ChatGPT, Claude,
 * Perplexity).
 *
 * In dev mode (bun run dev), this route works and gives a real LLM
 * response powered by z-ai-web-dev-sdk.
 */

interface AskAnythingRequest {
  question: string;
  /** Optional conversation history for multi-turn context. */
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

interface AskAnythingResponse {
  answer: string;
  model: string;
  inPlatformContext: boolean;
}

const SYSTEM_PROMPT = `You are the AI expert for the ModernDataSciEng Platform — a static reference site at https://testdemoqwenai2025-creator.github.io/Demo2DataSciEng/.

The platform's core thesis: the SAME math equation bridges multiple sciences (genomics, fintech, maritime, audio, physics, etc.). It hosts:

  - 20 elegant-code cards (/elegant-code) — each shows ONE math equation bridging 3+ sciences, with code in 5 languages (Scala, Rust, Go, Elixir, Zig). 10 of these cards have "Run it live" deep-links to interactive Pyodide demo pages.
  - 10 living-equation pages (/living-svd, /living-attention, /living-fft, /living-poisson, /living-entropy, /living-black-scholes, /living-haversine, /living-kalman, /living-monte-carlo, /living-gbm) — each has 3 tabs: Math derivation, Live Pyodide demo with slider + chart, Production code.
  - /connections — interactive D3 force-directed graph of 20 cards + 30 cousin edges.
  - /resources — every real dataset, paper, and library cited across the platform + a skill graph + talent search + sector index.
  - /global-shipping — maritime analytics hub (Haversine, Kalman, Markov, etc.).
  - 60 outcome tiles across 20 cards — each tile shows the analytics output when the equation lands on a different science's data, with skill + talent badges naming what each sector rewards.

The 20 elegant-code cards (equation name → sciences bridged):
  1. SVD → genomics, audio, finance
  2. Attention → protein folding, NLP
  3. Poisson → sequencing, networks, decay
  4. FFT → mass spec, audio, cryo-EM
  5. Verlet → MD, games, orbits
  6. Navier-Stokes → weather, blood, turbulence
  7. Gradient Descent → ML, evolution, thermodynamics
  8. Bayes → genetics, spam, quantum
  9. Euler → ODEs, games, finance
  10. Entropy → information, thermodynamics, genetics
  11. Black-Scholes → fintech, maritime, genetics
  12. Haversine → maritime, aviation, astronomy
  13. Kelly → fintech, genetics, RL
  14. Markov → genetics, fintech, maritime
  15. VaR → fintech, maritime, climate
  16. PageRank → fintech, maritime, genetics
  17. Kalman → maritime, aviation, genetics
  18. Monte Carlo → fintech, maritime, genetics
  19. GBM → fintech, maritime, genetics
  20. Lloyd's k-means → maritime, genetics, ML

Answer questions about:
  - The platform's content (e.g., "what does SVD do on DNA?" → mention 1000-Genomes chr-22 PCA, Out-of-Africa emergence, link to /living-svd).
  - The mathematical equations themselves (e.g., "how does softmax(QK^T/√d_k) work?" → explain scaled dot-product attention, mention Vaswani 2017, link to /living-attention).
  - The cross-disciplinary connections (e.g., "which equations bridge maritime and fintech?" → Black-Scholes, Haversine for trade routes, Markov for port states, VaR for Solvency II, PageRank for chokepoints).
  - The skills/talents each sector rewards (e.g., "what does a marine underwriter read in option premiums?" → freight-rate volatility; link to /elegant-code#card-10).
  - The datasets cited (e.g., "what's in gnomAD?" → 80M variants × 800K exomes, BRCA1 has 200 missense variants; link to /living-entropy).

Be concise. Maximum 200 words. Reference the platform's pages by URL path (e.g., "/living-svd", "/elegant-code#card-10", "/resources") when relevant. If the question is outside the platform's scope, say so and suggest one of the platform's 20 cards as a starting point.

Format: plain text with optional markdown (links as [text](url) — but the platform's URLs are bare paths like /living-svd, not full URLs).`;

export async function POST(req: Request) {
  let body: AskAnythingRequest;
  try {
    body = (await req.json()) as AskAnythingRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Expected {question: string}." },
      { status: 400 }
    );
  }

  const { question, history } = body;
  if (!question || question.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing 'question' field." },
      { status: 422 }
    );
  }

  try {
    const zai = await ZAI.create();

    // Detect page references in the question (e.g., "what's on /living-svd?").
    // If found, fetch that page's HTML, strip tags, and include the content
    // in the LLM context so it can answer with specifics.
    let pageContext = "";
    const pageRefMatches = question.match(/\/(living-\w+|elegant-code|connections|resources|global-shipping|computational-\w+|bioinformatics\w*|systems-biology|fintech|space-science|monte-carlo|numpy-scipy|transformer\w*)/gi);
    if (pageRefMatches) {
      const uniquePages = Array.from(new Set(pageRefMatches.map(p => p.toLowerCase())));
      for (const pagePath of uniquePages.slice(0, 3)) { // max 3 pages to keep context manageable
        try {
          // In dev mode, fetch from localhost:3000 (the dev server).
          // The dev server serves all routes at /pagePath.
          const pageUrl = `http://localhost:3000${pagePath}`;
          const pageRes = await fetch(pageUrl, { signal: AbortSignal.timeout(5000) });
          if (pageRes.ok) {
            const html = await pageRes.text();
            // Strip HTML tags to get plain text (simplified — keeps text content).
            const text = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 3000); // truncate to 3000 chars for context
            if (text.length > 100) {
              pageContext += `\n\n--- Content from ${pagePath} ---\n${text}\n--- End of ${pagePath} ---\n`;
            }
          }
        } catch {
          // Page fetch failed — skip silently (best-effort).
        }
      }
    }

    // Build the message list: system prompt + optional page context + optional history + the new question.
    const messages: Array<{ role: string; content: string }> = [
      { role: "assistant", content: SYSTEM_PROMPT },
    ];

    // If we fetched page content, prepend it to the user's question.
    const userContent = pageContext
      ? `${question}\n\n[The following content was fetched from the platform's pages to help you answer with specifics:]\n${pageContext}`
      : question;

    if (history && Array.isArray(history)) {
      for (const msg of history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: "user", content: userContent });

    const completion = await zai.chat.completions.create({
      messages: messages as any,
      thinking: { type: "disabled" },
    });

    const answer = completion.choices[0]?.message?.content ?? "(no response)";

    const response: AskAnythingResponse = {
      answer,
      model: pageContext
        ? "z-ai-web-dev-sdk (LLM + fetched page content, dev mode)"
        : "z-ai-web-dev-sdk (LLM via /api/ask-anything, dev mode)",
      inPlatformContext: true,
    };
    return NextResponse.json(response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: `LLM call failed: ${msg}`,
        answer: null,
        model: null,
        inPlatformContext: false,
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
