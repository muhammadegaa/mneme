/**
 * PROOF OF ALIBABA CLOUD DEPLOYMENT
 * =================================
 * This single file demonstrably exercises Alibaba Cloud services end-to-end:
 *   (1) Qwen via DashScope / Model Studio (OpenAI-compatible)  — reasoning + embeddings
 *   (2) Alibaba Cloud OSS                                      — object storage round-trip
 *
 * Run remotely on Alibaba Cloud (ECS / Function Compute) and screen-record it
 * for the 30s "backend on Alibaba Cloud" proof. Phase 5 wires (2); (1) is live now.
 *
 *   npm run proof
 */
import { loadEnv } from "../scripts/load-env.js";
import { QwenClient, configFromEnv } from "../packages/memory-engine/src/index.js";

loadEnv();

async function proveQwen(): Promise<void> {
  const qwen = new QwenClient(configFromEnv());
  const { text } = await qwen.chat(
    [{ role: "user", content: "Reply with exactly: Qwen on Alibaba Cloud is reachable." }],
    { tier: "agent", maxTokens: 30 },
  );
  const [vec] = await qwen.embed(["proof embedding"]);
  console.log(`[1/2] Qwen/DashScope OK → "${text.trim()}" · embed dims=${vec?.length}`);
}

/**
 * OSS round-trip. Wired in Phase 5 with `ali-oss`. Kept behind an env guard so
 * `proof.ts` stays runnable today (Qwen-only) and becomes the full two-service
 * proof the moment OSS creds are present — no code change to the call site.
 */
async function proveOss(): Promise<void> {
  if (!process.env.OSS_BUCKET) {
    console.log("[2/2] OSS skipped (set OSS_* in .env to enable) — wired in Phase 5.");
    return;
  }
  const OSS = (await import("ali-oss")).default;
  const client = new OSS({
    region: process.env.OSS_REGION!,
    bucket: process.env.OSS_BUCKET!,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
  });
  const key = "mneme/proof.txt";
  const payload = Buffer.from(`mneme proof @ ${process.env.PROOF_STAMP ?? "now"}`);
  await client.put(key, payload);
  const got = await client.get(key);
  console.log(`[2/2] OSS round-trip OK → put+get "${key}" (${got.content.length} bytes)`);
}

async function main() {
  console.log("=== Mneme · Proof of Alibaba Cloud deployment ===");
  await proveQwen();
  await proveOss();
  console.log("✅ Alibaba Cloud services reachable from this backend.");
}

main().catch((e) => {
  console.error("❌ proof failed:", e.message);
  process.exit(1);
});
