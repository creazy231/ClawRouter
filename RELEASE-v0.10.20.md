# ClawRouter v0.10.20/21 — Feb 27, 2026

## Fix 1: Stop hijacking model picker when users switch to other providers

ClawRouter was injecting `blockrun/*` entries into the OpenClaw model allowlist (`agents.defaults.models`) on every startup. This had the unintended effect of **hiding all non-BlockRun models** from the `/model` picker — even when users had configured and switched to other providers like OpenRouter.

---

### Root cause

OpenClaw's `agents.defaults.models` works as an **allowlist filter**:
- **Empty** `{}` = show all models from all providers
- **Non-empty** = only show models in the list

ClawRouter populated this with 16 `blockrun/*` entries (auto, eco, premium, sonnet, opus, etc.), converting it from "show all" to "only show BlockRun". Users who added OpenRouter could not see or select OpenRouter models in the picker.

```
Before (v0.10.19):
  agents.defaults.models = {
    "blockrun/auto": { alias: "auto" },
    "blockrun/sonnet": { alias: "sonnet-4.6" },
    "blockrun/opus": { alias: "opus" },
    ... 13 more blockrun entries
  }
  → /model picker: only BlockRun models visible
  → OpenRouter models: HIDDEN

After (v0.10.20):
  agents.defaults.models = {}
  → /model picker: all providers visible
  → BlockRun models: still discoverable via providers.blockrun.models
```

### Fix

1. **Removed allowlist injection** from `injectModelsConfig()` — ClawRouter no longer touches `agents.defaults.models`
2. **Migration in `update.sh`** — cleans up existing `blockrun/*` entries for upgrading users, restoring "allow all" mode

BlockRun models remain fully discoverable through the standard provider registration (`providers.blockrun.models` with 63 models). The allowlist is now user-controlled.

---

## Fix 2: Silent fallback to free model on payment failure (v0.10.21)

When a wallet has insufficient funds, ClawRouter now **silently falls back to the free model** instead of showing "Payment verification failed".

### Before

```
User sends request → paid model fails (no funds) → tries next paid model
→ also fails → ... → "Payment verification failed" error shown to user
```

### After

```
User sends request → paid model fails (no funds) → skip remaining paid models
→ immediately try nvidia/gpt-oss-120b (free) → user gets a response
```

Two changes:

1. **Free model always in fallback chain** — `nvidia/gpt-oss-120b` is appended as last-resort to every fallback chain (routing profiles + explicit models)
2. **Payment error fast-path** — when a payment error is detected, skip remaining paid models and jump straight to the free model. No point trying 4 more paid models with the same empty wallet.

---

### Upgrade

```bash
curl -fsSL https://blockrun.ai/ClawRouter-update | bash
```
