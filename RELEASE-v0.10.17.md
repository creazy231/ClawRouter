# ClawRouter v0.10.12 – v0.10.17 — Week of Feb 26, 2026

**Covers:** v0.10.12, v0.10.13, v0.10.14, v0.10.15, v0.10.17

---

## Highlights

- **Model-jumping fix** — session persistence now enabled by default; model stays pinned for 30 min without any client-side header
- **Tool call leaking fix** — `grok-code-fast-1` removed from all routing paths; was outputting tool invocations as plain text JSON
- **Systematic tool-calling guard** — models now flagged for tool call support; incompatible models filtered from fallback chains when request has tools
- **Async plugin fix** — `register()` made synchronous; OpenClaw was silently skipping all plugin initialization

---

## Bug Fixes

### baselineCost always $0 — savings metric broken (v0.10.17)

**Problem:** ~66% of ClawRouter usage log entries showed `baselineCost: 0` and `savings: 0%`. When the baseline model (`anthropic/claude-opus-4.6`) wasn't found in the dynamic pricing map, the fallback was `?? 0` — silently zeroing out the savings calculation.

**Fix:** Added hardcoded fallback pricing constants (`$5.00/$25.00 per 1M tokens`) matching Claude Opus 4.6 rates. When the baseline model is missing from the pricing map, the fallback ensures savings always calculates correctly.

---

### Model keeps jumping back to gemini-flash (v0.10.17)

**Problem:** Every message in a conversation was routed from scratch. Primary model hits rate limit → falls back to gemini-flash. Next message starts fresh → falls back again. Setting a primary in the dashboard had no effect mid-conversation.

**Root causes:**

1. `SessionStore` had `enabled: false` by default — pinning never activated
2. `getSessionId()` only read the `x-session-id` header — OpenClaw sends no such header, so session ID was always `undefined`

**Fix:**

- `DEFAULT_SESSION_CONFIG.enabled`: `false` → `true`
- Added `deriveSessionId()`: stable 8-char hex from SHA-256 of first user message — same conversation opener = same session anchor across all turns
- `proxy.ts`: `getSessionId(headers) ?? deriveSessionId(parsedMessages)`

Model selection is now pinned for 30 minutes per conversation with no client-side changes required.

---

### Tool invocations leaking as plain text JSON (v0.10.14)

**Problem:** `xai/grok-code-fast-1` does not support OpenAI-compatible structured function calls. When routed a request with tools, it output the tool invocation as raw JSON text — visually appearing as "talking to itself" in the chat.

**Fix:** Removed `grok-code-fast-1` from all routing paths:

- `tiers.MEDIUM.primary`: `grok-code-fast-1` → `moonshot/kimi-k2.5`
- `agenticTiers.MEDIUM.primary`: `grok-code-fast-1` → `moonshot/kimi-k2.5`
- `premiumTiers.SIMPLE.fallback`: `grok-code-fast-1` → `deepseek/deepseek-chat`

---

### Systematic tool-calling capability guard (v0.10.15)

**Problem:** No mechanism to prevent future routing of tool-bearing requests to models that don't support OpenAI function call format.

**Fix:**

- Added `toolCalling?: boolean` flag to `BlockRunModel` type in `models.ts`
- All OpenAI, Anthropic, Google, DeepSeek, Kimi, and Grok 4+ models marked `toolCalling: true`
- `grok-code-fast-1` and `nvidia/gpt-oss-120b` left unset (defaults to false)
- Added `supportsToolCalling(modelId)` helper
- Added `filterByToolCalling()` in `selector.ts`: filters fallback chain when request has tools; if all models are filtered out, returns the original list to avoid an empty chain

---

### OpenClaw async plugin registration (v0.10.13)

**Problem:** OpenClaw's plugin loader calls `register()` and ignores the return value. `register()` was `async`, so it returned a `Promise` — OpenClaw discarded it, and all plugin initialization (proxy server, partner tools) was silently skipped.

**Fix:**

- Converted `async register(api)` → `register(api)` (synchronous)
- Replaced `await import("./partners/index.js")` with a static import at the top of the file
- No behavior change; the async work was never needed

---

## Version History

| Version  | Date   | Key Change                                      |
| -------- | ------ | ----------------------------------------------- |
| v0.10.17 | Feb 26 | Session persistence fix — model no longer jumps |
| v0.10.15 | Feb 26 | Tool-calling capability flag + fallback filter  |
| v0.10.14 | Feb 26 | Remove grok-code-fast-1 from all routing paths  |
| v0.10.13 | Feb 26 | Fix async plugin registration breaking OpenClaw |
| v0.10.12 | Feb 26 | Agentic mode false trigger fix (system prompt)  |
