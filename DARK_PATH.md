# Dark path — when GitHub Actions is locked

Use this when Copilot billing (or any GitHub billing error) freezes Actions.
Same keys. Same twins. **No Actions, no Copilot, no Codex cloud, no `gh workflow`.**

GitHub can still hold the code. It does not run the job.

## Setup once (laptop or DigitalOcean)

```bash
git clone https://github.com/midnghtsapphire/revvel-twin-run.git
cd revvel-twin-run
cp .env.example .env
```

Put the **same** keys you already have in `.env` (not GitHub secrets):

```
OPENROUTER_API_KEY=...
XAI_API_KEY=...
```

## Run a WR

Drop a markdown file in `inbox/` with the WR flags on their own lines:

```
spend: cheap
uncensored: off
pair: fable-opus-grok

What should we ship while Actions is dark?
```

Then:

```bash
node src/dark-run.mjs
```

- Merge lands in `out/`
- Source file moves to `inbox/done/`
- Failures move to `inbox/failed/` plus a note in `out/`

One-shot without the inbox:

```bash
node src/run.mjs --prompt-file wr.example.md --out out/manual.md
```

Keep watching a folder (droplet / cron substitute):

```bash
node src/dark-run.mjs --watch --every 30000
```

Cron every 15 minutes:

```
*/15 * * * * cd /path/to/revvel-twin-run && /usr/bin/node src/dark-run.mjs >> out/dark.log 2>&1
```

## What this does not do

- Does not start GitHub Actions
- Does not assign Copilot or Codex
- Does not post issue comments
- Does not spend GitHub-hosted minutes

Paste `out/*.md` into the WR yourself, or commit it, when GitHub is usable again.

## If OpenRouter 402s even with credits

The dashboard balance is not the key. Rotate the key at [openrouter.ai/keys](https://openrouter.ai/keys), put the new value in `.env`, rerun. Do not wait for Actions.
