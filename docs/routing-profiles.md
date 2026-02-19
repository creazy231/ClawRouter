# Routing Profiles & Pricing

ClawRouter offers three routing profiles to balance cost vs quality. Prices are in **$/M tokens** (input/output).

## ECO (Absolute Cheapest)

Use `blockrun/eco` for maximum cost savings.

| Tier      | Primary Model               | Input | Output |
| --------- | --------------------------- | ----- | ------ |
| SIMPLE    | nvidia/gpt-oss-120b         | $0.00 | $0.00  |
| MEDIUM    | google/gemini-2.5-flash     | $0.15 | $0.60  |
| COMPLEX   | google/gemini-2.5-flash     | $0.15 | $0.60  |
| REASONING | xai/grok-4-1-fast-reasoning | $0.20 | $0.50  |

---

## AUTO (Balanced - Default)

Use `blockrun/auto` for the best quality/price balance.

| Tier      | Primary Model               | Input | Output |
| --------- | --------------------------- | ----- | ------ |
| SIMPLE    | moonshot/kimi-k2.5          | $0.50 | $2.40  |
| MEDIUM    | xai/grok-code-fast-1        | $0.20 | $1.50  |
| COMPLEX   | google/gemini-3-pro-preview | $2.00 | $12.00 |
| REASONING | xai/grok-4-1-fast-reasoning | $0.20 | $0.50  |

---

## PREMIUM (Best Quality)

Use `blockrun/premium` for maximum quality.

| Tier      | Primary Model        | Input  | Output |
| --------- | -------------------- | ------ | ------ |
| SIMPLE    | moonshot/kimi-k2.5   | $0.50  | $2.40  |
| MEDIUM    | openai/gpt-5.2-codex | $2.50  | $10.00 |
| COMPLEX   | claude-opus-4        | $15.00 | $75.00 |
| REASONING | claude-sonnet-4      | $3.00  | $15.00 |

---

## ECO vs AUTO Savings

| Tier      | ECO   | AUTO   | Savings  |
| --------- | ----- | ------ | -------- |
| SIMPLE    | FREE  | $2.90  | **100%** |
| MEDIUM    | $0.75 | $1.70  | **56%**  |
| COMPLEX   | $0.75 | $14.00 | **95%**  |
| REASONING | $0.70 | $0.70  | 0%       |

---

## How Tiers Work

ClawRouter automatically classifies your query into one of four tiers:

- **SIMPLE**: Basic questions, short responses, simple lookups
- **MEDIUM**: Code generation, moderate complexity tasks
- **COMPLEX**: Large context, multi-step reasoning, complex code
- **REASONING**: Logic puzzles, math, chain-of-thought tasks

The router picks the cheapest model capable of handling your query's tier.

---

_Last updated: v0.9.33_
