/**
 * Pure, deterministic scoring functions — the ranking core of the engine.
 *
 * Nothing here touches IO, the clock, or randomness: `now` is always passed in.
 * That is what makes the ranking unit-testable to exact numbers (see test/scoring.test.ts).
 */

import type { Memory, ScoredMemory, RetrievalWeights } from "./types.js";

const MS_PER_DAY = 86_400_000;

/** Cosine similarity in [-1, 1]; returns 0 for degenerate (zero-norm) vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Map cosine [-1,1] -> [0,1] so it composes with the other [0,1] terms. */
export function normalizedSemantic(sim: number): number {
  return (sim + 1) / 2;
}

/**
 * Recency as exponential half-life decay in [0,1].
 * recency = 0.5 ^ (ageDays / halfLifeDays). Fresh = 1, one half-life = 0.5.
 */
export function recencyScore(ageMs: number, halfLifeDays: number): number {
  if (ageMs <= 0) return 1;
  if (halfLifeDays <= 0) return 0;
  const ageDays = ageMs / MS_PER_DAY;
  return Math.pow(0.5, ageDays / halfLifeDays);
}

/**
 * Salience after continuous time-decay: salience * e^(-decayRate * ageDays).
 * This is the same curve the forgetting job uses, so retrieval and forgetting agree.
 */
export function effectiveSalience(
  baseSalience: number,
  decayRate: number,
  ageMs: number,
): number {
  const ageDays = Math.max(0, ageMs) / MS_PER_DAY;
  return baseSalience * Math.exp(-decayRate * ageDays);
}

/** Rough token estimate for budgeting. ~4 chars/token + per-item framing overhead. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4) + 4;
}

/**
 * Score one memory against a query embedding.
 *
 *   score = w_sem * sem + w_rec * rec + w_sal * effSalience
 *
 * Recency uses lastAccessedAt (reinforcement): a memory retrieved recently
 * stays warm. Decay of salience uses createdAt (true age).
 */
export function scoreMemory(
  memory: Memory,
  queryEmbedding: number[],
  now: number,
  weights: RetrievalWeights,
): ScoredMemory {
  const sim = cosineSimilarity(queryEmbedding, memory.embedding);
  const semantic = normalizedSemantic(sim);

  const recency = recencyScore(now - memory.lastAccessedAt, weights.recencyHalfLifeDays);
  const effSal = effectiveSalience(memory.salience, memory.decayRate, now - memory.createdAt);

  const score =
    weights.semantic * semantic +
    weights.recency * recency +
    weights.salience * effSal;

  return {
    memory,
    score,
    breakdown: { semantic, recency, salience: memory.salience, effectiveSalience: effSal },
    tokens: estimateTokens(memory.text),
  };
}

/** Rank a set of memories; returns sorted desc by score. Pure. */
export function rankMemories(
  memories: Memory[],
  queryEmbedding: number[],
  now: number,
  weights: RetrievalWeights,
): ScoredMemory[] {
  return memories
    .map((m) => scoreMemory(m, queryEmbedding, now, weights))
    .sort((a, b) => b.score - a.score);
}
