import { describe, it, expect } from "vitest";
import { MemoryEngine, type Embedder } from "../src/engine.js";
import { InMemoryStore } from "../src/store/memory-store.js";
import type { MemoryInput } from "../src/types.js";

/** Deterministic bag-of-words embedder: identical text -> identical vector. */
class FakeEmbedder implements Embedder {
  private readonly D = 64;
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.vec(t));
  }
  private vec(text: string): number[] {
    const v = new Array<number>(this.D).fill(0);
    for (const tok of text.toLowerCase().split(/\W+/).filter(Boolean)) {
      let h = 0;
      for (let i = 0; i < tok.length; i++) h = (h * 31 + tok.charCodeAt(i)) >>> 0;
      v[h % this.D]! += 1;
    }
    return v;
  }
}

function input(over: Partial<MemoryInput> & { text: string }): MemoryInput {
  return {
    kind: "fact",
    subject: "acme",
    salience: 0.8,
    decayRate: 0.01,
    source: "test",
    ...over,
  };
}

let n = 0;
const idGen = () => `id_${n++}`;

function freshEngine() {
  n = 0;
  const store = new InMemoryStore();
  const engine = new MemoryEngine(store, new FakeEmbedder(), { idGen, dedupeThreshold: 0.92 });
  return { store, engine };
}

describe("write path", () => {
  it("inserts a new memory", async () => {
    const { engine } = freshEngine();
    const r = await engine.write(input({ text: "Acme prefers email", predicate: "contact_channel" }), 0);
    expect(r.action).toBe("inserted");
    expect(r.memory.id).toBe("id_0");
  });

  it("dedupes an identical same-slot memory by reinforcing salience", async () => {
    const { engine, store } = freshEngine();
    await engine.write(input({ text: "Acme prefers email", predicate: "contact_channel", salience: 0.5 }), 0);
    const r = await engine.write(input({ text: "Acme prefers email", predicate: "contact_channel", salience: 0.5 }), 1000);
    expect(r.action).toBe("deduped");
    const all = (await store.all()).filter((m) => m.status === "active");
    expect(all).toHaveLength(1);
    expect(all[0]!.salience).toBeCloseTo(0.6, 10); // +0.1 reinforcement
  });

  it("supersedes the old fact when a new one fills the same slot (audit trail kept)", async () => {
    const { engine, store } = freshEngine();
    await engine.write(input({ text: "Acme renews in Jan 2027", predicate: "renewal_date" }), 0);
    const r = await engine.write(input({ text: "Acme renews in March 2027", predicate: "renewal_date" }), 1000);
    expect(r.action).toBe("superseding");
    expect(r.superseded).toHaveLength(1);
    const all = await store.all();
    const old = all.find((m) => m.text.includes("Jan"))!;
    expect(old.status).toBe("superseded");
    expect(old.supersededBy).toBe(r.memory.id);
    const active = all.filter((m) => m.status === "active");
    expect(active).toHaveLength(1);
    expect(active[0]!.text).toContain("March");
  });
});

describe("retrieval + packing", () => {
  it("ranks the semantically matching memory first", async () => {
    const { engine } = freshEngine();
    await engine.write(input({ text: "Acme prefers email over phone calls", predicate: "contact_channel" }), 0);
    await engine.write(input({ text: "Acme office is in Berlin", predicate: "location" }), 0);
    const { scored } = await engine.retrieve("how should I contact Acme by email", { now: 0, subject: "acme" });
    expect(scored[0]!.memory.text).toContain("email");
  });

  it("packs under a tight token budget and reports what dropped", async () => {
    const { engine } = freshEngine();
    for (let i = 0; i < 5; i++) {
      await engine.write(input({ text: `Acme fact number ${i} about contracts and email`, predicate: `p${i}` }), 0);
    }
    const { pack } = await engine.pack("Acme contract email", 40, { now: 0, subject: "acme" });
    expect(pack.usedTokens).toBeLessThanOrEqual(40);
    expect(pack.packed.length + pack.dropped.length).toBe(5);
  });
});

describe("forgetting job", () => {
  it("ages out a low-salience fast-decaying memory across sessions", async () => {
    const { engine, store } = freshEngine();
    await engine.write(input({ text: "passing remark", salience: 0.2, decayRate: 0.5, predicate: undefined }), 0);
    await engine.write(input({ text: "Acme renews in March", salience: 0.95, decayRate: 0.01, predicate: "renewal_date" }), 0);
    const DAY = 86_400_000;
    const { forgotten } = await engine.runDecay(30 * DAY, 0.05);
    expect(forgotten).toHaveLength(1);
    const active = (await store.all()).filter((m) => m.status === "active");
    expect(active).toHaveLength(1);
    expect(active[0]!.text).toContain("renews");
  });
});
