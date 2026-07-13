/**
 * Engram MCP server — the production surface. Exposes the memory engine as tools
 * any MCP client (Claude Desktop, Cursor, Windsurf) can call, so Engram becomes a
 * coding agent's long-term memory of the developer: it learns your recurring
 * mistakes from commits and grounds a review of your next diff in a specific
 * memory. Unlike general chat-memory servers, this memory forgets one-off noise,
 * reinforces repeated mistakes, and packs the critical set under a token budget.
 *
 * Transport: stdio. Backend: deterministic mock by default; set ENGRAM_BACKEND=qwen
 * (+ DASHSCOPE_API_KEY) for live Qwen on Alibaba Cloud. Memory persists via the
 * store factory (MEMORY_STORE=json locally, =postgres/pgvector on Alibaba Cloud).
 */
import { readFileSync, existsSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
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
  isRepeatMistakeCatch,
  DEFAULT_WEIGHTS,
  type Memory,
  type MentorModel,
  type CommitSource,
} from "@engram/memory-engine";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
loadEnv(resolve(ROOT, ".env"));

const DAY = 86_400_000;
const BUDGET = Number(process.env.ENGRAM_BUDGET ?? 2000);
// Persist by default so memory survives across sessions (the whole point). The
// shared .env sets MEMORY_STORE=memory for the ephemeral demo; the MCP product
// must NOT be ephemeral, so force json locally (postgres/pgvector on Alibaba).
if (process.env.MEMORY_STORE !== "postgres") process.env.MEMORY_STORE = "json";
process.env.ENGRAM_STORE ??= resolve(ROOT, ".engram/mcp-memories.json");

function makeModel(): MentorModel {
  if (process.env.ENGRAM_BACKEND === "qwen") {
    // Fall back to mock rather than crash the server if the key is missing — a
    // client that copied the qwen config without a key still gets a working
    // (offline) MCP server instead of a connection failure.
    try {
      return new QwenMentorModel(new QwenClient(configFromEnv()));
    } catch (e) {
      console.error(`ENGRAM_BACKEND=qwen but ${(e as Error).message} — running on mock`);
    }
  }
  return new MockMentorModel();
}

// Free, deterministic seed: restore the frozen golden memory on a fresh json
// store BEFORE constructing it (JsonFileStore reads its file once, at construction).
// Never burns credits on startup; a fresh clone gets a working memory to review against.
const golden = resolve(ROOT, ".engram/golden.json");
if (process.env.MEMORY_STORE === "json" && !existsSync(process.env.ENGRAM_STORE!) && existsSync(golden)) {
  copyFileSync(golden, process.env.ENGRAM_STORE!);
}

const model = makeModel();
const store = createStore();
const engine = new MemoryEngine(store, model, {});

function view(m: Memory) {
  const ageMs = Date.now() - m.createdAt;
  return {
    id: m.id,
    text: m.text,
    kind: m.kind,
    salience: Number(m.salience.toFixed(2)),
    effectiveSalience: Number(effectiveSalience(m.salience, m.decayRate, ageMs).toFixed(2)),
    reinforcements: m.reinforcements,
    seen: m.reinforcements + 1,
    status: m.status,
  };
}

const server = new McpServer({ name: "engram", version: "0.1.0" });

