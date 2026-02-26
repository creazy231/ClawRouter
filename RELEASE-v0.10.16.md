# ClawRouter v0.10.16 — Feb 26, 2026

## Highlights

- **`/debug` chat command** — type `/debug` in OpenClaw to see exactly how ClawRouter scores and routes your prompt, with zero API cost
- **Tool-calling model filter** — requests with tool schemas now automatically skip models that don't support function calling

---

## New Features

### `/debug` command (v0.10.16)

Type `/debug` (or `/debug <prompt>`) as a chat message in OpenClaw to get a full routing diagnostic without making an upstream API call:

```
/debug write a recursive fibonacci function in python
```

Returns:

```
ClawRouter Debug

Profile: auto | Tier: MEDIUM | Model: moonshot/kimi-k2.5
Confidence: 0.85 | Cost: $0.0004 | Savings: 95%
Reasoning: score=0.18 | code (function, python) | auto

Scoring (weighted: 0.180)
  tokenCount:             -0.30
  codePresence:            0.50  [code (function, python)]
  reasoningMarkers:        0.00
  simpleIndicators:        0.00
  ...

Tier Boundaries: SIMPLE <0.00 | MEDIUM <0.30 | COMPLEX <0.50 | REASONING >=0.50

Session: abc12345... → pinned: moonshot/kimi-k2.5 (3 requests)
```

- Works with all routing profiles (`auto`, `eco`, `premium`)
- Supports both streaming and non-streaming responses
- Shows all 14 dimension scores, tier boundaries, and session state
- Normal messages containing "debug" are unaffected

### Tool-calling model filter (v0.10.16)

Requests that include tool/function schemas now automatically filter out models that don't support tool calling (e.g., `nvidia/gpt-oss-120b`). Previously, these requests could route to incompatible models and fail silently.

- Added `supportsToolCalling` flag to model registry
- Fallback chains skip non-tool-calling models when tools are present
- If all models in a tier lack tool support, the full list is preserved to avoid empty chains

---

## Internal

- Added `dimensions` field to `ScoringResult` type for per-dimension score breakdowns
- `classifyByRules()` now returns the full dimension array
- 7 new e2e tests for `/debug` command covering all profiles and streaming
