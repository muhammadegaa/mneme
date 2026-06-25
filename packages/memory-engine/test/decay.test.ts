import { describe, it, expect } from "vitest";
import { isForgotten, planDecay, sameSlot, planContradictionResolution } from "../src/decay.js";
import type { Memory, MemoryInput } from "../src/types.js";

const MS_PER_DAY = 86_400_000;

function mem(over: Partial<Memory>): Memory {
  return {
    id: "m",
    text: "t",
    kind: "tech",
    subject: "dev",
    salience: 1,
    decayRate: 0.1,
    source: "s",
    embedding: [],
    createdAt: 0,
    lastAccessedAt: 0,
    accessCount: 0,
    reinforcements: 0,
    status: "active",
    ...over,
  };
}

describe("isForgotten / planDecay", () => {
  it("forgets a memory once effective salience drops below the floor", () => {
    const m = mem({ salience: 1, decayRate: 0.1 });
    // e^(-0.1 * day) < 0.05  ->  day > ~30
    expect(isForgotten(m, 20 * MS_PER_DAY, 0.05)).toBe(false);
    expect(isForgotten(m, 40 * MS_PER_DAY, 0.05)).toBe(true);
  });
  it("never forgets non-active memories", () => {
    const m = mem({ salience: 0.0001, status: "superseded" });
    expect(isForgotten(m, 999 * MS_PER_DAY, 0.05)).toBe(false);
  });
  it("planDecay collects exactly the sub-floor ids", () => {
    const fresh = mem({ id: "fresh", salience: 1, decayRate: 0.01 });
    const stale = mem({ id: "stale", salience: 0.2, decayRate: 0.5 });
    const plan = planDecay([fresh, stale], 30 * MS_PER_DAY, 0.05);
    expect(plan.forget).toEqual(["stale"]);
  });
});

describe("sameSlot", () => {
  it("requires matching subject AND defined matching predicate", () => {
    expect(sameSlot({ subject: "a", predicate: "p" }, { subject: "a", predicate: "p" })).toBe(true);
    expect(sameSlot({ subject: "a", predicate: "p" }, { subject: "a", predicate: "q" })).toBe(false);
    expect(sameSlot({ subject: "a" }, { subject: "a" })).toBe(false);
  });
});

describe("planContradictionResolution", () => {
  const incoming: MemoryInput = {
    text: "uses Zustand for state",
    kind: "tech",
    subject: "dev",
    predicate: "state_mgmt",
    salience: 0.9,
    decayRate: 0.01,
    source: "s2",
  };

  it("supersedes the older same-slot fact with different text", () => {
    const old = mem({ id: "old", text: "uses Redux for state", predicate: "state_mgmt" });
    const r = planContradictionResolution([old], incoming);
    expect(r.supersede).toEqual(["old"]);
  });
  it("does not supersede a different slot", () => {
    const other = mem({ id: "other", text: "prefers early-return", predicate: "control_flow" });
    expect(planContradictionResolution([other], incoming).supersede).toEqual([]);
  });
  it("treats identical text as a dedup (no supersede)", () => {
    const same = mem({ id: "same", text: incoming.text, predicate: "renewal_date" });
    expect(planContradictionResolution([same], incoming).supersede).toEqual([]);
  });
});
