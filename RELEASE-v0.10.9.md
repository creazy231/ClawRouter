# ClawRouter v0.10.9 — Fix Agentic Mode False Trigger (Auto Mode Routing to Sonnet)

**Release Date:** 2026-02-24

---

## 🐛 Bug Fix: `blockrun/auto` no longer routes all requests to Sonnet

**Root cause:** `agenticScore` was computed from `systemPrompt + userPrompt` combined text. Coding assistant system prompts (e.g., OpenClaw's) contain words like "edit files", "fix bugs", "check", "verify", "deploy", "make sure" — matching 3+ agentic keywords and triggering agentic mode (`agenticScore ≥ 0.6`) on **every** request, regardless of what the user actually asked.

In agentic mode, COMPLEX/REASONING tier routes to `claude-sonnet-4.6`, causing all queries to hit Sonnet.

**Fix:** `agenticScore` now only scores the **user's prompt**, not the system prompt. The system prompt describes how the assistant should behave — it should not influence whether the user is requesting a multi-step agentic task.

### Behavior change

| Scenario | Before | After |
|----------|--------|-------|
| "What is React?" (coding system prompt) | agentic mode → Sonnet | standard routing → kimi/grok |
| "What does this function do?" (coding system prompt) | agentic mode → Sonnet | standard routing → kimi |
| "Fix the bug, deploy, make sure it works" | agentic mode ✓ | agentic mode ✓ (unchanged) |
| User explicitly requests multi-step task | agentic mode ✓ | agentic mode ✓ (unchanged) |

---

## 📋 Files Changed

| File | Change |
|------|--------|
| `src/router/rules.ts` | `scoreAgenticTask` uses `userText` instead of combined `text` |
| `test/e2e.ts` | Add regression tests for coding system prompt agentic false trigger |
| `package.json` | Version bump `0.10.8` → `0.10.9` |

---

## 🔢 Stats

- **Tests:** 214 unit passed + 36 e2e passed, 0 failed
