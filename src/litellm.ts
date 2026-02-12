/**
 * LiteLLM Free Mode Configuration
 *
 * Model definitions, aliases, and routing tiers for LiteLLM-backed free mode.
 * When CLAWROUTER_FREE_MODE=true, these replace the BlockRun model catalog.
 *
 * Model IDs match LiteLLM model_name values exactly — they get sent
 * as-is in the "model" field of /v1/chat/completions requests.
 *
 * Pricing is informational (used for routing cost optimization and
 * savings reporting) — no actual payments are made in free mode.
 */

import type { RoutingConfig } from "./router/types.js";

/**
 * Check if free mode is enabled via environment variable.
 */
export function isFreeMode(): boolean {
  return (
    process.env.CLAWROUTER_FREE_MODE === "true" || process.env.CLAWROUTER_FREE_MODE === "1"
  );
}

/**
 * Get the upstream API base URL for free mode.
 */
export function getFreeModeApiBase(): string | undefined {
  return process.env.CLAWROUTER_API_BASE;
}

/**
 * Get the API key for free mode authentication.
 */
export function getFreeModeApiKey(): string | undefined {
  return process.env.CLAWROUTER_API_KEY;
}

// Re-use BlockRunModel shape from models.ts (imported at runtime to avoid circular deps)
// Type is duplicated here to keep litellm.ts self-contained.
type LiteLLMModel = {
  id: string;
  name: string;
  inputPrice: number; // USD per 1M tokens
  outputPrice: number; // USD per 1M tokens
  contextWindow: number;
  maxOutput: number;
  reasoning?: boolean;
  vision?: boolean;
  agentic?: boolean;
};

/**
 * LiteLLM model catalog.
 *
 * Pricing is per 1M tokens (converted from LiteLLM's per-token config).
 * Used for smart routing cost optimization — cheapest capable model wins.
 */