// The hero tool: review a diff grounded in what Engram remembers about this dev.
server.tool(
  "engram_review",
  "Review a code diff grounded in the developer's own memories (their recurring mistakes, style, tech choices). Retrieves relevant memories, packs them under a token budget with a knapsack solver, and returns review comments each cited to a specific memory. A 'warn' cited to a mistake memory is a repeat mistake caught before it ships.",
  { diff: z.string().describe("the unified diff or code to review"), file: z.string().optional().describe("optional file path for context") },
  async ({ diff, file }) => {
    if (!diff.trim()) return { content: [{ type: "text", text: "empty diff" }], isError: true };
    const now = Date.now();
    const { scored } = await engine.retrieve(diff, { now, limit: 50 });
    const pack = packMemories(scored, BUDGET);
    const packedById = new Map(pack.packed.map((p) => [p.memory.id, p.memory]));
    const { comments } = await model.review({ diff, file, memories: pack.packed.map((p) => p.memory) });

    // A catch = a warn cited to a past-mistake memory AND grounded in the diff
    // (the flagged code is actually present). Hallucinated flags are dropped, not
    // counted or reinforced.
    const caught = comments.filter((cm) =>
      isRepeatMistakeCatch(cm, diff, cm.citedMemoryId ? packedById.get(cm.citedMemoryId) : undefined),
    );
    // Catching it again IS another occurrence -> reinforce, so it gets louder.
    for (const cm of caught) {
      const m = packedById.get(cm.citedMemoryId!)!;
      await store.insert({ ...m, reinforcements: m.reinforcements + 1, salience: Math.min(1, m.salience + 0.15), lastAccessedAt: now });
    }

    const lines = comments.map((cm) => {
      const cited = cm.citedMemoryId ? packedById.get(cm.citedMemoryId) : undefined;
      const tag = cm.severity === "warn" ? "⚠ WARN" : cm.severity === "praise" ? "✓ praise" : "· info";
      const ground = cited ? `\n    ↳ grounded in your memory "${cited.text}" (seen ${cited.reinforcements + 1}×)` : "";
      const fix = cm.fix ? `\n    ↳ fix: ${cm.fix}` : "";
      return `${tag}  ${cm.message}${ground}${fix}`;
    });
    const header =
      `Reviewed against ${pack.packed.length} of your memories (packed ${pack.usedTokens}/${BUDGET} tok, dropped ${pack.dropped.length}). ` +
      `backend=${model.backend}.` +
      (caught.length ? `\n\n${caught.length} repeat mistake${caught.length > 1 ? "s" : ""} caught before shipping — reinforced.` : "");
    return { content: [{ type: "text", text: `${header}\n\n${lines.join("\n") || "(clean — nothing flagged)"}` }] };
  },
);

// Recall: what does Engram remember that's relevant to this context?
server.tool(
  "engram_recall",
  "Recall the developer's memories most relevant to a query or code context, ranked by relevance, recency, and salience. Use before writing code to surface what Engram knows about how this developer works.",
  { query: z.string().describe("a question or code context to recall memories for"), limit: z.number().optional().describe("max memories to return (default 8)") },
  async ({ query, limit }) => {
    const { scored } = await engine.retrieve(query, { now: Date.now(), limit: 50 });
    const top = scored.slice(0, limit ?? 8).map((s) => ({ ...view(s.memory), score: Number(s.score.toFixed(2)) }));
    return { content: [{ type: "text", text: JSON.stringify(top, null, 2) }] };
  },
);

// Learn: grow the memory from a commit (extract -> reinforce/supersede/store).
server.tool(
  "engram_learn",
  "Learn from a commit: extract atomic memories (style, tech, mistake, project) from the message + diff and persist them. Repeated mistakes reinforce the same memory; contradictions supersede the old one. This is how Engram accumulates experience across sessions.",
  { message: z.string().describe("commit message"), diff: z.string().describe("commit diff"), sha: z.string().optional().describe("optional commit sha") },
  async ({ message, diff, sha }) => {
    const commit: CommitSource = { sha: sha ?? "adhoc", message, diff };
    const now = Date.now();
    const results: string[] = [];
    for (const input of await model.extractFromCommit(commit, { defaultSubject: "dev" })) {
      const r = await engine.write(input, now);
      results.push(`${r.action}: ${input.kind} "${input.text}"`);
    }
    return { content: [{ type: "text", text: results.length ? results.join("\n") : "(no memories extracted)" }] };
  },
);

// Inspect: the current memory, salience-ranked (the "what do you know about me").
server.tool(
  "engram_inspect",
  "List the developer's active memories, ranked by salience, with reinforcement counts. Shows what Engram currently remembers and how strongly.",
  {},
  async () => {
    const all = (await store.all()).filter((m) => m.status === "active").sort((a, b) => b.salience - a.salience);
    return { content: [{ type: "text", text: JSON.stringify({ backend: model.backend, count: all.length, memories: all.map(view) }, null, 2) }] };
  },
);

await server.connect(new StdioServerTransport());
