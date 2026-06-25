import OpenAI from "openai";

/**
 * The single choke point for every Qwen call (DashScope / Model Studio,
 * OpenAI-compatible mode). Nothing else in the codebase talks to the model
 * directly. Centralizing here buys: retries with backoff, hard timeouts,
 * structured-output parsing+repair, and cumulative token accounting for the
 * credit budget — all in one auditable place.
 *
 * Model routing is a first-class concern: cheap memory ops (extraction,
 * classification) go to qwen-turbo; agent reasoning to qwen-plus/max.
 */

export interface QwenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  calls: number;
}

export interface QwenConfig {
  apiKey: string;
  baseURL: string;
  agentModel: string;
  cheapModel: string;
  heavyModel: string;
  embedModel: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): QwenConfig {
  const apiKey = env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error("DASHSCOPE_API_KEY is not set. Copy .env.example -> .env and add your key.");
  return {
    apiKey,
    baseURL: env.DASHSCOPE_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1",
    agentModel: env.QWEN_AGENT_MODEL ?? "qwen-plus",
    cheapModel: env.QWEN_CHEAP_MODEL ?? "qwen-turbo",
    heavyModel: env.QWEN_HEAVY_MODEL ?? "qwen-max",
    embedModel: env.QWEN_EMBED_MODEL ?? "text-embedding-v3",
    timeoutMs: env.QWEN_TIMEOUT_MS ? Number(env.QWEN_TIMEOUT_MS) : 30_000,
    maxRetries: env.QWEN_MAX_RETRIES ? Number(env.QWEN_MAX_RETRIES) : 3,
  };
}

export type Tier = "cheap" | "agent" | "heavy";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class QwenClient {
  private readonly client: OpenAI;
  private readonly cfg: Required<QwenConfig>;
  private usage: QwenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0, calls: 0 };

  constructor(cfg: QwenConfig) {
    this.cfg = {
      timeoutMs: 30_000,
      maxRetries: 3,
      ...cfg,
    } as Required<QwenConfig>;
    this.client = new OpenAI({
      apiKey: this.cfg.apiKey,
      baseURL: this.cfg.baseURL,
      timeout: this.cfg.timeoutMs,
      maxRetries: 0, // we own the retry loop for consistent backoff + accounting
    });
  }

  getUsage(): QwenUsage {
    return { ...this.usage };
  }

  resetUsage(): void {
    this.usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0, calls: 0 };
  }

  private model(tier: Tier): string {
    return tier === "cheap" ? this.cfg.cheapModel : tier === "heavy" ? this.cfg.heavyModel : this.cfg.agentModel;
  }

  private record(u: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined): void {
    this.usage.calls += 1;
    if (!u) return;
    this.usage.promptTokens += u.prompt_tokens ?? 0;
    this.usage.completionTokens += u.completion_tokens ?? 0;
    this.usage.totalTokens += u.total_tokens ?? 0;
  }

  private async withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= this.cfg.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        const status = (err as { status?: number })?.status;
        // Don't retry deterministic client errors (bad request/auth).
        if (status && status >= 400 && status < 500 && status !== 429) break;
        if (attempt < this.cfg.maxRetries) await sleep(250 * 2 ** attempt);
      }
    }
    throw new Error(`Qwen call failed [${label}]: ${(lastErr as Error)?.message ?? lastErr}`);
  }

  /** Plain text completion. */
  async chat(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    opts: { tier?: Tier; temperature?: number; maxTokens?: number } = {},
  ): Promise<{ text: string }> {
    const res = await this.withRetry("chat", () =>
      this.client.chat.completions.create({
        model: this.model(opts.tier ?? "agent"),
        messages,
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens,
      }),
    );
    this.record(res.usage);
    return { text: res.choices[0]?.message?.content ?? "" };
  }

  /**
   * Structured output. Requests JSON, parses, and on malformed JSON retries once
   * with a repair instruction. `validate` throws on a bad shape, which also
   * triggers a repair attempt — so callers get typed data or a hard error.
   */
  async structured<T>(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    validate: (raw: unknown) => T,
    opts: { tier?: Tier; temperature?: number; maxTokens?: number } = {},
  ): Promise<T> {
    const tier = opts.tier ?? "cheap";
    const run = async (extra: OpenAI.Chat.ChatCompletionMessageParam[]) => {
      const res = await this.withRetry("structured", () =>
        this.client.chat.completions.create({
          model: this.model(tier),
          messages: [...messages, ...extra],
          temperature: opts.temperature ?? 0,
          max_tokens: opts.maxTokens,
          response_format: { type: "json_object" },
        }),
      );
      this.record(res.usage);
      return res.choices[0]?.message?.content ?? "";
    };

    const first = await run([]);
    try {
      return validate(JSON.parse(first));
    } catch (e) {
      const repaired = await run([
        { role: "assistant", content: first },
        {
          role: "user",
          content: `That was not valid JSON matching the required schema (${(e as Error).message}). Reply with ONLY corrected JSON, no prose.`,
        },
      ]);
      return validate(JSON.parse(repaired));
    }
  }

  /** Batch embeddings via Qwen text-embedding. */
  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = await this.withRetry("embed", () =>
      this.client.embeddings.create({ model: this.cfg.embedModel, input: texts }),
    );
    this.record(res.usage as { prompt_tokens?: number; total_tokens?: number });
    return res.data.map((d) => d.embedding as number[]);
  }
}