export const LITELLM_MODELS: LiteLLMModel[] = [
  // Smart routing meta-model — proxy replaces with actual model
  // vision: true because many tier models support it (gemini, grok, mistral, kimi, claude, qwen-vl)
  // reasoning: true so OpenClaw sends thinking params (most models support it; drop_params handles the rest)
  // Max bounds from Gemini 3 Pro / Claude Opus 4.6 (1M ctx) and Gemini (65k output)
  {
    id: "auto",
    name: "ClawRouter Smart Router",
    inputPrice: 0,
    outputPrice: 0,
    contextWindow: 1_000_000,
    maxOutput: 65_536,
    vision: true,
    reasoning: true,
  },

  // ============================================
  // COMPUT3 AI MODELS
  // ============================================

  // Hermes 4 70B — ultra-cheap general-purpose, function calling
  {
    id: "hermes4:70b",
    name: "Hermes 4 70B",
    inputPrice: 0.05,
    outputPrice: 0.2,
    contextWindow: 131_072,
    maxOutput: 16_384,
  },

  // ============================================
  // VENICE AI — QWEN MODELS
  // ============================================

  // Qwen3 235B Instruct — large MoE, cheap for its size
  {
    id: "qwen3-235b-a22b-instruct-2507",
    name: "Qwen3 235B Instruct",
    inputPrice: 0.15,
    outputPrice: 0.75,
    contextWindow: 131_072,
    maxOutput: 32_768,
  },

  // Qwen3 235B Thinking — reasoning variant of 235B
  {
    id: "qwen3-235b-a22b-thinking-2507",
    name: "Qwen3 235B Thinking",
    inputPrice: 0.45,
    outputPrice: 3.5,
    contextWindow: 131_072,
    maxOutput: 32_768,
    reasoning: true,
  },

  // Qwen3 Coder 480B — largest code-specialist MoE
  {
    id: "qwen3-coder-480b-a35b-instruct",
    name: "Qwen3 Coder 480B",
    inputPrice: 0.75,
    outputPrice: 3.0,
    contextWindow: 131_072,
    maxOutput: 32_768,
    agentic: true, // Code specialist
  },

  // Qwen3 4B — ultra-cheap tiny model with reasoning
  {
    id: "qwen3-4b",
    name: "Qwen3 4B",
    inputPrice: 0.05,
    outputPrice: 0.15,
    contextWindow: 32_000,
    maxOutput: 32_768,
    reasoning: true,
  },

  // Qwen3 Next 80B — 256k context, solid mid-range
  {
    id: "qwen3-next-80b",
    name: "Qwen3 Next 80B",
    inputPrice: 0.35,
    outputPrice: 1.9,
    contextWindow: 256_000,
    maxOutput: 32_768,
  },

  // Qwen3 VL 235B — vision-language model, 256k context
  {
    id: "qwen3-vl-235b-a22b",
    name: "Qwen3 VL 235B",
    inputPrice: 0.25,
    outputPrice: 1.5,
    contextWindow: 256_000,
    maxOutput: 32_768,
    vision: true,
  },

  // ============================================
  // VENICE AI — DEEPSEEK MODELS
  // ============================================

  // DeepSeek V3.2 — strong reasoning, competitive pricing
  {
    id: "deepseek-v3.2",
    name: "DeepSeek V3.2",
    inputPrice: 0.4,
    outputPrice: 1.0,
    contextWindow: 131_072,
    maxOutput: 16_384,
    reasoning: true,
  },

  // ============================================
  // VENICE AI — LLAMA MODELS
  // ============================================

  // Llama 3.3 70B — Meta's workhorse, function calling
  {
    id: "llama-3.3-70b",
    name: "Llama 3.3 70B",
    inputPrice: 0.7,
    outputPrice: 2.8,
    contextWindow: 131_072,
    maxOutput: 16_384,
  },

  // Llama 3.2 3B — ultra-lightweight, good for trivial tasks
  {
    id: "llama-3.2-3b",
    name: "Llama 3.2 3B",
    inputPrice: 0.15,
    outputPrice: 0.6,
    contextWindow: 128_000,
    maxOutput: 16_384,
  },

  // Hermes 3 Llama 405B — largest Llama variant, no function calling
  {
    id: "hermes-3-llama-3.1-405b",
    name: "Hermes 3 Llama 405B",
    inputPrice: 1.1,
    outputPrice: 3.0,
    contextWindow: 128_000,
    maxOutput: 16_384,
  },

  // ============================================
  // VENICE AI — MISTRAL MODELS
  // ============================================

  // Mistral Small 3.1 24B — multimodal text+image, function calling
  {
    id: "mistral-31-24b",
    name: "Mistral 31 24B",
    inputPrice: 0.5,
    outputPrice: 2.0,
    contextWindow: 131_072,
    maxOutput: 16_384,
    vision: true,
  },

  // ============================================
  // VENICE AI — GROK MODELS
  // ============================================

  // Grok 4.1 Fast — reasoning + vision, tool-calling optimized
  {
    id: "grok-41-fast",
    name: "Grok 4.1 Fast",
    inputPrice: 0.5,
    outputPrice: 1.25,
    contextWindow: 131_072,
    maxOutput: 32_768,
    reasoning: true,
    vision: true,
  },

  // Grok Code Fast 1 — code-optimized reasoning, 256k context
  {
    id: "grok-code-fast-1",
    name: "Grok Code Fast 1",
    inputPrice: 0.25,
    outputPrice: 1.87,
    contextWindow: 256_000,
    maxOutput: 32_768,
    reasoning: true,
    agentic: true, // Code specialist
  },

  // ============================================
  // VENICE AI — GEMINI MODELS
  // ============================================

  // Gemini 3 Pro — Google's flagship, 1M ctx, multimodal
  {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro Preview",
    inputPrice: 2.5,
    outputPrice: 15.0,
    contextWindow: 1_000_000,
    maxOutput: 65_536,
    reasoning: true,
    vision: true,
  },

  // Gemini 3 Flash — faster/cheaper Gemini, 256k ctx, multimodal
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash Preview",
    inputPrice: 0.7,
    outputPrice: 3.75,
    contextWindow: 256_000,
    maxOutput: 65_536,
    reasoning: true,
    vision: true,
  },

  // ============================================
  // VENICE AI — KIMI MODELS
  // ============================================

  // Kimi K2 Thinking — reasoning + code specialist
  {
    id: "kimi-k2-thinking",
    name: "Kimi K2 Thinking",
    inputPrice: 0.75,
    outputPrice: 3.2,
    contextWindow: 131_072,
    maxOutput: 32_768,
    reasoning: true,
    agentic: true, // Code specialist
  },

  // Kimi K2.5 — reasoning + vision + code, 256k context
  {
    id: "kimi-k2-5",
    name: "Kimi K2.5",
    inputPrice: 0.75,
    outputPrice: 3.75,
    contextWindow: 256_000,
    maxOutput: 32_768,
    reasoning: true,
    vision: true,
    agentic: true, // Code specialist
  },

  // ============================================
  // VENICE AI — MINIMAX MODELS
  // ============================================

  // MiniMax M21 — MoE, reasoning + code
  {
    id: "minimax-m21",
    name: "MiniMax M21",
    inputPrice: 0.4,
    outputPrice: 1.6,
    contextWindow: 131_072,
    maxOutput: 32_768,
    reasoning: true,
    agentic: true, // Code specialist
  },

  // ============================================
  // VENICE AI — CLAUDE MODELS
  // ============================================

  // Claude Opus 4.5 — Anthropic's prior flagship, 200k ctx
  {
    id: "claude-opus-45",
    name: "Claude Opus 4.5",
    inputPrice: 6.0,
    outputPrice: 30.0,
    contextWindow: 200_000,
    maxOutput: 32_768,
    reasoning: true,
    vision: true,
    agentic: true, // Code specialist
  },

  // Claude Opus 4.6 — latest Anthropic flagship, 1M ctx
  {
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    inputPrice: 6.0,
    outputPrice: 30.0,
    contextWindow: 1_000_000,
    maxOutput: 32_768,
    reasoning: true,
    vision: true,
    agentic: true, // Code specialist
  },

  // Claude Sonnet 4.5 — strong mid-tier Claude, vision + code
  {
    id: "claude-sonnet-45",
    name: "Claude Sonnet 4.5",
    inputPrice: 3.75,
    outputPrice: 18.75,
    contextWindow: 198_000,
    maxOutput: 32_768,
    reasoning: true,
    vision: true,
    agentic: true, // Code specialist
  },

  // ============================================
  // VENICE AI — GLM MODELS
  // ============================================

  // GLM 4.7 — ZhipuAI reasoning model, 198k ctx
  {
    id: "zai-org-glm-4.7",
    name: "GLM 4.7",
    inputPrice: 0.55,
    outputPrice: 2.65,
    contextWindow: 198_000,
    maxOutput: 32_768,
    reasoning: true,
  },

  // GLM 4.7 Flash — cheap fast ZhipuAI reasoning
  {
    id: "zai-org-glm-4.7-flash",
    name: "GLM 4.7 Flash",
    inputPrice: 0.125,
    outputPrice: 0.5,
    contextWindow: 128_000,
    maxOutput: 16_384,
    reasoning: true,
  },

  // GLM 5 — latest ZhipuAI, reasoning + code
  {
    id: "zai-org-glm-5",
    name: "GLM 5",
    inputPrice: 1.0,
    outputPrice: 3.2,
    contextWindow: 198_000,
    maxOutput: 32_768,
    reasoning: true,
    agentic: true, // Code specialist
  },

  // ============================================
  // VENICE AI — GOOGLE GEMMA MODELS
  // ============================================

  // Gemma 3 27B — lightweight Google model, vision capable
  {
    id: "google-gemma-3-27b-it",
    name: "Gemma 3 27B",
    inputPrice: 0.12,
    outputPrice: 0.2,
    contextWindow: 198_000,
    maxOutput: 8_192,
    vision: true,
  },

  // ============================================
  // VENICE AI — OPENAI MODELS
  // ============================================

  // GPT OSS 120B — cheap OpenAI open-source model
  {
    id: "openai-gpt-oss-120b",
    name: "GPT OSS 120B",
    inputPrice: 0.07,
    outputPrice: 0.3,
    contextWindow: 128_000,
    maxOutput: 16_384,
  },

  // GPT 5.2 — OpenAI reasoning flagship, 256k ctx
  {
    id: "openai-gpt-52",
    name: "GPT 5.2",
    inputPrice: 2.19,
    outputPrice: 17.5,
    contextWindow: 256_000,
    maxOutput: 32_768,
    reasoning: true,
  },

  // GPT 5.2 Codex — OpenAI code + vision + reasoning flagship
  {
    id: "openai-gpt-52-codex",
    name: "GPT 5.2 Codex",
    inputPrice: 2.19,
    outputPrice: 17.5,
    contextWindow: 256_000,
    maxOutput: 32_768,
    reasoning: true,
    vision: true,
    agentic: true, // Code specialist
  },

  // ============================================
  // VENICE AI — UNCENSORED MODELS
  // ============================================

  // Dolphin Mistral 24B Venice Edition — minimal content restrictions
  {
    id: "venice-uncensored",
    name: "Venice Uncensored",
    inputPrice: 0.2,
    outputPrice: 0.9,
    contextWindow: 32_768,
    maxOutput: 8_192,
  },
];

