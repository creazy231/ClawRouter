# ClawRouter v0.10.6 – v0.10.11 — Week of Feb 23–26, 2026

**Covers:** v0.10.6, v0.10.7, v0.10.8, v0.10.9, v0.10.10, v0.10.11
**Also:** BlockRun API server-side fixes deployed alongside

---

## Highlights

- **120s provider timeout** — all 13 outbound provider calls now have a hard timeout, eliminating Cloud Run 504s
- **Routing debug headers** — see exactly which tier/model/confidence was chosen per request
- **Partner tools + wallet safety** — full OpenClaw tool integration, backup/restore on update
- **Agentic mode fix** — `blockrun/auto` no longer misroutes simple queries to Sonnet

---

## New Features

### Routing debug headers (v0.10.10)

Every response now includes `x-clawrouter-*` headers exposing routing decisions. Streaming responses get the same info as SSE comments.

```
x-clawrouter-profile: auto
x-clawrouter-tier: MEDIUM
x-clawrouter-model: xai/grok-code-fast-1
x-clawrouter-confidence: 0.85
x-clawrouter-agentic: 0.2
```

Disable with `x-clawrouter-debug: false` request header.

### Partner API proxy + cost tracking (v0.10.6)

Added `/partners` proxy endpoint for partner tool invocation. Direct model picks (e.g., `model: "anthropic/claude-sonnet-4.6"`) now track cost correctly against the baseline.

### Wallet backup/restore (v0.10.7)

`scripts/update.sh` and `scripts/reinstall.sh` now backup wallet keys before update and auto-restore if the wallet file gets wiped. Prevents funded wallet loss during upgrades.

---

## Bug Fixes

### 504 elimination: 120s provider timeout (server-side)

**Problem:** Provider calls could hang indefinitely. Cloud Run kills at 540s with a 504, burning compute and giving users zero responses. 15+ 504s observed in a 2-hour window.

**Fix:** Added 120s timeout to all 13 outbound provider calls:

- SDK clients (OpenAI, Azure, Anthropic, Gemini, DeepSeek, xAI): `timeout: 120_000, maxRetries: 0`
- Raw fetch calls (OpenAI Responses, NVIDIA, Moonshot, MiniMax, xAI Search): `withTimeout()` wrapper using AbortController

Worst-case: primary (120s) + fallback (120s) + free fallback (120s) = 360s, well under 540s limit. Existing error handler catches "timeout" and triggers fallback chain automatically.

### Model redirect: gemini-3.1-pro-preview (server-side)

**Problem:** After renaming `gemini-3.1-pro-preview` → `gemini-3.1-pro`, all older ClawRouter versions got 400 "Unknown model" on every COMPLEX-tier request (every 5 minutes per user).

**Fix:** Added `MODEL_REDIRECTS` entry on the server: `gemini-3.1-pro-preview` → `gemini-3.1-pro`. Old clients now transparently redirect.

### Agentic mode false trigger (v0.10.9)

**Problem:** `agenticScore` was computed from system prompt + user prompt combined. Coding assistant system prompts contain "edit files", "fix bugs", "deploy" — matching 3+ agentic keywords on every request, forcing agentic mode and routing all queries to `claude-sonnet-4.6`.

**Fix:** `agenticScore` now scores user prompt only. System prompt describes assistant behavior, not user intent.

### x402 payment verification (v0.10.9)

- Raised `estimateAmount` minimum from 100 to 1000 micros to match CDP Facilitator's enforced minimum
- Added payment/model error patterns to `PROVIDER_ERROR_PATTERNS` so failures trigger fallback
- Added `moonshot/kimi-k2.5` aliases for model resolution

### OpenClaw partner tool API contract (v0.10.8)

Three mismatches fixed:

1. `inputSchema` → `parameters` (OpenClaw expects `parameters` key)
2. `execute(args)` → `execute(toolCallId, params)` (first arg is tool call ID)
3. Return `{ content: [{type:'text',text:'...'}] }` instead of raw JSON

### Partner tool trigger reliability (v0.10.7)

Tool description changed from passive ("Look up Twitter/X user profiles") to directive ("ALWAYS use this tool to look up real-time Twitter/X user profiles"). AI now consistently calls the tool instead of answering from memory.

### Baseline cost calculation (v0.10.7)

`BASELINE_MODEL_ID` was `"anthropic/claude-opus-4-5"` (old ID) — pricing lookup returned `undefined`, making savings always 0%. Fixed to `"anthropic/claude-opus-4.6"`.

### Wallet corruption safety (v0.10.7)

Corrupted wallet files now throw with recovery instructions instead of silently generating a new wallet (which would abandon a funded address).

---

## Server-Side Fixes (BlockRun API, deployed Feb 26)

| Fix                                                    | Commit    |
| ------------------------------------------------------ | --------- |
| 120s provider timeout on all 13 outbound calls         | `3fc6429` |
| `gemini-3.1-pro-preview` → `gemini-3.1-pro` redirect   | `3fc6429` |
| Rename gemini-3.1-pro-preview in model registry        | `2535771` |
| Gemini message ordering constraints for tool calls     | `fcc2e81` |
| Hyphen-format Anthropic model redirects                | `dbea819` |
| Per-source pricing in x402 search discovery            | `6877503` |
| AttentionVC nested response unwrap                     | `dabe26c` |
| Double-filter orphaned tool messages after role filter | `fedc10f` |
| Moonshot role filter + empty tool_call_id guard        | `b96cc3b` |

---

## Version History

| Version  | Date   | Key Change                        |
| -------- | ------ | --------------------------------- |
| v0.10.11 | Feb 25 | Gemini 3.1 model rename           |
| v0.10.10 | Feb 25 | Routing debug headers             |
| v0.10.9  | Feb 24 | Agentic mode false trigger fix    |
| v0.10.8  | Feb 24 | OpenClaw tool API contract fix    |
| v0.10.7  | Feb 24 | Partner tools + wallet safety     |
| v0.10.6  | Feb 23 | Partner API proxy + cost tracking |
