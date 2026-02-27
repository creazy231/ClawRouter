# ClawRouter v0.10.19 — Feb 27, 2026

## Bug Fix: Routing broken for OpenClaw (Anthropic array content + session startup bias)

Two routing bugs reported in [#61](https://github.com/BlockRunAI/ClawRouter/issues/61) by @Machiel692, confirmed and fixed.

---

### Bug 1: Prompt extraction returns empty string for Anthropic array content

**Root cause**: The routing code extracted the user message with:

```typescript
const prompt = typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "";
```

OpenClaw uses the Anthropic Messages API format where `content` is an array of content blocks:

```json
[{ "type": "text", "text": "actual user message" }]
```

The string check falls through to `""`, so the router only sees an empty prompt. With a ~6,800-token system prompt but no user text, only the `tokenCount` dimension fires (score ≈ 0.08). No keyword dimensions fire. Result: every request routes MEDIUM regardless of actual query complexity.

**Fix**: Extract text blocks from array content:

```typescript
const prompt =
  typeof rawPrompt === "string"
    ? rawPrompt
    : Array.isArray(rawPrompt)
      ? rawPrompt.filter((b) => b.type === "text").map((b) => b.text ?? "").join(" ")
      : "";
```

Applied to both the routing path and the session journal content check.

---

### Bug 2: Session pinning locks entire session to startup message tier

**Root cause**: `deriveSessionId` hashes the first user message for session stability. In OpenClaw, the first request is always the startup message `"Execute your Session Startup sequence now..."`, which scores SIMPLE/MEDIUM. The old code pinned the session on first contact and **skipped routing entirely** on all subsequent requests:

```
Request 1 (startup → MEDIUM): session pinned to MEDIUM
Request 2 (complex user query): session found → skip routing → use MEDIUM  ✗
Request 3 (tool call): session found → skip routing → use MEDIUM  ✗
```

**Fix**: Always route every request, but apply **never-downgrade** logic. If the new routing tier exceeds the pinned tier, upgrade the session. Otherwise keep the pinned model:

```
Request 1 (startup → MEDIUM):   session pinned to MEDIUM
Request 2 (complex → COMPLEX):  COMPLEX > MEDIUM → upgrade session to COMPLEX  ✓
Request 3 (simple follow-up):   SIMPLE < COMPLEX → keep COMPLEX (no mid-task switch)  ✓
```

This preserves the original intent — prevent model switching mid-task — while ensuring complex queries always get the tier they need even when preceded by a low-complexity startup message.

**Bonus**: `hasTools` detection now runs on every request (was inside the `else` branch), fixing tool-calling filter for pinned sessions.

---

### Upgrade

```bash
~/.blockrun/scripts/update.sh
```