/**
 * Model aliases for LiteLLM free mode.
 * Users can type `/model grok` instead of the full model name.
 */
export const LITELLM_MODEL_ALIASES: Record<string, string> = {
  // Comput3
  hermes: "hermes4:70b",

  // Qwen
  qwen: "qwen3-235b-a22b-instruct-2507",
  "qwen-instruct": "qwen3-235b-a22b-instruct-2507",
  "qwen-thinking": "qwen3-235b-a22b-thinking-2507",
  "qwen-coder": "qwen3-coder-480b-a35b-instruct",
  "qwen-4b": "qwen3-4b",
  "qwen-next": "qwen3-next-80b",
  "qwen-vl": "qwen3-vl-235b-a22b",
  "qwen-vision": "qwen3-vl-235b-a22b",

  // DeepSeek
  deepseek: "deepseek-v3.2",

  // Llama
  llama: "llama-3.3-70b",
  "llama-small": "llama-3.2-3b",
  "llama-405b": "hermes-3-llama-3.1-405b",

  // Mistral
  mistral: "mistral-31-24b",

  // Grok
  grok: "grok-41-fast",
  "grok-code": "grok-code-fast-1",

  // Gemini
  gemini: "gemini-3-pro-preview",
  "gemini-pro": "gemini-3-pro-preview",
  "gemini-flash": "gemini-3-flash-preview",

  // Kimi
  kimi: "kimi-k2-5",
  "kimi-thinking": "kimi-k2-thinking",

  // MiniMax
  minimax: "minimax-m21",

  // Claude
  claude: "claude-opus-4-6",
  opus: "claude-opus-4-6",
  "opus-45": "claude-opus-45",
  "opus-4.5": "claude-opus-45",
  "opus-4.6": "claude-opus-4-6",
  sonnet: "claude-sonnet-45",
  "sonnet-45": "claude-sonnet-45",

  // GLM (ZhipuAI)
  glm: "zai-org-glm-5",
  "glm-flash": "zai-org-glm-4.7-flash",
  "glm-4.7": "zai-org-glm-4.7",
  "glm-5": "zai-org-glm-5",

  // Gemma
  gemma: "google-gemma-3-27b-it",

  // OpenAI
  gpt: "openai-gpt-52",
  "gpt-oss": "openai-gpt-oss-120b",
  "gpt-52": "openai-gpt-52",
  "gpt-codex": "openai-gpt-52-codex",
  codex: "openai-gpt-52-codex",

  // Venice
  uncensored: "venice-uncensored",

  // Meta
  free: "zai-org-glm-4.7-flash", // Cheapest capable model with reasoning
};

