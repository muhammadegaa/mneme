import { describe, it, expect } from "vitest";
import { packMemories } from "../src/packing.js";
import type { ScoredMemory, Memory } from "../src/types.js";

function sm(id: string, score: number, tokens: number): ScoredMemory {
  const memory = { id, text: id, tokens } as unknown as Memory;
  return {
    memory,
    score,
    tokens,
    breakdown: { semantic: 0, recency: 0, salience: 0, effectiveSalience: 0 },
  };
}

describe("packMemories (0/1 knapsack)", () => {
  it("beats greedy: drops one high-value-but-fat item for two that sum higher", () => {
    // budget 300. Greedy-by-score takes A(value 10, 300t) and stops.
    // Optimal takes B+C (value 6+6=12, 150+150=300t).
    const items = [sm("A", 10, 300), sm("B", 6, 150), sm("C", 6, 150)];
    const r = packMemories(items, 300);
    const ids = r.packed.map((p) => p.memory.id).sort();
    expect(ids).toEqual(["B", "C"]);
    expect(r.usedTokens).toBe(300);
    expect(r.dropped.find((d) => d.memory.id === "A")?.reason).toBe("displaced_by_higher_value_set");
  });

  it("respects the budget exactly and never overflows", () => {
    const items = [sm("A", 5, 120), sm("B", 4, 130), sm("C", 3, 90)];
    const r = packMemories(items, 200);
    expect(r.usedTokens).toBeLessThanOrEqual(200);
  });

  it("flags items larger than the whole budget", () => {
    const items = [sm("big", 100, 5000), sm("ok", 1, 50)];
    const r = packMemories(items, 100);
    expect(r.packed.map((p) => p.memory.id)).toEqual(["ok"]);
    expect(r.dropped.find((d) => d.memory.id === "big")?.reason).toBe("too_large_for_budget");
  });

  it("excludes non-positive value items", () => {
    const items = [sm("good", 5, 50), sm("zero", 0, 10), sm("neg", -2, 10)];
    const r = packMemories(items, 1000);
    const ids = r.packed.map((p) => p.memory.id);
    expect(ids).toContain("good");
    expect(ids).not.toContain("zero");
    expect(ids).not.toContain("neg");
  });

  it("packs everything when the budget is ample", () => {
    const items = [sm("A", 3, 10), sm("B", 2, 10), sm("C", 1, 10)];
    const r = packMemories(items, 1000);
    expect(r.packed).toHaveLength(3);
    expect(r.dropped).toHaveLength(0);
  });
});
