# Revvel Twin Run


<!-- AUTO-PACKAGE-BADGES:START -->

<!-- AUTO-PACKAGE-BADGES:END -->
Fable × Opus × Grok on **your** GitHub. Same runner as the workbench: two seats are twins, three is a trio, then a merge.

Cheap is a spend switch. Set it in the UI, or in a WR:

```
spend: cheap
uncensored: off
pair: fable-opus-grok
```

`CHEAP=1` works too.

## This is the GitHub method

The Grok preview cannot see your OpenRouter key. This repo can.

| Spend | OpenRouter wired | Only xAI wired |
|---|---|---|
| **Premium** | Grok 4.5 | Grok 4.5 |
| **Cheap** | DeepSeek R1 + Llama 3.3 free + Grok Build | Grok Build on every seat |
| **Cheap + uncensored** | DeepSeek R1 + Hermes 3 + Grok Build | Grok Build |

Sonnet and `openrouter/auto` stay denylisted. Do not put them in the roster.

## Secrets (required or cheap stays dark)

Repo → Settings → Secrets and variables → Actions:

1. `OPENROUTER_API_KEY` — turns Cheap into DeepSeek / free / Hermes
2. `XAI_API_KEY` — Premium, and Cheap fallback if OpenRouter is down

Credits on an OpenRouter dashboard do not count until this secret is set. A 402 from OpenRouter means the key cannot spend even if the dashboard shows credits — check the key, the model, and auto.

## Run

**Actions → Twin Run → Run workflow** — paste a prompt. Optional WR lines inside the prompt override the dropdowns.

**Issue, comment, or PR body** that contains `spend:` or `CHEAP=` fires the same job and comments the merge back.

**Other repos:**

```yaml
jobs:
  twins:
    uses: midnghtsapphire/revvel-twin-run/.github/workflows/twin-run.yml@main
    with:
      prompt: |
        spend: cheap
        pair: fable-opus-grok
        Should patches stay on Opus twins?
    secrets:
      OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
      XAI_API_KEY: ${{ secrets.XAI_API_KEY }}
```

**Local:**

```bash
cp .env.example .env   # fill keys
set -a && source .env && set +a
node src/run.mjs --prompt-file wr.example.md
```

## Pairs

- `fable-opus-grok` — usually
- `fable-opus` — twins
- `fable-fable`
- `opus-opus`

Freedom Angel Corps / Audrey Evans.
