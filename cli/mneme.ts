/**
 * mneme — headless coding-mentor CLI. Exercises the full memory pipeline:
 *   learn  <history.json>   walk commits -> extract -> reinforce/supersede -> store
 *   review <diff.txt>       retrieve -> knapsack-pack -> grounded review comments
 *   forget                  run the decay job; age memories out
 *   inspect                 dump active memories with salience + status
 *
 * Backend defaults to the deterministic mock (zero credits). Pass --qwen to use
 * live Qwen on Alibaba Cloud (requires DASHSCOPE_API_KEY). Memories persist to
 * .mneme/memories.json and survive restarts (cross-session).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "../scripts/load-env.js";
import {
  MemoryEngine,
  JsonFileStore,
  MockMentorModel,
  QwenMentorModel,
  QwenClient,
  configFromEnv,
  packMemories,
  type MentorModel,
  type Memory,
  type CommitSource,
} from "../packages/memory-engine/src/index.js";

loadEnv();

const DAY = 86_400_000;
const NOW = Date.now();
const STORE = process.env.MNEME_STORE ?? ".mneme/memories.json";
const BUDGET = Number(process.env.MNEME_BUDGET ?? 2000);

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  b: (s: string) => `\x1b[1m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  grn: (s: string) => `\x1b[32m${s}\x1b[0m`,
  ylw: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyn: (s: string) => `\x1b[36m${s}\x1b[0m`,
  vio: (s: string) => `\x1b[35m${s}\x1b[0m`,
};

const KIND_COLOR: Record<string, (s: string) => string> = {
  mistake: c.red, tech: c.cyn, style: c.grn, project: c.vio,
};

function bar(v: number, width = 16): string {
  const n = Math.round(v * width);
  return "█".repeat(n) + "░".repeat(width - n);
}

function makeModel(): MentorModel {
  if (process.argv.includes("--qwen")) {
    return new QwenMentorModel(new QwenClient(configFromEnv()));
  }
  return new MockMentorModel();
}

function engineFor(model: MentorModel) {
  return new MemoryEngine(new JsonFileStore(STORE), model, {});
}

async function learn(file: string) {
  const model = makeModel();
  const store = new JsonFileStore(STORE);
  const engine = new MemoryEngine(store, model, {});
  const commits = JSON.parse(readFileSync(resolve(file), "utf8")) as Array<CommitSource & { daysAgo: number }>;
  // oldest first, so reinforcement/supersession happen in chronological order.
  commits.sort((a, b) => b.daysAgo - a.daysAgo);

  console.log(c.b(`\n◐ mneme learn`) + c.dim(`  backend=${model.backend}  commits=${commits.length}\n`));
  const tally: Record<string, number> = { inserted: 0, reinforced: 0, superseding: 0, deduped: 0 };
  for (const commit of commits) {
    const now = NOW - commit.daysAgo * DAY;
    const inputs = await model.extractFromCommit(commit, { defaultSubject: "dev" });
    for (const input of inputs) {
      const r = await engine.write(input, now);
      tally[r.action] = (tally[r.action] ?? 0) + 1;
      const tag =
        r.action === "reinforced" ? c.red(`▲ reinforced ×${r.memory.reinforcements}`)
        : r.action === "superseding" ? c.vio(`⊳ supersedes ${r.superseded.join(",")}`)
        : r.action === "deduped" ? c.dim("• deduped")
        : c.grn("+ new");
      console.log(`  ${c.dim(commit.sha.slice(0, 7))} ${(KIND_COLOR[input.kind] ?? c.dim)(input.kind.padEnd(8))} ${input.text}  ${tag}`);
    }
  }
  console.log(c.dim(`\n  ${tally.inserted} new · ${tally.reinforced} reinforced · ${tally.superseding} superseded · ${tally.deduped} deduped`));
  console.log(c.dim(`  stored → ${STORE}\n`));
}

async function review(file: string) {
  const model = makeModel();
  const store = new JsonFileStore(STORE);
  const engine = new MemoryEngine(store, model, {});
  const diff = readFileSync(resolve(file), "utf8");

  const { scored } = await engine.retrieve(diff, { now: NOW });
  const pack = packMemories(scored, BUDGET);
  const { comments } = await model.review({ diff, memories: pack.packed.map((p) => p.memory) });

  console.log(c.b(`\n◐ mneme review`) + c.dim(`  backend=${model.backend}  budget=${BUDGET}t\n`));
  console.log(c.b("  Comments"));
  if (comments.length === 0) console.log(c.dim("    (clean — nothing flagged)"));
  for (const cm of comments) {
    const sev = cm.severity === "warn" ? c.red("⚠ warn") : cm.severity === "praise" ? c.grn("✓ praise") : c.cyn("• info");
    console.log(`    ${sev}  ${cm.message}`);
    if (cm.citedMemoryId) console.log(c.dim(`           ↳ grounded in ${cm.citedMemoryId}`));
  }

  console.log(c.b(`\n  Memory Inspector`) + c.dim(`  packed ${pack.usedTokens}/${BUDGET}t · ${pack.packed.length} packed · ${pack.dropped.length} dropped`));
  for (const p of pack.packed) {
    const col = KIND_COLOR[p.memory.kind] ?? c.dim;
    console.log(`    ${c.grn("●")} ${col(p.memory.kind.padEnd(8))} ${bar(p.memory.salience)} ${p.memory.salience.toFixed(2)}  ${p.memory.text}  ${c.dim(`score=${p.score.toFixed(2)} ${p.tokens}t`)}`);
  }
  for (const d of pack.dropped) {
    console.log(c.dim(`    ○ ${d.memory.kind.padEnd(8)} ${bar(d.memory.salience)} ${d.memory.salience.toFixed(2)}  ${d.memory.text}  (${d.reason})`));
  }
  console.log("");
}

async function forget() {
  const model = makeModel();
  const engine = engineFor(model);
  const { forgotten } = await engine.runDecay(NOW);
  console.log(c.b(`\n◐ mneme forget`) + c.dim(`  floor decay job\n`));
  console.log(forgotten.length ? c.ylw(`  forgot ${forgotten.length}: ${forgotten.join(", ")}`) : c.dim("  nothing below the floor"));
  console.log("");
}

async function inspect() {
  const store = new JsonFileStore(STORE);
  const all = (await store.all()).filter((m) => m.status === "active").sort((a, b) => b.salience - a.salience);
  console.log(c.b(`\n◐ mneme inspect`) + c.dim(`  ${all.length} active memories\n`));
  for (const m of all) {
    const col = KIND_COLOR[m.kind] ?? c.dim;
    const rein = m.reinforcements > 0 ? c.red(` ▲×${m.reinforcements}`) : "";
    console.log(`  ${col(m.kind.padEnd(8))} ${bar(m.salience)} ${m.salience.toFixed(2)}${rein}  ${m.text}  ${c.dim(m.id)}`);
  }
  const superseded = (await store.all()).filter((m) => m.status === "superseded");
  if (superseded.length) {
    console.log(c.dim(`\n  audit trail (superseded):`));
    for (const m of superseded) console.log(c.dim(`    ⊘ ${m.text}  → ${m.supersededBy}`));
  }
  console.log("");
}

async function main() {
  const cmd = process.argv[2];
  const arg = process.argv.find((a, i) => i > 2 && !a.startsWith("--"));
  switch (cmd) {
    case "learn": return learn(arg ?? "bench/data/history.json");
    case "review": return review(arg ?? "bench/data/review-diff.txt");
    case "forget": return forget();
    case "inspect": return inspect();
    default:
      console.log("usage: mneme <learn|review|forget|inspect> [file] [--qwen]");
  }
}

main().catch((e) => {
  console.error(c.red("error: ") + e.message);
  process.exit(1);
});
