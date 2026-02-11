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
  // vision: true because several tier models support it (gemini, grok, mistral, kimi-k2-5)
  // reasoning: true so OpenClaw sends thinking params (5/8 models support it; drop_params handles the rest)
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

  // === Llama (Venice AI) ===
  {
    id: "llama-3.3-70b",
    name: "Llama 3.3 70B",
    inputPrice: 0.7,
    outputPrice: 2.8,
    contextWindow: 131_072,
    maxOutput: 8_192,
  },

  // === Mistral (Venice AI) ===
  {
    id: "mistral-31-24b",
    name: "Mistral 31 24B",
    inputPrice: 0.5,
    outputPrice: 2.0,
    contextWindow: 131_072,
    maxOutput: 8_192,
    vision: true,
  },

  // === Grok (Venice AI) ===
  {
    id: "grok-41-fast",
    name: "Grok 4.1 Fast",
    inputPrice: 0.5,
    outputPrice: 1.25,
    contextWindow: 131_072,
    maxOutput: 8_192,
    reasoning: true,
    vision: true,
  },

  // === Gemini (Venice AI) ===
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

  // === Kimi / Moonshot (Venice AI) ===
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

  // === MiniMax (Venice AI) ===
  {
    id: "minimax-m21",
    name: "MiniMax M21",
    inputPrice: 0.4,
    outputPrice: 1.6,
    contextWindow: 131_072,
    maxOutput: 16_384,
    reasoning: true,
    agentic: true, // Code specialist
  },

  // === Claude (Venice AI) ===
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

  // === Uncensored (Venice AI) ===
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
  // Llama
  llama: "llama-3.3-70b",

  // Mistral
  mistral: "mistral-31-24b",

  // Grok
  grok: "grok-41-fast",

  // Gemini
  gemini: "gemini-3-pro-preview",

  // Kimi
  kimi: "kimi-k2-5",

  // MiniMax
  minimax: "minimax-m21",

  // Claude
  claude: "claude-opus-45",
  opus: "claude-opus-45",

  // Venice
  uncensored: "venice-uncensored",

  // Meta
  free: "minimax-m21", // Cheapest capable model
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
      fallback: ["venice-uncensored", "llama-3.3-70b", "mistral-31-24b"],
    },
    MEDIUM: {
      primary: "grok-41-fast", // $0.50/$1.25 — reasoning + vision
      fallback: ["minimax-m21", "mistral-31-24b", "llama-3.3-70b"],
    },
    COMPLEX: {
      primary: "kimi-k2-5", // $0.75/$3.75 — reasoning + vision + code + 256k ctx
      fallback: ["claude-opus-45", "gemini-3-pro-preview", "minimax-m21"],
    },
    REASONING: {
      primary: "claude-opus-45", // $6/$30 — 80.9% SWE-bench, best reasoning
      fallback: ["grok-41-fast", "kimi-k2-5", "gemini-3-pro-preview"],
    },
  },

  // Agentic tiers — code/tool-use optimized
  // Opus 4.5 is #1 coder (80.9% SWE-bench) but $6/$30 — first fallback for COMPLEX
  agenticTiers: {
    SIMPLE: {
      primary: "minimax-m21", // $0.40/$1.60 — cheapest with reasoning + agentic
      fallback: ["llama-3.3-70b", "grok-41-fast", "mistral-31-24b"],
    },
    MEDIUM: {
      primary: "grok-41-fast", // $0.50/$1.25 — reasoning + vision
      fallback: ["minimax-m21", "mistral-31-24b", "llama-3.3-70b"],
    },
    COMPLEX: {
      primary: "gemini-3-pro-preview", // $2.50/$15.00 — 76.2% SWE-bench, best value in high tier
      fallback: ["claude-opus-45", "kimi-k2-5", "minimax-m21"],
    },
    REASONING: {
      primary: "kimi-k2-5", // $0.75/$3.75 — reasoning + agentic + 256k ctx
      fallback: ["claude-opus-45", "grok-41-fast", "gemini-3-pro-preview"],
    },
  },

  // Browser tiers — vision-capable models for UI/browser interaction tasks
  // Browser work needs models that can reason about screenshots, DOM state, and page layout
  browserTiers: {
    SIMPLE: {
      primary: "grok-41-fast", // $0.50/$1.25 — vision + reasoning, fast
      fallback: ["mistral-31-24b", "kimi-k2-5", "minimax-m21"],
    },
    MEDIUM: {
      primary: "kimi-k2-5", // $0.75/$3.75 — vision + reasoning + agentic + 256k ctx
      fallback: ["grok-41-fast", "gemini-3-pro-preview", "minimax-m21"],
    },
    COMPLEX: {
      primary: "gemini-3-pro-preview", // $2.50/$15.00 — vision + reasoning + 1M ctx
      fallback: ["claude-opus-45", "kimi-k2-5", "grok-41-fast"],
    },
    REASONING: {
      primary: "claude-opus-45", // $6/$30 — best vision + reasoning for browser debugging
      fallback: ["gemini-3-pro-preview", "kimi-k2-5", "grok-41-fast"],
    },
  },

  overrides: {
    maxTokensForceComplex: 100_000,
    structuredOutputMinTier: "MEDIUM",
    ambiguousDefaultTier: "MEDIUM",
    agenticMode: false,
  },
};
