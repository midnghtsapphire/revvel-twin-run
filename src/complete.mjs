const FETCH_MS = 50_000;

function endpoint(provider) {
  if (provider === "openrouter") {
    return {
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: process.env.OPENROUTER_API_KEY,
    };
  }
  return {
    url: "https://api.x.ai/v1/chat/completions",
    key: process.env.XAI_API_KEY,
  };
}

export async function complete({ system, user, temperature, maxTokens, model, provider }) {
  const started = Date.now();
  const { url, key } = endpoint(provider);
  if (!key) {
    const missing =
      provider === "openrouter"
        ? "OpenRouter is not wired. Add OPENROUTER_API_KEY as a repo secret."
        : "xAI is not wired. Add XAI_API_KEY as a repo secret.";
    return { ok: false, error: missing, ms: 0, model };
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  };
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://github.com/midnghtsapphire/revvel-twin-run";
    headers["X-Title"] = "Revvel Twin Run";
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(FETCH_MS),
    });
    const ms = Date.now() - started;
    if (!res.ok) {
      if (res.status === 402) {
        return {
          ok: false,
          error:
            "Provider returned 402. Credits on the dashboard does not always mean this key can spend — check the key, the model, and auto/denylist.",
          ms,
          model,
        };
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: "The AI key was refused.", ms, model };
      }
      if (res.status === 429) {
        return { ok: false, error: "Rate limited. Wait and run again.", ms, model };
      }
      return { ok: false, error: `${provider} error ${res.status}`, ms, model };
    }
    const body = await res.json();
    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) return { ok: false, error: "Empty response from the model", ms, model };
    return { ok: true, text, ms, model };
  } catch (err) {
    const ms = Date.now() - started;
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      return { ok: false, error: "Lane timed out.", ms, model };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Lane failed", ms, model };
  }
}
