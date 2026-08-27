#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { complete } from "./complete.mjs";
import {
  cheapSystem,
  hasWr,
  liveProviders,
  parseWr,
  pickMergeSeat,
  pickSeat,
  stripWr,
} from "./spend.mjs";
import { MERGE_SYSTEM, PAIRS, isPairId } from "./twins.mjs";

const LANE_MAX = 900;
const MERGE_MAX = 800;

function arg(name, fallback = "") {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function flag(name) {
  return process.argv.includes(`--${name}`);
}

function loadPrompt() {
  const file = arg("prompt-file");
  if (file) return readFileSync(file, "utf8");
  const fromArg = arg("prompt").trim();
  if (fromArg) return fromArg;
  const fromEnv = (process.env.PROMPT || "").trim();
  if (fromEnv) return fromEnv;
  const issue = (process.env.ISSUE_BODY || "").trim();
  if (issue) return issue;
  if (!process.stdin.isTTY) return readFileSync(0, "utf8");
  return "";
}

function wrFallback() {
  const spendRaw = (arg("spend") || process.env.SPEND || "cheap").toLowerCase();
  const uncRaw = (arg("uncensored") || process.env.UNCENSORED || "off").toLowerCase();
  const pairRaw = arg("pair") || process.env.PAIR || "fable-opus-grok";
  return {
    spend: spendRaw === "premium" ? "premium" : "cheap",
    uncensored: /^(on|yes|true|1)$/i.test(uncRaw),
    pair: isPairId(pairRaw) ? pairRaw : "fable-opus-grok",
  };
}

function render(result) {
  const lines = [
    `# Twin Run — ${result.pair.label}`,
    "",
    `spend: **${result.spend}** · uncensored: **${result.uncensored ? "on" : "off"}** · ${(result.totalMs / 1000).toFixed(1)}s`,
    "",
    `Providers: xAI ${result.providers.xai ? "on" : "off"} · OpenRouter ${result.providers.openrouter ? "on" : "off"}`,
    "",
  ];
  result.lanes.forEach((lane, i) => {
    const spec = result.pair.lanes[i];
    const seat = result.seats[i];
    lines.push(`## ${spec.name} (${seat.label} · \`${lane.model}\`)`);
    lines.push("");
    lines.push(lane.ok ? lane.text : `**Error:** ${lane.error}`);
    lines.push("");
  });
  lines.push("## Merge");
  lines.push("");
  if (!result.merge) lines.push("Merge skipped — a lane failed.");
  else if (result.merge.ok) lines.push(result.merge.text);
  else lines.push(`**Error:** ${result.merge.error}`);
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const raw = loadPrompt().trim();
  if (!raw) {
    console.error("No prompt. Pass --prompt, --prompt-file, stdin, or ISSUE_BODY.");
    process.exit(2);
  }

  const fallback = wrFallback();
  const wr = parseWr(raw, fallback);
  const prompt = stripWr(raw) || raw;
  const pair = PAIRS[wr.pair];
  const providers = liveProviders();
  const extra = wr.spend === "cheap" ? cheapSystem(wr.uncensored) : "";
  const seats = pair.lanes.map((lane) =>
    pickSeat(lane.kind, wr.spend, wr.uncensored, providers),
  );

  if (flag("require-wr") && !hasWr(raw) && !arg("spend") && !process.env.SPEND) {
    console.error("No WR flags found. Add spend: cheap (or premium) and retry.");
    process.exit(2);
  }

  if (wr.spend === "cheap" && !providers.openrouter && !providers.xai) {
    console.error("Cheap needs OPENROUTER_API_KEY or XAI_API_KEY.");
    process.exit(2);
  }
  if (wr.spend === "premium" && !providers.xai) {
    console.error("Premium needs XAI_API_KEY.");
    process.exit(2);
  }

  const started = Date.now();
  const lanes = await Promise.all(
    pair.lanes.map((lane, i) =>
      complete({
        system: `${lane.system}${extra}`,
        user: prompt,
        temperature: lane.temperature,
        maxTokens: LANE_MAX,
        model: seats[i].model,
        provider: seats[i].provider,
      }),
    ),
  );

  let merge = null;
  if (lanes.every((lane) => lane.ok)) {
    const mergeSeat = pickMergeSeat(wr.spend, wr.uncensored, providers);
    const bodies = pair.lanes
      .map((lane, i) => `\n--- ${lane.name} (${lanes[i].model}) ---\n${lanes[i].text}`)
      .join("\n");
    merge = await complete({
      system: `${MERGE_SYSTEM}${extra}`,
      user: [`PAIR: ${pair.label}`, `SPEND: ${wr.spend}`, `PROMPT:\n${prompt}`, bodies].join("\n"),
      temperature: 0.2,
      maxTokens: MERGE_MAX,
      model: mergeSeat.model,
      provider: mergeSeat.provider,
    });
  }

  const result = {
    pair,
    spend: wr.spend,
    uncensored: wr.uncensored,
    providers,
    seats,
    lanes,
    merge,
    totalMs: Date.now() - started,
  };
  const markdown = render(result);
  const out = arg("out");
  if (out) writeFileSync(out, markdown);
  if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, markdown, { flag: "a" });
  }
  process.stdout.write(markdown);
  if (lanes.some((lane) => !lane.ok) || (merge && !merge.ok)) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
