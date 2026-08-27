#!/usr/bin/env node
/**
 * Dark path: same twins, no GitHub Actions, no Copilot, no Codex cloud.
 * Drop WR files in inbox/. Results land in out/.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const RUNNER = join(ROOT, "src", "run.mjs");

function loadDotenv() {
  const path = join(ROOT, ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function arg(name, fallback = "") {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function flag(name) {
  return process.argv.includes(`--${name}`);
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function inboxFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => /\.(md|txt)$/i.test(name) && !/^readme\./i.test(name))
    .map((name) => join(dir, name))
    .sort();
}

function runOne(file, outFile) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [RUNNER, "--prompt-file", file, "--out", outFile], {
      cwd: ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => {
      resolvePromise({ code: code ?? 1, stderr: stderr.trim() });
    });
  });
}

async function processInbox({ inbox, out, done, failed }) {
  mkdirSync(out, { recursive: true });
  mkdirSync(done, { recursive: true });
  mkdirSync(failed, { recursive: true });

  const files = inboxFiles(inbox);
  if (files.length === 0) {
    console.log(`Dark path idle — no WR files in ${inbox}`);
    return 0;
  }

  let failures = 0;
  for (const file of files) {
    const slug = basename(file).replace(/\.(md|txt)$/i, "");
    const outFile = join(out, `${stamp()}-${slug}.md`);
    console.log(`Dark run: ${basename(file)} → ${basename(outFile)}`);
    const { code, stderr } = await runOne(file, outFile);
    if (code === 0) {
      renameSync(file, join(done, basename(file)));
      console.log(`ok ${basename(outFile)}`);
      continue;
    }
    failures += 1;
    const note = `\n\n---\nDark path exit ${code}${stderr ? `\n\n${stderr}` : ""}\n`;
    if (existsSync(outFile)) writeFileSync(outFile, note, { flag: "a" });
    else writeFileSync(outFile, `# Failed ${slug}\n${note}`);
    renameSync(file, join(failed, basename(file)));
    console.error(`fail ${basename(file)} (exit ${code})`);
  }
  return failures;
}

async function main() {
  loadDotenv();
  const inbox = resolve(arg("inbox") || process.env.DARK_INBOX || join(ROOT, "inbox"));
  const out = resolve(arg("out-dir") || process.env.DARK_OUT || join(ROOT, "out"));
  const done = join(inbox, "done");
  const failed = join(inbox, "failed");
  const watch = flag("watch");
  const everyMs = Number(arg("every") || process.env.DARK_EVERY_MS || 30000);

  if (!process.env.OPENROUTER_API_KEY && !process.env.XAI_API_KEY) {
    console.error("Dark path needs OPENROUTER_API_KEY or XAI_API_KEY in .env — not GitHub secrets.");
    process.exit(2);
  }

  const once = () => processInbox({ inbox, out, done, failed });
  let n = await once();
  if (!watch) process.exit(n ? 1 : 0);

  console.log(`Watching ${inbox} every ${everyMs}ms. Ctrl-C to stop.`);
  setInterval(() => {
    once().catch((err) => console.error(err instanceof Error ? err.message : err));
  }, everyMs);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
