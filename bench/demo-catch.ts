/**
 * demo-catch — the full loop, on demand, honest and reproducible.
 *
 * Learns a REAL repo's history (default: codehere, which genuinely uses `var`),
 * then reviews a fresh diff that re-commits that same recurring mistake and shows
 * the catch: grounded in a specific memory, signature-verified in the diff, with
 * the "you've shipped this N×" count from real reinforcement. Nothing planted —
 * the memory is learned from the repo, the mistake in the diff is a real instance
 * of a pattern the dev actually repeats.
 *
 *   tsx bench/demo-catch.ts [repoPath] [--qwen]
 *
 * Runs on the free deterministic mock by default (mistake detection is
 * deterministic in both backends, so the catch is identical); pass --qwen to run
 * the review narration on live Qwen.
 */
import { resolve } from "node:path";
import { loadEnv } from "../scripts/load-env.js";
import {
  MemoryEngine,
  InMemoryStore,
  MockMentorModel,
  QwenMentorModel,
  QwenClient,
  configFromEnv,
  packMemories,
  isRepeatMistakeCatch,
  isGroundedInDiff,
  type MentorModel,
} from "../packages/memory-engine/src/index.js";
import { commitsFromRepo } from "./from-repo.js";

loadEnv();

const DAY = 86_400_000;
const NOW = Date.now();
const BUDGET = Number(process.env.ENGRAM_BUDGET ?? 2000);
const repo = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : resolve("../codehere");
const useQwen = process.argv.includes("--qwen");

// A fresh diff that re-commits the recurring mistake (`var`) — a realistic new
// change in the same style the repo already ships. This is the "your next diff".
const NEW_DIFF = `--- a/layout.js
+++ b/layout.js
@@ -12,3 +12,8 @@
+function computeLayout(node) {
+  var width = node.offsetWidth;
+  var rows = Math.ceil(width / 120);
+  return rows;
+}`;

function makeModel(): MentorModel {
  if (useQwen) return new QwenMentorModel(new QwenClient(configFromEnv()));
  return new MockMentorModel();
}

async function main() {
  const model = makeModel();
  const commits = commitsFromRepo(repo, 29, NOW).sort((a, b) => b.daysAgo - a.daysAgo);
  console.log(`\n◐ Engram — held-out catch demo · repo=${repo.split("/").filter(Boolean).at(-1)} · backend=${model.backend}`);

  const store = new InMemoryStore();
  const engine = new MemoryEngine(store, model, {});
  for (const commit of commits) {
    const now = NOW - commit.daysAgo * DAY;
    try {
      for (const input of await model.extractFromCommit(commit, { defaultSubject: "dev" })) await engine.write(input, now);
    } catch {
      /* best-effort per commit */
    }
  }

  const mistakes = (await store.all()).filter((m) => m.status === "active" && m.kind === "mistake");
  console.log(`  learned ${commits.length} commits → ${mistakes.length} mistake memories:`);
  for (const m of mistakes) console.log(`    · "${m.text}" seen ${m.reinforcements + 1}× (${m.id})`);

  console.log(`\n  your next diff (layout.js):`);
  for (const l of NEW_DIFF.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++"))) console.log(`    ${l}`);

  const { scored } = await engine.retrieve(NEW_DIFF, { now: NOW, limit: 50 });
  const pack = packMemories(scored, BUDGET);
  const packedById = new Map(pack.packed.map((p) => [p.memory.id, p.memory]));
  const { comments } = await model.review({ diff: NEW_DIFF, file: "layout.js", memories: pack.packed.map((p) => p.memory) });

  const caught = comments.filter((cm) => isRepeatMistakeCatch(cm, NEW_DIFF, cm.citedMemoryId ? packedById.get(cm.citedMemoryId) : undefined));
  if (!caught.length) {
    console.log(`\n  (no grounded catch — the diff did not re-commit a learned mistake)`);
    return;
  }
  for (const cm of caught) {
    const m = packedById.get(cm.citedMemoryId!)!;
    console.log(`\n  ⚠ CATCH — grounded + signature-verified:`);
    console.log(`     ${cm.message}`);
    console.log(`     ↳ grounded in your memory "${m.text}" (seen ${m.reinforcements + 1}× in this repo's history)`);
    console.log(`     ↳ evidence quoted from the diff: ${JSON.stringify(cm.evidence ?? null)}`);
    console.log(`     ↳ grounded=${isGroundedInDiff(cm, NEW_DIFF)} — the flagged code is really in the diff, not asserted`);
  }
  if (model.backend === "qwen") console.log(`\n  qwen usage: ${JSON.stringify(model.usage())}`);
  console.log();
}

main().catch((e) => {
  console.error("demo-catch failed:", e.message);
  process.exit(1);
});
