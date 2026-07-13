/**
 * demo-persist — proves the Track 1 requirement literally: memory that PERSISTS
 * and is RECALLED across sessions. Run in TWO separate processes:
 *
 *   npm run demo:persist            (runs `write` then `read` as two processes)
 *   tsx bench/demo-persist.ts write   session 1: learn + reinforce a mistake, exit
 *   tsx bench/demo-persist.ts read    session 2 (fresh process): recall it from disk
 *
 * Session 2 does NOT relearn — it opens the same on-disk store and the memory,
 * with its reinforcement count, is still there. That is cross-session recall.
 * Deterministic mock, zero credits.
 */
import { resolve } from "node:path";
import { rmSync } from "node:fs";
import { MemoryEngine, JsonFileStore, MockMentorModel } from "../packages/memory-engine/src/index.js";

const STORE = resolve(".engram/persist-demo.json");
const NOW = 1_700_000_000_000;
const DAY = 86_400_000;
const mode = process.argv[2];

const mistake = (n: number) => ({
  text: "forgets null/ok checks on API responses",
  kind: "mistake" as const,
  subject: "dev",
  predicate: "null_check",
  salience: 0.45,
  decayRate: 0.03,
  source: `commit${n}`,
});

async function write() {
  rmSync(STORE, { force: true }); // fresh start for the demo
  const engine = new MemoryEngine(new JsonFileStore(STORE), new MockMentorModel(), {});
  console.log(`\n◐ SESSION 1  (process ${process.pid})  —  learn + reinforce, then exit`);
  for (let i = 1; i <= 3; i++) {
    const r = await engine.write(mistake(i), NOW - (3 - i) * DAY);
    console.log(`  commit${i}: ${r.action}  →  "${r.memory.text}"  seen ${r.memory.reinforcements + 1}×`);
  }
  console.log(`  persisted to ${STORE}\n  (process exits — nothing kept in memory)\n`);
}

async function read() {
  // A brand-new process, a brand-new store object — it only reads the file.
  const store = new JsonFileStore(STORE);
  const all = (await store.all()).filter((m) => m.status === "active");
  console.log(`◐ SESSION 2  (process ${process.pid}, restarted)  —  recall from disk, NO relearn`);
  for (const m of all) console.log(`  recalled: "${m.text}"  [${m.kind}]  seen ${m.reinforcements + 1}×  (id ${m.id})`);
  const survived = all.some((m) => m.predicate === "null_check" && m.reinforcements === 2);
  console.log(`\n  ${survived ? "✓" : "✗"} the mistake and its reinforcement count (seen 3×) survived the restart — cross-session memory.\n`);
  if (!survived) process.exit(1);
}

(mode === "write" ? write() : mode === "read" ? read() : Promise.resolve(console.error("usage: demo-persist.ts write|read"))).catch((e) => {
  console.error("demo-persist failed:", e.message);
  process.exit(1);
});
