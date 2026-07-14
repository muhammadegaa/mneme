/**
 * demo-memory-catch — the catch a regex CANNOT make.
 *
 * Engram's 3 mistake signatures (null-check, empty-catch, var) are deterministic
 * and high-precision — but they can only ever catch those 3 shapes. This demo
 * shows the other half of the catch, the half that needs a model reading MEMORY:
 *
 *   1. Learn a real decision from history — the dev migrated this project from
 *      Redux to Zustand (the Zustand memory SUPERSEDES the Redux one; audit kept).
 *   2. Review a fresh diff that quietly reintroduces Redux (`createStore(`).
 *   3. No mistake signature fires (there's no var/empty-catch/missing-guard here).
 *      Yet the review flags it: "you're reintroducing Redux — you'd moved to
 *      Zustand (memory m_...)." Only reading the memory reveals that. It's still
 *      GROUNDED: the model must quote the real `createStore(` line from the diff,
 *      so it can't fabricate the catch.
 *
 * This is the "increasingly accurate across sessions" property made concrete: the
 * more decisions the memory holds, the more repeats the model can catch — beyond
 * anything a fixed regex set covers.
 *
 *   tsx bench/demo-memory-catch.ts [--qwen]
 *
 * Mock (free, deterministic) by default; --qwen runs the review on live Qwen.
 */
import { loadEnv } from "../scripts/load-env.js";
import {
  MemoryEngine,
  InMemoryStore,
  MockMentorModel,
  QwenMentorModel,
  QwenClient,
  configFromEnv,
  packMemories,
  classifyCatch,
  isRepeatMistakeCatch,
  detectMistakes,
  diffAddedText,
  type MentorModel,
  type CommitSource,
} from "../packages/memory-engine/src/index.js";

loadEnv();

const DAY = 86_400_000;
const NOW = Date.now();
const BUDGET = Number(process.env.ENGRAM_BUDGET ?? 2000);
const useQwen = process.argv.includes("--qwen");

// A small, honest history: Redux goes in, then the project migrates to Zustand.
const HISTORY: Array<{ daysAgo: number; commit: CommitSource }> = [
  {
    daysAgo: 40,
    commit: {
      sha: "a1e001",
      message: "feat: wire up global store",
      diff: `--- a/store.ts\n+++ b/store.ts\n@@ -0,0 +1,3 @@\n+import { createStore } from 'react-redux'\n+export const store = createStore(rootReducer)`,
    },
  },
  {
    daysAgo: 6,
    commit: {
      sha: "b2f0a7",
      message: "refactor: migrate state to Zustand, drop Redux",
      diff: `--- a/store.ts\n+++ b/store.ts\n@@ -1,3 +1,3 @@\n+import { create } from 'zustand'\n+export const useStore = create((set) => ({ count: 0 }))`,
    },
  },
];

// Your next diff: quietly brings Redux back. No mistake signature is in here.
const NEW_DIFF = `--- a/checkout/store.ts
+++ b/checkout/store.ts
@@ -4,2 +4,5 @@
+import { createStore } from 'react-redux'
+
+// quick store for the checkout island
+const store = createStore(checkoutReducer)`;

function makeModel(): MentorModel {
  if (useQwen) return new QwenMentorModel(new QwenClient(configFromEnv()));
  return new MockMentorModel();
}

async function main() {
  const model = makeModel();
  console.log(`\n◐ Engram — memory-grounded catch (the one a regex can't make) · backend=${model.backend}`);

  const store = new InMemoryStore();
  const engine = new MemoryEngine(store, model, {});
  for (const { daysAgo, commit } of HISTORY) {
    const now = NOW - daysAgo * DAY;
    for (const input of await model.extractFromCommit(commit, { defaultSubject: "dev" })) {
      const r = await engine.write(input, now);
      if (r.superseded.length) console.log(`  · "${input.text}" superseded ${r.superseded.length} older decision(s) — audit trail kept`);
    }
  }

  const all = await store.all();
  const active = all.filter((m) => m.status === "active" && m.predicate === "state_mgmt");
  const superseded = all.filter((m) => m.status === "superseded");
  console.log(`\n  what the memory holds now:`);
  for (const m of active) console.log(`    ✓ active     "${m.text}" (${m.id})`);
  for (const m of superseded) console.log(`    ⌫ superseded "${m.text}" (${m.id}) — kept for the audit trail`);

  console.log(`\n  your next diff (checkout/store.ts):`);
  for (const l of diffAddedText(NEW_DIFF).split("\n").filter(Boolean)) console.log(`    + ${l}`);

  // Prove the regexes are SILENT here — this is not one of the 3 mistake shapes.
  const sigHits = detectMistakes(diffAddedText(NEW_DIFF));
  console.log(`\n  deterministic mistake signatures firing on this diff: ${sigHits.length} ${sigHits.length ? "" : "← the regex is blind to this"}`);

  const { scored } = await engine.retrieve(NEW_DIFF, { now: NOW, limit: 50 });
  const pack = packMemories(scored, BUDGET);
  const packedById = new Map(pack.packed.map((p) => [p.memory.id, p.memory]));
  const { comments } = await model.review({ diff: NEW_DIFF, file: "checkout/store.ts", memories: pack.packed.map((p) => p.memory) });

  const citedOf = (cm: (typeof comments)[number]) => (cm.citedMemoryId ? packedById.get(cm.citedMemoryId) : undefined);
  const memoryCatches = comments.filter((cm) => citedOf(cm)?.kind !== "mistake" && classifyCatch(cm, NEW_DIFF, citedOf(cm)) === "memory");

  if (!memoryCatches.length) {
    console.log(`\n  (no memory-grounded catch fired)`);
    return;
  }
  for (const cm of memoryCatches) {
    const m = citedOf(cm)!;
    console.log(`\n  ⚠ CATCH — GROUNDED by your memory · JUDGED by ${model.backend === "qwen" ? "Qwen" : "the model"} (no signature, no regex):`);
    console.log(`     ${cm.message}`);
    console.log(`     ↳ grounded in memory "${m.text}" (${m.id})`);
    console.log(`     ↳ evidence quoted from the diff: ${JSON.stringify(cm.evidence ?? null)} — verified present, not asserted`);
    console.log(`     ↳ tier=${classifyCatch(cm, NEW_DIFF, m)} · is-mistake-catch=${isRepeatMistakeCatch(cm, NEW_DIFF, m)} (false — never reinforced as a mistake)`);
    if (cm.fix) console.log(`     ↳ fix: ${cm.fix}`);
  }
  console.log(`\n  → A regex can only ever catch its 3 shapes. This catch exists only because`);
  console.log(`    Qwen read the developer's own memory. More memory = more caught. That's the`);
  console.log(`    "increasingly accurate across sessions" property, made literal.`);
  if (model.backend === "qwen") console.log(`\n  qwen usage: ${JSON.stringify(model.usage())}`);
  console.log();
}

main().catch((e) => {
  console.error("demo-memory-catch failed:", e.message);
  process.exit(1);
});
