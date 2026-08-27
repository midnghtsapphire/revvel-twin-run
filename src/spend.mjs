import { isPairId } from "./twins.mjs";

export const PREMIUM_MODEL = "grok-4.5";
export const CHEAP_XAI_MODEL = "grok-build-0.1";

const DEEPSEEK_R1 = "deepseek/deepseek-r1";
const DEEPSEEK_CHAT = "deepseek/deepseek-chat";
const LLAMA_FREE = "meta-llama/llama-3.3-70b-instruct:free";
const HERMES = "nousresearch/hermes-3-llama-3.1-70b";

export function liveProviders() {
  return {
    xai: Boolean(process.env.XAI_API_KEY),
    openrouter: Boolean(process.env.OPENROUTER_API_KEY),
  };
}

export function pickSeat(kind, spend, uncensored, live) {
  if (spend !== "cheap") {
    return { model: PREMIUM_MODEL, provider: "xai", label: "Grok 4.5", cost: "premium" };
  }
  if (live.openrouter) {
    if (kind === "fable") {
      return { model: DEEPSEEK_R1, provider: "openrouter", label: "DeepSeek R1", cost: "cheap" };
    }
    if (kind === "opus") {
      if (uncensored) {
        return { model: HERMES, provider: "openrouter", label: "Hermes 3", cost: "cheap" };
      }
      return { model: LLAMA_FREE, provider: "openrouter", label: "Llama 3.3 free", cost: "free" };
    }
  }
  return { model: CHEAP_XAI_MODEL, provider: "xai", label: "Grok Build", cost: "cheap" };
}

export function pickMergeSeat(spend, uncensored, live) {
  if (spend !== "cheap") {
    return { model: PREMIUM_MODEL, provider: "xai", label: "Grok 4.5", cost: "premium" };
  }
  if (live.openrouter) {
    return {
      model: uncensored ? DEEPSEEK_R1 : DEEPSEEK_CHAT,
      provider: "openrouter",
      label: uncensored ? "DeepSeek R1" : "DeepSeek Chat",
      cost: "cheap",
    };
  }
  return { model: CHEAP_XAI_MODEL, provider: "xai", label: "Grok Build", cost: "cheap" };
}

function truthy(value) {
  return /^(on|yes|true|1)$/i.test(value);
}

export function parseWr(text, fallback) {
  const next = { ...fallback };
  const spend =
    /(?:^|\n)\s*spend:\s*(cheap|premium)\b/i.exec(text) ??
    /(?:^|\n)\s*CHEAP\s*=\s*(on|off|yes|no|true|false|1|0)\b/i.exec(text);
  if (spend) {
    const raw = (spend[1] ?? "").toLowerCase();
    if (raw === "cheap" || raw === "premium") next.spend = raw;
    else next.spend = truthy(raw) ? "cheap" : "premium";
  }
  const unc =
    /(?:^|\n)\s*uncensored:\s*(on|off|yes|no|true|false|1|0)\b/i.exec(text) ??
    /(?:^|\n)\s*UNCENSORED\s*=\s*(on|off|yes|no|true|false|1|0)\b/i.exec(text);
  if (unc?.[1]) next.uncensored = truthy(unc[1]);
  const pair = /(?:^|\n)\s*pair:\s*([a-z0-9-]+)\b/i.exec(text);
  if (pair?.[1] && isPairId(pair[1])) next.pair = pair[1];
  return next;
}

export function stripWr(text) {
  return text
    .split("\n")
    .filter(
      (line) =>
        !/^\s*(spend:|uncensored:|pair:|CHEAP\s*=|UNCENSORED\s*=)/i.test(line),
    )
    .join("\n")
    .trim();
}

export function cheapSystem(uncensored) {
  const base = `
You are the cheap seat. Stay effective. Do not shrink the answer. Do not pad. Do not refuse ordinary technical work.`;
  if (!uncensored) return base;
  return `${base}
Skip corporate refusal theater and moral padding. Answer the actual question. Refuse only clearly criminal requests.`;
}

export function hasWr(text) {
  return /(?:^|\n)\s*(spend:|CHEAP\s*=)/i.test(text ?? "");
}
