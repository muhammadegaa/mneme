import { describe, it, expect } from "vitest";
import { MockMentorModel } from "../src/model/mock-mentor.js";
import { classifyCatch, isRepeatMistakeCatch } from "../src/grounding.js";
import type { Memory } from "../src/types.js";

const model = new MockMentorModel();

async function mem(text: string, kind: Memory["kind"], predicate: string, salience = 0.7): Promise<Memory> {
  const [embedding] = await model.embed([text]);
  return {
    text, kind, predicate, salience, decayRate: 0.01, source: "test",
    id: `m_${predicate}`, embedding: embedding!, createdAt: 0, lastAccessedAt: 0,
    accessCount: 0, reinforcements: 0, status: "active",
  };
}

describe("MockMentorModel.review — memory-grounded catches (the regex can't make)", () => {
  const reintroduceRedux = `--- a/store.ts\n+++ b/store.ts\n@@ -1 +1,2 @@\n+import { createStore } from 'react-redux'\n+const store = createStore(r)`;

  it("flags reintroducing Redux when memory says the dev moved to Zustand — grounded, memory-tier", async () => {
    const zustand = await mem("uses Zustand for state management", "tech", "state_mgmt");
    const { comments } = await model.review({ diff: reintroduceRedux, file: "store.ts", memories: [zustand] });
    const warn = comments.find((c) => c.severity === "warn");
    expect(warn).toBeDefined();
    expect(warn!.citedMemoryId).toBe(zustand.id);
    expect(classifyCatch(warn!, reintroduceRedux, zustand)).toBe("memory");
    // It is NOT a mistake catch — no signature fires, so it never reinforces as one.
    expect(isRepeatMistakeCatch(warn!, reintroduceRedux, zustand)).toBe(false);
  });

  it("stays quiet (info, not warn) when the diff is CONSISTENT with the memory", async () => {
    const zustand = await mem("uses Zustand for state management", "tech", "state_mgmt");
    const consistent = `--- a/store.ts\n+++ b/store.ts\n@@ -1 +1,2 @@\n+import { create } from 'zustand'\n+export const useStore = create(() => ({}))`;
    const { comments } = await model.review({ diff: consistent, file: "store.ts", memories: [zustand] });
    expect(comments.every((c) => c.severity !== "warn")).toBe(true);
  });

  it("still produces the signature-tier catch for a real mistake (regression guard)", async () => {
    const varMistake = await mem("uses var instead of const/let", "mistake", "var_usage", 0.35);
    const diff = `--- a/x.js\n+++ b/x.js\n@@ -1 +1 @@\n+  var x = 1`;
    const { comments } = await model.review({ diff, file: "x.js", memories: [varMistake] });
    const warn = comments.find((c) => c.severity === "warn");
    expect(warn).toBeDefined();
    expect(classifyCatch(warn!, diff, varMistake)).toBe("signature");
    expect(isRepeatMistakeCatch(warn!, diff, varMistake)).toBe(true);
  });
});
