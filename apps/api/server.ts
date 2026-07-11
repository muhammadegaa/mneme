/**
 * Engram API — the backend that runs on Alibaba Cloud. One Hono process serves
 * the engine over HTTP and the static Memory Inspector UI. Backend model is the
 * deterministic mock by default; set DASHSCOPE_API_KEY + ENGRAM_BACKEND=qwen to
 * run live Qwen. Deployable as-is to ECS / Function Compute.
 */
import { readFileSync, copyFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadEnv } from "../../scripts/load-env.js";
import {
  MemoryEngine,
  createStore,
  MockMentorModel,
  QwenMentorModel,
  QwenClient,
  configFromEnv,
  packMemories,
  effectiveSalience,
  recencyScore,
  DEFAULT_WEIGHTS,
  type Memory,
  type MemoryStore,
  type MentorModel,
  type CommitSource,
} from "@engram/memory-engine";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
loadEnv(resolve(ROOT, ".env")); // read DASHSCOPE_* for ENGRAM_BACKEND=qwen
const DAY = 86_400_000;
const NOW = Date.now();
const BUDGET = Number(process.env.ENGRAM_BUDGET ?? 64); // tight enough that packing visibly drops
// A mistake "seen once" — the salience a first, un-repeated write assigns (Qwen
// extract default ~0.5; mock uses 0.45). Used only to compute the honest
// counterfactual "what would this memory score if you'd never repeated it".
const QUIET_SALIENCE = 0.45;

function makeModel(): MentorModel {
  if (process.env.ENGRAM_BACKEND === "qwen") {
    return new QwenMentorModel(new QwenClient(configFromEnv()));
  }
  return new MockMentorModel();
}

interface Session {
  model: MentorModel;
  store: MemoryStore;
  engine: MemoryEngine;
  log: string[];
}

async function learnHistory(engine: MemoryEngine, model: MentorModel, log: string[]): Promise<void> {
  const commits = JSON.parse(readFileSync(resolve(ROOT, "bench/data/history.json"), "utf8")) as Array<CommitSource & { daysAgo: number }>;
  commits.sort((a, b) => b.daysAgo - a.daysAgo);
  for (const commit of commits) {
    const now = NOW - commit.daysAgo * DAY;
    for (const input of await model.extractFromCommit(commit, { defaultSubject: "dev" })) {
      const r = await engine.write(input, now);
      log.push(`${commit.sha.slice(0, 7)} ${input.kind} "${input.text}" → ${r.action}`);
    }
  }
}

async function seed(force = false): Promise<Session> {
  const model = makeModel();
  const store = createStore();
  const engine = new MemoryEngine(store, model, {});
  const log: string[] = [];
  // Cross-session: a persistent store (postgres/json) already has memories from
  // a prior run -> don't relearn. This is the "survives restart" proof on cloud.
  const existing = await store.all();
  if (force || existing.length === 0) {
    await learnHistory(engine, model, log);
  } else {
    log.push(`restored ${existing.length} memories from ${process.env.MEMORY_STORE ?? "memory"} store (cross-session)`);
  }
  return { model, store, engine, log };
}

// Reproducible demo: a committed golden seed (extracted once by live Qwen) is the
// canonical starting state. Restoring it is deterministic and instant — no live
// re-extraction, so the hero catch fires every time. `reset demo` restores it;
// a fresh clone restores it before the first boot.
const GOLDEN = resolve(ROOT, ".engram/golden.json");
const STORE_PATH = resolve(ROOT, process.env.ENGRAM_STORE ?? ".engram/memories.json");
function restoreGolden(): boolean {
  if ((process.env.MEMORY_STORE ?? "memory") !== "json" || !existsSync(GOLDEN)) return false;
  copyFileSync(GOLDEN, STORE_PATH);
  return true;
}
if (!existsSync(STORE_PATH)) restoreGolden(); // fresh clone → working demo, no relearn

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

// The one number that climbs from real work (WIN.md): repeat mistakes caught
// before they shipped. Incremented only when a review flags a warn grounded in
// a memory of a mistake the dev has made before. Persists across reviews.
let catches = 0;

const app = new Hono();
app.use("/api/*", cors());

app.get("/api/health", (c) => c.json({ ok: true, backend: session.model.backend }));

app.get("/api/state", async (c) => {
  const all = await session.store.all();
  return c.json({
    backend: session.model.backend,
    catches,
    memories: all.map(view),
    usage: session.model.usage(),
    learnLog: session.log,
  });
});

