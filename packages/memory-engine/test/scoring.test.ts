import { describe, it, expect } from "vitest";
import {
  cosineSimilarity,
  normalizedSemantic,
  recencyScore,
  effectiveSalience,
  estimateTokens,
  scoreMemory,
} from "../src/scoring.js";
import type { Memory, RetrievalWeights } from "../src/types.js";

const MS_PER_DAY = 86_400_000;

describe("cosineSimilarity", () => {
  it("is 1 for identical direction, 0 for orthogonal, -1 for opposite", () => {
    expect(cosineSimilarity([1, 0], [2, 0])).toBeCloseTo(1, 10);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 10);
  });
  it("is 0 for degenerate inputs", () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
    expect(cosineSimilarity([1], [1, 2])).toBe(0);
  });
});

describe("normalizedSemantic", () => {
  it("maps [-1,1] -> [0,1]", () => {
    expect(normalizedSemantic(-1)).toBe(0);
    expect(normalizedSemantic(0)).toBe(0.5);
    expect(normalizedSemantic(1)).toBe(1);
  });
});

describe("recencyScore", () => {
  it("is 1 at age 0 and exactly 0.5 at one half-life", () => {
    expect(recencyScore(0, 14)).toBe(1);
    expect(recencyScore(14 * MS_PER_DAY, 14)).toBeCloseTo(0.5, 10);
    expect(recencyScore(28 * MS_PER_DAY, 14)).toBeCloseTo(0.25, 10);
  });
  it("guards bad inputs", () => {
    expect(recencyScore(-5, 14)).toBe(1);
    expect(recencyScore(100, 0)).toBe(0);
  });
});

describe("effectiveSalience", () => {
  it("decays exponentially from the base value", () => {
    expect(effectiveSalience(1, 0.1, 0)).toBeCloseTo(1, 10);
    expect(effectiveSalience(1, 0.1, 10 * MS_PER_DAY)).toBeCloseTo(Math.exp(-1), 10);
    expect(effectiveSalience(0.8, 0, 999 * MS_PER_DAY)).toBeCloseTo(0.8, 10);
  });
});

describe("estimateTokens", () => {
  it("scales with length plus framing overhead", () => {
    expect(estimateTokens("")).toBe(4);
    expect(estimateTokens("abcd")).toBe(5);
  });
});

describe("scoreMemory composition", () => {
  const weights: RetrievalWeights = { semantic: 0.6, recency: 0.2, salience: 0.2, recencyHalfLifeDays: 14 };
  const base: Memory = {
    id: "m1",
    text: "prefers early-return over nested ifs",
    kind: "style",
    subject: "dev",
    predicate: "control_flow",
    salience: 1,
    decayRate: 0,
    source: "s1",
    embedding: [1, 0],
    createdAt: 0,
    lastAccessedAt: 0,
    accessCount: 0,
    reinforcements: 0,
    status: "active",
  };

  it("equals the exact weighted sum of its parts", () => {
    // query identical direction -> sem=1; age 0 -> rec=1; decayRate 0 -> effSal=1
    const s = scoreMemory(base, [1, 0], 0, weights);
    expect(s.breakdown.semantic).toBeCloseTo(1, 10);
    expect(s.breakdown.recency).toBeCloseTo(1, 10);
    expect(s.breakdown.effectiveSalience).toBeCloseTo(1, 10);
    expect(s.score).toBeCloseTo(0.6 * 1 + 0.2 * 1 + 0.2 * 1, 10);
  });

  it("penalizes age via recency and salience decay together", () => {
    const decaying: Memory = { ...base, decayRate: 0.1, lastAccessedAt: 0, createdAt: 0 };
    const now = 14 * MS_PER_DAY; // one recency half-life
    const s = scoreMemory(decaying, [1, 0], now, weights);
    expect(s.breakdown.recency).toBeCloseTo(0.5, 10);
    expect(s.breakdown.effectiveSalience).toBeCloseTo(Math.exp(-0.1 * 14), 10);
    const expected = 0.6 * 1 + 0.2 * 0.5 + 0.2 * Math.exp(-0.1 * 14);
    expect(s.score).toBeCloseTo(expected, 10);
  });
});
