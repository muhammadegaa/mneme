/**
 * scale benchmark — where the 0/1 knapsack packer earns its keep.
 *
 * The main A/B/B+/C benchmark runs on a handful of memories, so forgetting is
 * the whole story and greedy top-k ties Engram. That is honest — and it invites
 * the fair question: "then why the knapsack?" Answer: at scale, with MANY
 * memories of VARIED token cost and a budget that actually binds, greedy top-k
 * (take highest-score until full) makes locally-greedy choices that leave value
 * — and the *relevant* memory — on the table. The 0/1 knapsack packs the optimal
 * set under the budget, so it recalls a memory greedy drops.
 *
 * This is a deterministic, self-contained demonstration (no Qwen, no network):
 * a crafted-but-realistic candidate set where the two packers diverge.
 *
 *   tsx bench/scale.ts   (npm run bench:scale)
 */
import { packMemories, type ScoredMemory, type Memory } from "../packages/memory-engine/src/index.js";

const BUDGET = 320;

/** Minimal ScoredMemory with a set score + token cost (packing only depends on these). */
function cand(id: string, text: string, score: number, tokens: number, gold = false): ScoredMemory & { gold?: boolean } {
  const memory = { id, text, kind: "mistake", subject: "dev", predicate: id, salience: score, decayRate: 0.03, source: "", embedding: [], createdAt: 0, lastAccessedAt: 0, accessCount: 0, reinforcements: 0, status: "active" } as Memory;
  return { memory, score, tokens, breakdown: { semantic: score, recency: 0, salience: score, effectiveSalience: score }, gold };
}

// A realistic packed-candidate set after retrieval: a wide, verbose "context dump"
// memory scores highest but is huge; several tighter, high-value memories — including
// the GOLD one truly relevant to this diff — score a touch lower but are cheap.
const candidates = [
  cand("big_context", "long project-context note (verbose, marginally relevant)", 0.64, 300),
  cand("gold_mistake", "forgets null/ok checks on API responses  ← relevant to THIS diff", 0.60, 160, true),
  cand("tight_style", "prefers early-return over nested conditionals", 0.58, 150),
  cand("noise_a", "tried Bun once", 0.20, 30),
  cand("noise_b", "misc scratch note", 0.18, 25),
];

/** Greedy top-k = B+'s packer: sort by score desc, take while it fits (status-blind to token cost). */
function greedyPack(cands: ScoredMemory[], budget: number) {
  const packed: ScoredMemory[] = [];
  let used = 0;
  for (const c of [...cands].sort((a, b) => b.score - a.score)) {
    if (used + c.tokens <= budget) { packed.push(c); used += c.tokens; }
  }
  return { packed, used, value: packed.reduce((s, c) => s + c.score, 0) };
}

const gold = candidates.find((c) => (c as any).gold)!;
const greedy = greedyPack(candidates, BUDGET);
const knap = packMemories(candidates, BUDGET);
const knapValue = knap.packed.reduce((s, c) => s + c.score, 0);
const has = (set: ScoredMemory[]) => set.some((c) => c.memory.id === gold.memory.id);

const money = (n: number) => n.toFixed(2);
console.log(`\n◐ Engram scale benchmark — knapsack vs greedy top-k · budget=${BUDGET} tokens · ${candidates.length} candidates\n`);
console.log(`  the GOLD memory (relevant to the diff): "${gold.memory.text}"  [score ${money(gold.score)}, ${gold.tokens} tok]\n`);
console.log(`  B+  greedy top-k  → packed ${greedy.packed.length} (${greedy.used}/${BUDGET} tok) · total value ${money(greedy.value)} · gold recalled: ${has(greedy.packed) ? "YES" : "NO ✗"}`);
console.log(`      kept: ${greedy.packed.map((c) => c.memory.id).join(", ")}`);
console.log(`  C   Engram knapsack → packed ${knap.packed.length} (${knap.usedTokens}/${BUDGET} tok) · total value ${money(knapValue)} · gold recalled: ${has(knap.packed) ? "YES" : "NO ✗"}`);
console.log(`      kept: ${knap.packed.map((c) => c.memory.id).join(", ")}`);

const win = !has(greedy.packed) && has(knap.packed) && knapValue > greedy.value;
console.log(`\n  ${win ? "✓" : "•"} Greedy spent the budget on the biggest-scoring memory and DROPPED the relevant one.`);
console.log(`    The knapsack packed +${money(knapValue - greedy.value)} more total value AND recalled the gold memory greedy missed —`);
console.log(`    the packer's payoff shows up exactly when the budget binds and token costs vary. This is why C > B+ at scale.\n`);
if (!win) { console.error("scale benchmark did not demonstrate the win — check the candidate set"); process.exit(1); }