app.post("/api/reset", async (c) => {
  // Restore the golden seed deterministically (no live re-extraction) so the demo
  // returns to a known-good state where the hero fires. Falls back to a live
  // relearn only if no golden seed is present.
  session = restoreGolden() ? await seed(false) : await seed(true);
  catches = 0;
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
  const packedById = new Map(pack.packed.map((p) => [p.memory.id, p.memory]));
  const { comments } = await session.model.review({ diff, file: body.file, memories: pack.packed.map((p) => p.memory) });

  // A "catch" = a warn grounded in a memory of a mistake the dev has made before.
  const caught = comments.filter((cm) => {
    if (cm.severity !== "warn" || !cm.citedMemoryId) return false;
    return packedById.get(cm.citedMemoryId)?.kind === "mistake";
  });
  catches += caught.length;

  // Catching the bug again IS another occurrence of it — so REINFORCE the memory:
  // its salience climbs and the "seen N×" count rises, everywhere, from one source.
  // This is the hero mechanic made causal (not a cosmetic counter): repeat it, it
  // gets louder. Reset restores the golden seed, so each demo session starts fresh.
  for (const cm of caught) {
    const m = packedById.get(cm.citedMemoryId!)!;
    const reinforced = { ...m, reinforcements: m.reinforcements + 1, salience: Math.min(1, m.salience + 0.15), lastAccessedAt: NOW };
    await session.store.insert(reinforced);
    packedById.set(m.id, reinforced); // so the returned card shows the new count
  }

  // PACKING CAUSALITY (the differentiator): salience isn't a cosmetic tally — it's
  // the ranking value the knapsack packs on. Prove it honestly: take the memory
  // that grounded the catch, recompute its score as if it had been seen ONCE
  // (never reinforced, gone stale), and re-run the SAME deterministic knapsack.
  // If that quiet version gets dropped, the catch could not have fired — because a
  // grounded catch requires the memory to be in the packed set. Real numbers, real
  // packer; the counterfactual is computed, never asserted.
  let packingCausality: unknown = undefined;
  const cited = caught[0] ? scored.find((s) => s.memory.id === caught[0]!.citedMemoryId) : undefined;
  if (cited) {
    const m = cited.memory;
    const ageMs = NOW - m.createdAt;
    const quietScore =
      DEFAULT_WEIGHTS.semantic * cited.breakdown.semantic +
      DEFAULT_WEIGHTS.recency * recencyScore(ageMs, DEFAULT_WEIGHTS.recencyHalfLifeDays) +
      DEFAULT_WEIGHTS.salience * effectiveSalience(QUIET_SALIENCE, m.decayRate, ageMs);
    const quietScored = scored.map((s) => (s.memory.id === m.id ? { ...s, score: quietScore } : s));
    const quietPack = packMemories(quietScored, BUDGET);
    packingCausality = {
      citedId: m.id,
      packedScore: cited.score, // its ranking value reinforced (seen N×)
      quietScore, // its ranking value if seen once (salience 0.45) + stale
      tokens: cited.tokens, // same token cost either way — packer is token-aware, not a threshold
      quietSalience: QUIET_SALIENCE,
      quietWouldDrop: quietPack.dropped.some((d) => d.memory.id === m.id),
    };
  }

  // Attach the cited memory (with its "seen N×") to each comment for the catch card.
  const richComments = comments.map((cm) => ({
    ...cm,
    cited: cm.citedMemoryId ? view(packedById.get(cm.citedMemoryId)!) : undefined,
  }));

  return c.json({
    degraded,
    catches,
    newCatches: caught.length,
    budget: pack.budget,
    usedTokens: pack.usedTokens,
    packingCausality,
    comments: richComments,
    packed: pack.packed.map((p) => ({ ...view(p.memory), score: p.score, tokens: p.tokens, breakdown: p.breakdown })),
    dropped: pack.dropped.map((d) => ({ ...view(d.memory), score: d.score, tokens: d.tokens, reason: d.reason })),
  });
});

// Memory Inspector UI (single self-contained page).
app.get("/", (c) => c.html(readFileSync(resolve(__dirname, "../web/index.html"), "utf8")));

// FC_SERVER_PORT is injected by Function Compute custom-container; fall back to
// PORT (ECS/local). Bind 0.0.0.0 so the container is reachable.
const port = Number(process.env.FC_SERVER_PORT ?? process.env.PORT ?? 5273);
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" });
console.log(`◐ Engram API + UI on :${port}  (backend=${session.model.backend}, store=${process.env.MEMORY_STORE ?? "memory"})`);
