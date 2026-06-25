/**
 * Phase 0 acceptance test: prove a live round-trip to Qwen on Alibaba Cloud.
 *
 *   1) copy .env.example -> .env and set DASHSCOPE_API_KEY
 *   2) npm run hello
 *
 * Verifies: chat completion (qwen-plus), structured JSON output (qwen-turbo),
 * and embeddings (text-embedding-v3) — plus prints cumulative token usage.
 */
import { loadEnv } from "./load-env.js";
import { QwenClient, configFromEnv } from "../packages/memory-engine/src/index.js";

loadEnv();

async function main() {
  const cfg = configFromEnv();
  console.log(`→ endpoint: ${cfg.baseURL}`);
  console.log(`→ models: agent=${cfg.agentModel} cheap=${cfg.cheapModel} embed=${cfg.embedModel}\n`);
  const qwen = new QwenClient(cfg);

  console.log("1) chat (qwen-plus)…");
  const chat = await qwen.chat(
    [{ role: "user", content: "In one sentence, what is a persistent memory agent?" }],
    { tier: "agent", maxTokens: 80 },
  );
  console.log("   " + chat.text.trim() + "\n");

  console.log("2) structured output (qwen-turbo)…");
  const structured = await qwen.structured<{ memories: { text: string; kind: string }[] }>(
    [
      { role: "system", content: 'Extract durable memories. Reply JSON {"memories":[{"text","kind"}]}.' },
      { role: "user", content: "Hi! Just so you know, our team only takes calls on Tuesdays." },
    ],
    (raw) => {
      const o = raw as { memories?: unknown };
      if (!Array.isArray(o.memories)) throw new Error("missing memories[]");
      return o as { memories: { text: string; kind: string }[] };
    },
    { tier: "cheap" },
  );
  console.log("   " + JSON.stringify(structured.memories) + "\n");

  console.log("3) embeddings (text-embedding-v3)…");
  const [vec] = await qwen.embed(["Acme prefers email over phone calls"]);
  console.log(`   vector dims: ${vec?.length}\n`);

  const u = qwen.getUsage();
  console.log(`✅ all three calls succeeded. tokens: prompt=${u.promptTokens} completion=${u.completionTokens} total=${u.totalTokens} across ${u.calls} calls`);
}

main().catch((e) => {
  console.error("\n❌ hello-qwen failed:", e.message);
  console.error("   Check DASHSCOPE_API_KEY and DASHSCOPE_BASE_URL in .env (mainland vs -intl endpoint).");
  process.exit(1);
});
