# Changelog

All notable changes to ClawRouter.

---

## v0.11.0 / v0.11.1 — Feb 28, 2026

### Three-Strike Escalation

Session-level repetition detection: 3 consecutive identical request hashes auto-escalate to the next tier (SIMPLE → MEDIUM → COMPLEX → REASONING). Fixes Kimi K2.5 agentic loop problem without manual model switching.

### `/imagegen` command

Generate images from chat. Calls BlockRun's image generation API with x402 micropayments.

```
/imagegen a cat wearing sunglasses
/imagegen --model dall-e-3 a futuristic city
/imagegen --model banana-pro --size 2048x2048 landscape
```

| Model                        | Shorthand     | Price                  |
| ---------------------------- | ------------- | ---------------------- |
| Google Nano Banana (default) | `nano-banana` | $0.05/image            |
| Google Nano Banana Pro       | `banana-pro`  | $0.10/image (up to 4K) |
| OpenAI DALL-E 3              | `dall-e-3`    | $0.04/image            |
| OpenAI GPT Image 1           | `gpt-image`   | $0.02/image            |
| Black Forest Flux 1.1 Pro    | `flux`        | $0.04/image            |

---

## v0.10.20 / v0.10.21 — Feb 27, 2026

- **Stop hijacking model picker** — removed allowlist injection that hid non-BlockRun models from `/model` picker
- **Silent fallback to free model** — insufficient funds now skips remaining paid models and jumps to `nvidia/gpt-oss-120b` instead of showing payment errors

---

## v0.10.19 — Feb 27, 2026

- **Anthropic array content extraction** — routing now handles `[{type:"text", text:"..."}]` content format (was extracting empty string)
- **Session startup bias fix** — never-downgrade logic: sessions can upgrade tiers but won't lock to the low-complexity startup message tier

---

## v0.10.18 — Feb 26, 2026

- **Session re-pins to fallback** — after provider failure, session updates to the actual model that responded instead of retrying the failing primary every turn

---

## v0.10.16 / v0.10.17 — Feb 26, 2026

- **`/debug` command** — type `/debug <prompt>` to see routing diagnostics (tier, model, scores, session state) with zero API cost
- **Tool-calling model filter** — requests with tool schemas skip incompatible models automatically
- **Session persistence enabled by default** — `deriveSessionId()` hashes first user message; model stays pinned 30 min without client headers
- **baselineCost fix** — hardcoded Opus 4.6 fallback pricing so savings metric always calculates correctly

---

## v0.10.12 – v0.10.15 — Feb 26, 2026

- **Tool call leaking fix** — removed `grok-code-fast-1` from all routing paths (was outputting tool invocations as plain text)
- **Systematic tool-calling guard** — `toolCalling` flag on models; incompatible models filtered from fallback chains
- **Async plugin fix** — `register()` made synchronous; OpenClaw was silently skipping initialization

---

## v0.10.9 — Feb 24, 2026

- **Agentic mode false trigger** — `agenticScore` now scores user prompt only, not system prompt. Coding assistant system prompts no longer force all requests to Sonnet.

---

## v0.10.8 — Feb 24, 2026

- **OpenClaw tool API contract** — fixed `inputSchema` → `parameters`, `execute(args)` → `execute(toolCallId, params)`, and return format

---

## v0.10.7 — Feb 24, 2026

- **Partner tool trigger reliability** — directive tool description so AI calls the tool instead of answering from memory
- **Baseline cost fix** — `BASELINE_MODEL_ID` corrected from `claude-opus-4-5` to `claude-opus-4.6`
- **Wallet corruption safety** — corrupted wallet files throw with recovery instructions instead of silently generating new wallet

---

## v0.10.5 — Feb 22, 2026

- **9-language router** — added ES, PT, KO, AR keywords across all 12 scoring dimensions (was 5 languages)

---

## v0.10.0 — Feb 21, 2026

- **Claude 4.6** — all Claude models updated to newest Sonnet 4.6 / Opus 4.6
- **7 new models** — total 41 (Gemini 3.1 Pro Preview, Gemini 2.5 Flash Lite, o1, o1-mini, gpt-4.1-nano, grok-2-vision)
- **5 pricing fixes** — 15-30% better routing from corrected model costs
- **67% cheaper ECO tier** — Flash Lite for MEDIUM/COMPLEX
