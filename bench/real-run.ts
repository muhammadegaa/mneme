/**
 * real-run — the honest "unseen repo" benchmark. Point Engram at a REAL repo it
 * has never seen, learn its last N commits (oldest-first, so recurrence and
 * supersession happen chronologically), and report what it actually found. No
 * planted probes, no cherry-picking: the numbers are whatever extraction yields.
 *
 *   tsx bench/real-run.ts <repoPath> [maxCommits] [--qwen] [--label name]
 *
 * Metrics (mistake-focused, since "catches repeat mistakes" is the claim):
 *   · mistakes            distinct mistake memories extracted
 *   · recurring           mistakes seen >=2x (reinforced) — the repeat-mistake signal
 *   · beliefs updated     memories superseded by a later, contradicting commit
 *   · held-out catch      review the NEWEST commit (held out of learning); did a
 *                         grounded mistake-catch fire against memory from the past?
 *
 * Live token usage is printed so the coupon cost is transparent. Results +
 * provenance (repo, commit range, backend) are written to bench/results/.
 */
import { writeFileSync, mkdirSync } from "node:fs";
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
  type MentorModel,
} from "../packages/memory-engine/src/index.js";
import { commitsFromRepo } from "./from-repo.js";

loadEnv();

const DAY = 86_400_000;
const NOW = Date.now();
const BUDGET = Number(process.env.ENGRAM_BUDGET ?? 2000);

const repo = process.argv[2];
const max = Number(process.argv.find((a, i) => i > 2 && /^\d+$/.test(a)) ?? 30);
const useQwen = process.argv.includes("--qwen");
const labelIdx = process.argv.indexOf("--label");
const label = labelIdx > -1 ? process.argv[labelIdx + 1]! : repo?.split("/").filter(Boolean).at(-1) ?? "repo";

if (!repo) {
  console.error("usage: tsx bench/real-run.ts <repoPath> [maxCommits] [--qwen] [--label name]");
  process.exit(1);
}

function makeModel(): MentorModel {
  if (useQwen) return new QwenMentorModel(new QwenClient(configFromEnv()));
  return new MockMentorModel();
}

async function main() {
  const model = makeModel();
  const commits = commitsFromRepo(repo!, max, NOW).sort((a, b) => b.daysAgo - a.daysAgo); // oldest first
  const heldOut = commits.at(-1)!; // newest commit — held out of learning, used for review
  const learnSet = commits.slice(0, -1);

  console.log(`\n◐ Engram real-repo benchmark · backend=${model.backend} · repo=${label}`);
  console.log(`  ${commits.length} commits (${commits.at(0)!.daysAgo}d…${heldOut.daysAgo}d ago) · learn ${learnSet.length}, hold out newest for review\n`);

  const store = new InMemoryStore();
  const engine = new MemoryEngine(store, model, {});
  const tally: Record<string, number> = { inserted: 0, reinforced: 0, superseding: 0, deduped: 0 };
  for (const commit of learnSet) {
    const now = NOW - commit.daysAgo * DAY;
    for (const input of await model.extractFromCommit(commit, { defaultSubject: "dev" })) {
      const r = await engine.write(input, now);
      tally[r.action] = (tally[r.action] ?? 0) + 1;
    }
  }

  const all = await store.all();
  const active = all.filter((m) => m.status === "active");
  const mistakes = active.filter((m) => m.kind === "mistake");
  const recurring = mistakes.filter((m) => m.reinforcements > 0);
  const superseded = all.filter((m) => m.status === "superseded");

  // Held-out review: does the newest commit trigger a grounded catch from the past?
  const { scored } = await engine.retrieve(heldOut.diff, { now: NOW, limit: 50 });
  const pack = packMemories(scored, BUDGET);
  const packedById = new Map(pack.packed.map((p) => [p.memory.id, p.memory]));
  const { comments } = await model.review({ diff: heldOut.diff, memories: pack.packed.map((p) => p.memory) });
  const caught = comments.filter((cm) => cm.severity === "warn" && cm.citedMemoryId && packedById.get(cm.citedMemoryId)?.kind === "mistake");

  const usage = model.usage();
  const rows = {
    repo: label,
    backend: model.backend,
    commitsLearned: learnSet.length,
    memories: active.length,
    mistakes: mistakes.length,
    recurringMistakes: recurring.length,
    beliefsSuperseded: superseded.length,
    heldOutSha: heldOut.sha,
    heldOutCatches: caught.length,
    usage,
  };

  console.log(`  memories extracted   ${active.length}`);
  console.log(`  mistake memories     ${mistakes.length}`);
  console.log(`  recurring (seen ≥2×) ${recurring.length}   ← the repeat-mistake signal`);
  console.log(`  beliefs superseded   ${superseded.length}`);
  console.log(`  held-out review      commit ${heldOut.sha} → ${caught.length} grounded catch(es)`);
  if (recurring.length) {
    console.log(`\n  recurring mistakes Engram learned from ${label} it had never seen:`);
    for (const m of recurring) console.log(`    ▲×${m.reinforcements}  ${m.text}`);
  }
  for (const cm of caught) console.log(`\n  held-out catch: ⚠ ${cm.message}\n    ↳ grounded in ${cm.citedMemoryId}`);
  if (model.backend === "qwen") console.log(`\n  qwen usage: ${JSON.stringify(usage)}  (coupon cost)`);

  mkdirSync(resolve("bench/results"), { recursive: true });
  writeFileSync(resolve(`bench/results/real-${label}.json`), JSON.stringify(rows, null, 2));
  console.log(`\n→ bench/results/real-${label}.json\n`);
}

main().catch((e) => {
  console.error("real-run failed:", e.message);
  process.exit(1);
});
