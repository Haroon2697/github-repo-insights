const CHAT_COMPLETIONS_PATH = "/v1/chat/completions";

/** Supported provider ids (order used when falling back automatically). */
const KNOWN_PROVIDER_NAMES = [
  "groq",
  "openrouter",
  "huggingface",
  "openai",
];

function buildPrompt(row) {
  const repo = row.repository || {};
  return [
    "You are a senior software architect.",
    "Analyze this GitHub repository summary and explain why it is complex or simple.",
    "Return strict JSON with keys:",
    "summary (string), complexityReasons (string[]), technologies (string[]), recommendations (string[]).",
    "",
    `Repository: ${repo.fullName || repo.name || "unknown"}`,
    `Description: ${repo.description || "N/A"}`,
    `Primary language: ${repo.language || "Unknown"}`,
    `Stars: ${repo.stars || 0}, Forks: ${repo.forks || 0}, Commits: ${repo.commitCount || 0}`,
    `Score: ${row.finalScore || 0}`,
    `Breakdown: ${JSON.stringify(row.breakdown || {})}`,
    `Tags: ${(row.tags || []).join(", ") || "none"}`,
    `Classification: ${JSON.stringify(row.classification || {})}`,
    `File signals: ${JSON.stringify(repo.fileSignals || {})}`,
  ].join("\n");
}

function parseJsonFromText(text) {
  const trimmed = String(text || "").trim();
  try {
    return JSON.parse(trimmed);
  } catch (_error) {
    return {
      summary: trimmed,
      complexityReasons: [],
      technologies: [],
      recommendations: [],
    };
  }
}

function getProviderOrder() {
  const raw =
    process.env.AI_PROVIDER_ORDER ||
    "groq,openrouter,huggingface,openai";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function providerHasConfiguredKey(name) {
  const key = (env) => String(process.env[env] || "").trim();
  switch (name) {
    case "groq":
      return Boolean(key("GROQ_API_KEY"));
    case "openrouter":
      return Boolean(key("OPENROUTER_API_KEY"));
    case "openai":
      return Boolean(key("OPENAI_API_KEY"));
    case "huggingface":
      return Boolean(key("HUGGINGFACE_API_KEY"));
    default:
      return false;
  }
}

/**
 * Order from AI_PROVIDER_ORDER, keeping only providers that have a non-empty API key.
 * If none of the requested names have keys, use KNOWN_PROVIDER_NAMES in order (only those with keys).
 */
function getEffectiveProviderOrder() {
  const requested = getProviderOrder().filter((n) =>
    KNOWN_PROVIDER_NAMES.includes(n)
  );
  const withKeys = requested.filter((n) => providerHasConfiguredKey(n));
  if (withKeys.length > 0) {
    return withKeys;
  }
  return KNOWN_PROVIDER_NAMES.filter((n) => providerHasConfiguredKey(n));
}

function hasAnyAiProvider() {
  return KNOWN_PROVIDER_NAMES.some((n) => providerHasConfiguredKey(n));
}

async function callOpenAiCompatibleChat(row, { baseUrl, apiKey, model, extraHeaders = {} }) {
  const url = `${baseUrl.replace(/\/$/, "")}${CHAT_COMPLETIONS_PATH}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "Return only valid JSON. No markdown.",
        },
        {
          role: "user",
          content: buildPrompt(row),
        },
      ],
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const message =
      payload?.error?.message || payload?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  const content = payload?.choices?.[0]?.message?.content || "{}";
  return parseJsonFromText(content);
}

async function callGroq(row) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY missing");
  const baseUrl = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const parsed = await callOpenAiCompatibleChat(row, {
    baseUrl,
    apiKey,
    model,
    extraHeaders: {},
  });
  return { parsed, model, provider: "groq" };
}

async function callOpenRouter(row) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY missing");
  const baseUrl =
    process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
  const model =
    process.env.OPENROUTER_MODEL ||
    "meta-llama/llama-3.1-8b-instruct:free";
  const parsed = await callOpenAiCompatibleChat(row, {
    baseUrl,
    apiKey,
    model,
    extraHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "http://localhost",
      "X-Title": process.env.OPENROUTER_APP_TITLE || "GitHub Intelligence Dashboard",
    },
  });
  return { parsed, model, provider: "openrouter" };
}

async function callOpenAi(row) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const parsed = await callOpenAiCompatibleChat(row, {
    baseUrl,
    apiKey,
    model,
    extraHeaders: {},
  });
  return { parsed, model, provider: "openai" };
}

/**
 * Hugging Face Inference API (legacy serverless) — not OpenAI-shaped.
 * @see https://huggingface.co/docs/huggingface.js/guides/inference
 */
async function callHuggingFace(row) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error("HUGGINGFACE_API_KEY missing");
  const model =
    process.env.HUGGINGFACE_MODEL ||
    "meta-llama/Meta-Llama-3-8B-Instruct";
  const base =
    process.env.HUGGINGFACE_INFERENCE_URL ||
    "https://api-inference.huggingface.co/models";
  const url = `${base.replace(/\/$/, "")}/${model}`;
  const prompt = [
    "Return only valid JSON. No markdown.",
    buildPrompt(row),
  ].join("\n\n");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 512,
        return_full_text: false,
      },
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const err = payload?.error ?? payload?.message ?? `HTTP ${response.status}`;
    const message =
      typeof err === "string" ? err : JSON.stringify(err);
    throw new Error(message);
  }

  let text = "";
  if (Array.isArray(payload) && payload[0]?.generated_text) {
    text = payload[0].generated_text;
  } else if (payload?.generated_text) {
    text = payload.generated_text;
  } else if (typeof payload === "string") {
    text = payload;
  } else {
    text = JSON.stringify(payload);
  }

  const parsed = parseJsonFromText(text);
  return { parsed, model, provider: "huggingface" };
}

const PROVIDERS = {
  groq: callGroq,
  openrouter: callOpenRouter,
  openai: callOpenAi,
  huggingface: callHuggingFace,
};

async function generateRepositoryInsights(row) {
  if (!hasAnyAiProvider()) {
    throw new Error(
      "No AI provider configured. Set at least one of: GROQ_API_KEY, OPENROUTER_API_KEY, OPENAI_API_KEY, HUGGINGFACE_API_KEY in backend/.env"
    );
  }

  const order = getEffectiveProviderOrder();
  if (order.length === 0) {
    throw new Error(
      "No AI provider has a configured API key after filtering empty keys."
    );
  }

  const errors = [];
  const attemptLog = [];

  for (const name of order) {
    const fn = PROVIDERS[name];
    if (!fn) {
      attemptLog.push({ provider: name, ok: false, error: "unknown provider" });
      errors.push(`${name}: unknown provider`);
      continue;
    }
    try {
      const { parsed, model, provider } = await fn(row);
      attemptLog.push({ provider: name, ok: true });
      return {
        ...parsed,
        model,
        provider,
        generatedAt: new Date().toISOString(),
        attemptLog,
        providerOrderTried: order,
      };
    } catch (err) {
      const msg = err.message || String(err);
      attemptLog.push({ provider: name, ok: false, error: msg });
      errors.push(`${name}: ${msg}`);
    }
  }

  throw new Error(
    `All AI providers failed. Tried: ${order.join(", ")}. Details: ${errors.join(" | ")}`
  );
}

module.exports = {
  generateRepositoryInsights,
  hasAnyAiProvider,
  getEffectiveProviderOrder,
};