/**
 * Routing configuration for LiteLLM free mode.
 *
 * Same structure as DEFAULT_ROUTING_CONFIG but with tier primaries
 * and fallbacks referencing LiteLLM model IDs. The scoring engine,
 * dimension weights, and keywords are identical — only the model
 * selection changes.
 */
export const LITELLM_ROUTING_CONFIG: RoutingConfig = {
  version: "2.0",

  classifier: {
    llmModel: "grok-41-fast",
    llmMaxTokens: 10,
    llmTemperature: 0,
    promptTruncationChars: 500,
    cacheTtlMs: 3_600_000, // 1 hour
  },

  scoring: {
    tokenCountThresholds: { simple: 50, complex: 500 },

    // Reuse the same multilingual keyword lists as BlockRun config
    codeKeywords: [
      "function", "class", "import", "def", "SELECT", "async", "await",
      "const", "let", "var", "return", "```",
      "函数", "类", "导入", "定义", "查询", "异步", "等待", "常量", "变量", "返回",
      "関数", "クラス", "インポート", "非同期", "定数", "変数",
      "функция", "класс", "импорт", "определ", "запрос", "асинхронный",
      "ожидать", "константа", "переменная", "вернуть",
      "funktion", "klasse", "importieren", "definieren", "abfrage",
      "asynchron", "erwarten", "konstante", "variable", "zurückgeben",
    ],
    reasoningKeywords: [
      "prove", "theorem", "derive", "step by step", "chain of thought",
      "formally", "mathematical", "proof", "logically",
      "证明", "定理", "推导", "逐步", "思维链", "形式化", "数学", "逻辑",
      "証明", "定理", "導出", "ステップバイステップ", "論理的",
      "доказать", "докажи", "доказательств", "теорема", "вывести",
      "шаг за шагом", "пошагово", "поэтапно", "цепочка рассуждений",
      "рассуждени", "формально", "математически", "логически",
      "beweisen", "beweis", "theorem", "ableiten", "schritt für schritt",
      "gedankenkette", "formal", "mathematisch", "logisch",
    ],
    simpleKeywords: [
      "what is", "define", "translate", "hello", "yes or no", "capital of",
      "how old", "who is", "when was",
      "什么是", "定义", "翻译", "你好", "是否", "首都", "多大", "谁是", "何时",
      "とは", "定義", "翻訳", "こんにちは", "はいかいいえ", "首都", "誰",
      "что такое", "определение", "перевести", "переведи", "привет",
      "да или нет", "столица", "сколько лет", "кто такой", "когда", "объясни",
      "was ist", "definiere", "übersetze", "hallo", "ja oder nein",
      "hauptstadt", "wie alt", "wer ist", "wann", "erkläre",
    ],
    technicalKeywords: [
      "algorithm", "optimize", "architecture", "distributed", "kubernetes",
      "microservice", "database", "infrastructure",
      "算法", "优化", "架构", "分布式", "微服务", "数据库", "基础设施",
      "アルゴリズム", "最適化", "アーキテクチャ", "分散", "マイクロサービス", "データベース",
      "алгоритм", "оптимизировать", "оптимизаци", "оптимизируй", "архитектура",
      "распределённый", "микросервис", "база данных", "инфраструктура",
      "algorithmus", "optimieren", "architektur", "verteilt", "kubernetes",
      "mikroservice", "datenbank", "infrastruktur",
    ],
    creativeKeywords: [
      "story", "poem", "compose", "brainstorm", "creative", "imagine", "write a",
      "故事", "诗", "创作", "头脑风暴", "创意", "想象", "写一个",
      "物語", "詩", "作曲", "ブレインストーム", "創造的", "想像",
      "история", "рассказ", "стихотворение", "сочинить", "сочини",
      "мозговой штурм", "творческий", "представить", "придумай", "напиши",
      "geschichte", "gedicht", "komponieren", "brainstorming", "kreativ",
      "vorstellen", "schreibe", "erzählung",
    ],
    imperativeVerbs: [
      "build", "create", "implement", "design", "develop", "construct",
      "generate", "deploy", "configure", "set up",
      "构建", "创建", "实现", "设计", "开发", "生成", "部署", "配置", "设置",
      "構築", "作成", "実装", "設計", "開発", "生成", "デプロイ", "設定",
      "построить", "построй", "создать", "создай", "реализовать", "реализуй",
      "спроектировать", "разработать", "разработай", "сконструировать",
      "сгенерировать", "сгенерируй", "развернуть", "разверни", "настроить", "настрой",
      "erstellen", "bauen", "implementieren", "entwerfen", "entwickeln",
      "konstruieren", "generieren", "bereitstellen", "konfigurieren", "einrichten",
    ],
    constraintIndicators: [
      "under", "at most", "at least", "within", "no more than", "o(",
      "maximum", "minimum", "limit", "budget",
      "不超过", "至少", "最多", "在内", "最大", "最小", "限制", "预算",
      "以下", "最大", "最小", "制限", "予算",
      "не более", "не менее", "как минимум", "в пределах", "максимум",
      "минимум", "ограничение", "бюджет",
      "höchstens", "mindestens", "innerhalb", "nicht mehr als", "maximal",
      "minimal", "grenze", "budget",
    ],
    outputFormatKeywords: [
      "json", "yaml", "xml", "table", "csv", "markdown", "schema",
      "format as", "structured",
      "表格", "格式化为", "结构化",
      "テーブル", "フォーマット", "構造化",
      "таблица", "форматировать как", "структурированный",
      "tabelle", "formatieren als", "strukturiert",
    ],
    referenceKeywords: [
      "above", "below", "previous", "following", "the docs", "the api",
      "the code", "earlier", "attached",
      "上面", "下面", "之前", "接下来", "文档", "代码", "附件",
      "上記", "下記", "前の", "次の", "ドキュメント", "コード",
      "выше", "ниже", "предыдущий", "следующий", "документация",
      "код", "ранее", "вложение",
      "oben", "unten", "vorherige", "folgende", "dokumentation",
      "der code", "früher", "anhang",
    ],
    negationKeywords: [
      "don't", "do not", "avoid", "never", "without", "except",
      "exclude", "no longer",
      "不要", "避免", "从不", "没有", "除了", "排除",
      "しないで", "避ける", "決して", "なしで", "除く",
      "не делай", "не надо", "нельзя", "избегать", "никогда",
      "без", "кроме", "исключить", "больше не",
      "nicht", "vermeide", "niemals", "ohne", "außer",
      "ausschließen", "nicht mehr",
    ],
    domainSpecificKeywords: [
      "quantum", "fpga", "vlsi", "risc-v", "asic", "photonics",
      "genomics", "proteomics", "topological", "homomorphic",
      "zero-knowledge", "lattice-based",
      "量子", "光子学", "基因组学", "蛋白质组学", "拓扑", "同态", "零知识", "格密码",
      "量子", "フォトニクス", "ゲノミクス", "トポロジカル",
      "квантовый", "фотоника", "геномика", "протеомика", "топологический",
      "гомоморфный", "с нулевым разглашением", "на основе решёток",
      "quanten", "photonik", "genomik", "proteomik", "topologisch",
      "homomorph", "zero-knowledge", "gitterbasiert",
    ],
    agenticTaskKeywords: [
      "read file", "read the file", "look at", "check the", "open the",
      "edit", "modify", "update the", "change the", "write to", "create file",
      "execute", "deploy", "install", "npm", "pip", "compile",
      "after that", "and also", "once done", "step 1", "step 2",
      "fix", "debug", "until it works", "keep trying", "iterate",
      "make sure", "verify", "confirm",
      "读取文件", "查看", "打开", "编辑", "修改", "更新", "创建",
      "执行", "部署", "安装", "第一步", "第二步",
      "修复", "调试", "直到", "确认", "验证",
    ],
    browserInteractionKeywords: [
      "navigate to", "open url", "go to page", "visit site", "load page",
      "reload page", "go back", "go forward",
      "click button", "click on", "click the", "double click",
      "hover over", "scroll down", "scroll up", "scroll to",
      "fill form", "fill in", "type into", "select option", "check checkbox",
      "submit form", "press enter",
      "screenshot", "take screenshot", "page snapshot", "inspect element",
      "check element", "find element", "wait for element",
      "visible on page", "appears on screen", "displayed on",
      "browser", "web page", "webpage", "website", "dom", "html element",
      "css selector", "xpath", "iframe",
      "browser test", "e2e test", "end-to-end", "ui test", "visual test",
      "playwright", "puppeteer", "selenium", "cypress",
      "browser automation", "web automation", "web scraping",
      "computer use", "browser_navigate", "browser_click", "browser_type",
      "browser_snapshot", "browser_scroll", "browser_fill",
      "浏览器", "网页", "点击", "截图", "滚动", "填写表单", "导航到",
      "browser", "webseite", "klicken", "bildschirmfoto", "scrollen", "formular ausfüllen",
    ],

    dimensionWeights: {
      tokenCount: 0.08,
      codePresence: 0.14,
      reasoningMarkers: 0.17,
      technicalTerms: 0.1,
      creativeMarkers: 0.05,
      simpleIndicators: 0.02,
      multiStepPatterns: 0.12,
      questionComplexity: 0.05,
      imperativeVerbs: 0.03,
      constraintCount: 0.04,
      outputFormat: 0.03,
      referenceComplexity: 0.02,
      negationComplexity: 0.01,
      domainSpecificity: 0.02,
      agenticTask: 0.04,
      browserInteraction: 0.08,
    },

    tierBoundaries: {
      simpleMedium: 0.0,
      mediumComplex: 0.18,
      complexReasoning: 0.4,
    },

    confidenceSteepness: 12,
    confidenceThreshold: 0.7,
  },

  // Standard tiers — cost-optimized model selection
  // Benchmark ref: SWE-bench Verified (Feb 2026)
  tiers: {
    SIMPLE: {
      primary: "minimax-m21", // $0.40/$1.60 — cheapest with reasoning
      fallback: ["zai-org-glm-4.7-flash", "deepseek-v3.2", "llama-3.3-70b", "mistral-31-24b"],
    },
    MEDIUM: {
      primary: "grok-41-fast", // $0.50/$1.25 — reasoning + vision
      fallback: ["deepseek-v3.2", "minimax-m21", "qwen3-next-80b", "mistral-31-24b"],
    },
    COMPLEX: {
      primary: "kimi-k2-5", // $0.75/$3.75 — reasoning + vision + code + 256k ctx
      fallback: ["claude-sonnet-45", "gemini-3-pro-preview", "grok-code-fast-1", "minimax-m21"],
    },
    REASONING: {
      primary: "claude-opus-4-6", // $6/$30 — 1M ctx, best reasoning + vision + code
      fallback: ["claude-opus-45", "openai-gpt-52", "kimi-k2-5", "gemini-3-pro-preview"],
    },
  },

  // Agentic tiers — code/tool-use optimized
  // Opus 4.6 is top-tier coder with 1M ctx — ultimate reasoning fallback
  agenticTiers: {
    SIMPLE: {
      primary: "minimax-m21", // $0.40/$1.60 — cheapest with reasoning + agentic
      fallback: ["grok-code-fast-1", "llama-3.3-70b", "zai-org-glm-4.7-flash"],
    },
    MEDIUM: {
      primary: "grok-41-fast", // $0.50/$1.25 — reasoning + vision
      fallback: ["grok-code-fast-1", "minimax-m21", "deepseek-v3.2"],
    },
    COMPLEX: {
      primary: "gemini-3-pro-preview", // $2.50/$15.00 — 76.2% SWE-bench, best value in high tier
      fallback: ["claude-sonnet-45", "kimi-k2-5", "qwen3-coder-480b-a35b-instruct", "minimax-m21"],
    },
    REASONING: {
      primary: "kimi-k2-5", // $0.75/$3.75 — reasoning + agentic + 256k ctx
      fallback: ["claude-opus-4-6", "claude-opus-45", "grok-code-fast-1", "gemini-3-pro-preview"],
    },
  },

  // Browser tiers — vision-capable models for UI/browser interaction tasks
  // Browser work needs models that can reason about screenshots, DOM state, and page layout
  browserTiers: {
    SIMPLE: {
      primary: "grok-41-fast", // $0.50/$1.25 — vision + reasoning, fast
      fallback: ["gemini-3-flash-preview", "mistral-31-24b", "kimi-k2-5"],
    },
    MEDIUM: {
      primary: "kimi-k2-5", // $0.75/$3.75 — vision + reasoning + agentic + 256k ctx
      fallback: ["gemini-3-flash-preview", "grok-41-fast", "claude-sonnet-45"],
    },
    COMPLEX: {
      primary: "gemini-3-pro-preview", // $2.50/$15.00 — vision + reasoning + 1M ctx
      fallback: ["claude-sonnet-45", "claude-opus-4-6", "kimi-k2-5"],
    },
    REASONING: {
      primary: "claude-opus-4-6", // $6/$30 — 1M ctx, best vision + reasoning for browser debugging
      fallback: ["claude-opus-45", "gemini-3-pro-preview", "kimi-k2-5", "gemini-3-flash-preview"],
    },
  },

  overrides: {
    maxTokensForceComplex: 100_000,
    structuredOutputMinTier: "MEDIUM",
    ambiguousDefaultTier: "MEDIUM",
    agenticMode: false,
  },
};
