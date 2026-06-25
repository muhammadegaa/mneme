/**
 * Mneme API — the backend that runs on Alibaba Cloud. One Hono process serves
 * the engine over HTTP and the static Memory Inspector UI. Backend model is the
 * deterministic mock by default; set DASHSCOPE_API_KEY + MNEME_BACKEND=qwen to
 * run live Qwen. Deployable as-is to ECS / Function Compute.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  MemoryEngine,
  InMemoryStore,
  MockMentorModel,
  QwenMentorModel,
  QwenClient,
  configFromEnv,
  packMemories,
  effectiveSalience,
  recencyScore,
  DEFAULT_WEIGHTS,
  type Memory,
  type MentorModel,
  type CommitSource,
} from "@mneme/memory-engine";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const DAY = 86_400_000;
const NOW = Date.now();
const BUDGET = Number(process.env.MNEME_BUDGET ?? 64); // tight enough that packing visibly drops

function makeModel(): MentorModel {
  if (process.env.MNEME_BACKEND === "qwen") {
    return new QwenMentorModel(new QwenClient(configFromEnv()));
  }
  return new MockMentorModel();
}

interface Session {
  model: MentorModel;
  store: InMemoryStore;
  engine: MemoryEngine;
  log: string[];
}

async function seed(): Promise<Session> {
  const model = makeModel();
  const store = new InMemoryStore();
  const engine = new MemoryEngine(store, model, {});
  const log: string[] = [];
  const commits = JSON.parse(readFileSync(resolve(ROOT, "bench/data/history.json"), "utf8")) as Array<CommitSource & { daysAgo: number }>;
  commits.sort((a, b) => b.daysAgo - a.daysAgo);
  for (const commit of commits) {
    const now = NOW - commit.daysAgo * DAY;
    for (const input of await model.extractFromCommit(commit, { defaultSubject: "dev" })) {
      const r = await engine.write(input, now);
      log.push(`${commit.sha.slice(0, 7)} ${input.kind} "${input.text}" → ${r.action}`);
    }
  }
  return { model, store, engine, log };
}

let session: Session = await seed();

/** Shape a memory for the Inspector: include decayed salience + recency now. */
function view(m: Memory) {
  return {
    id: m.id,
    text: m.text,
    kind: m.kind,
    subject: m.subject,
    predicate: m.predicate,
    salience: m.salience,
    effectiveSalience: effectiveSalience(m.salience, m.decayRate, NOW - m.createdAt),
    recency: recencyScore(NOW - m.lastAccessedAt, DEFAULT_WEIGHTS.recencyHalfLifeDays),
    reinforcements: m.reinforcements,
    status: m.status,
    supersededBy: m.supersededBy,
    decayRate: m.decayRate,
    ageDays: Math.round((NOW - m.createdAt) / DAY),
  };
}

const app = new Hono();
app.use("/api/*", cors());

app.get("/api/health", (c) => c.json({ ok: true, backend: session.model.backend }));

app.get("/api/state", async (c) => {
  const all = await session.store.all();
  return c.json({
    backend: session.model.backend,
    memories: all.map(view),
    usage: session.model.usage(),
    learnLog: session.log,
  });
});

app.post("/api/reset", async (c) => {
  session = await seed();
  return c.json({ ok: true, count: (await session.store.all()).length });
});

app.post("/api/forget", async (c) => {
  const { forgotten } = await session.engine.runDecay(NOW);
  return c.json({ forgotten });
});

app.post("/api/review", async (c) => {
  const body = await c.req.json<{ diff: string; file?: string }>().catch(() => ({ diff: "" }));
  const diff = body.diff ?? "";
  if (!diff.trim()) return c.json({ error: "empty diff" }, 400);

  const { scored, degraded } = await session.engine.retrieve(diff, { now: NOW, limit: 50 });
  const pack = packMemories(scored, BUDGET);
  const { comments } = await session.model.review({ diff, file: body.file, memories: pack.packed.map((p) => p.memory) });

  return c.json({
    degraded,
    budget: pack.budget,
    usedTokens: pack.usedTokens,
    comments,
    packed: pack.packed.map((p) => ({ ...view(p.memory), score: p.score, tokens: p.tokens, breakdown: p.breakdown })),
    dropped: pack.dropped.map((d) => ({ ...view(d.memory), score: d.score, tokens: d.tokens, reason: d.reason })),
  });
});

// Memory Inspector UI (single self-contained page).
app.get("/", (c) => c.html(readFileSync(resolve(__dirname, "../web/index.html"), "utf8")));

const port = Number(process.env.PORT ?? 5273);
serve({ fetch: app.fetch, port });
console.log(`◐ Mneme API + UI on http://127.0.0.1:${port}  (backend=${session.model.backend})`);
