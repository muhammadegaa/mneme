import { describe, it, expect } from "vitest";
import { diffAddedText, isGroundedInDiff, isRepeatMistakeCatch } from "../src/grounding.js";
import { detectMistakes, signatureFires, mistakeSignature } from "../src/mistakes.js";
import { parseExtraction } from "../src/extract.js";
import type { ReviewComment } from "../src/model/mentor.js";

const preds = (code: string) => detectMistakes(diffAddedText(code)).map((m) => m.signature.predicate).sort();

describe("diffAddedText", () => {
  it("returns only added lines of a unified diff", () => {
    expect(diffAddedText("--- a\n+++ b\n@@ -1 +1,2 @@\n-old\n+new one\n+new two\n ctx")).toBe("new one\nnew two");
  });
  it("returns '' for a deletion-only diff (nothing added — not the removed/context lines)", () => {
    expect(diffAddedText("--- a\n+++ b\n@@ -1 +0,0 @@\n-var x = 1\n unchanged")).toBe("");
  });
  it("returns the whole text for a raw code snippet (no diff markers)", () => {
    expect(diffAddedText("const a = 1;\nreturn a;")).toBe("const a = 1;\nreturn a;");
  });
});

describe("mistake signatures (detection is grounded, not confabulated)", () => {
  it("null_check fires on an UNGUARDED fetch().json()", () => {
    expect(preds("+const r = await fetch(u)\n+const d = await r.json()\n+return d.x")).toContain("null_check");
  });
  it("null_check does NOT fire when the response is guarded (res.ok)", () => {
    expect(preds("+const r = await fetch(u)\n+if (!r.ok) throw new Error()\n+const d = await r.json()")).not.toContain("null_check");
  });
  it("var_usage fires on a real declaration but NOT on the word 'var' in a comment", () => {
    expect(preds("+  var x = 1")).toContain("var_usage");
    expect(preds("+// prefer const, avoid using var in new code")).not.toContain("var_usage");
  });
  it("error_handling catches both catch(e){} and binding-less catch {}", () => {
    expect(preds("+try { f() } catch (e) {}")).toContain("error_handling");
    expect(preds("+try { f() } catch {}")).toContain("error_handling");
  });
  it("finds nothing in clean code", () => {
    expect(preds("+const total = items.reduce((a,b)=>a+b, 0)")).toEqual([]);
  });
});

describe("isRepeatMistakeCatch (the review guard)", () => {
  const diff = "+  var x = 1";
  const cited = { kind: "mistake" as const, predicate: "var_usage" };
  const warn = (evidence?: string): ReviewComment => ({ severity: "warn", message: "uses var", citedMemoryId: "m1", evidence });

  it("counts a grounded, signature-matched catch", () => {
    expect(isRepeatMistakeCatch(warn("var x = 1"), diff, cited)).toBe(true);
  });
  it("rejects a warn with no evidence", () => {
    expect(isRepeatMistakeCatch(warn(undefined), diff, cited)).toBe(false);
  });
  it("rejects evidence that isn't in the diff (fabricated quote)", () => {
    expect(isRepeatMistakeCatch(warn("var y = 99"), diff, cited)).toBe(false);
  });
  it("rejects a real quote whose mistake signature isn't actually present (mischaracterization)", () => {
    const guarded = "+const r = await fetch(u)\n+if (!r.ok) throw\n+const d = await r.json()";
    const nullCite = { kind: "mistake" as const, predicate: "null_check" };
    expect(isRepeatMistakeCatch({ severity: "warn", message: "x", citedMemoryId: "m", evidence: "const d = await r.json()" }, guarded, nullCite)).toBe(false);
  });
  it("ignores non-warn or non-mistake comments", () => {
    expect(isRepeatMistakeCatch({ severity: "info", message: "x", citedMemoryId: "m1", evidence: "var x = 1" }, diff, cited)).toBe(false);
    expect(isRepeatMistakeCatch(warn("var x = 1"), diff, { kind: "tech", predicate: "var_usage" })).toBe(false);
  });
});

describe("parseExtraction gate (mistakes must be backed by real code)", () => {
  const raw = (predicate: string, text = "x") => ({ memories: [{ text, kind: "mistake", subject: "dev", predicate, salience: 0.6 }] });
  const mistakes = (r: unknown, code?: string) => parseExtraction(r, "sha", "dev", code).filter((m) => m.kind === "mistake");

  it("drops a model-proposed mistake on the commit path (detection is deterministic there)", () => {
    // groundCode present => the model's mistake proposals are dropped wholesale.
    expect(mistakes(raw("null_check", "async/await bug"), "const _DEMO = {}; function show(){}")).toHaveLength(0);
  });
  it("keeps a self-reported mistake from a turn (no groundCode)", () => {
    expect(mistakes(raw("null_check"), undefined)).toHaveLength(1);
  });
  it("keeps non-mistake memories regardless", () => {
    const tech = { memories: [{ text: "uses Zustand", kind: "tech", subject: "dev", predicate: "state_mgmt", salience: 0.7 }] };
    expect(parseExtraction(tech, "sha", "dev", "quiz code")).toHaveLength(1);
  });
});

describe("signature registry integrity", () => {
  it("no signature regex is global/sticky (shared regex lastIndex safety)", () => {
    for (const p of ["null_check", "error_handling", "var_usage"]) {
      const sig = mistakeSignature(p)!;
      expect(sig.re.global || sig.re.sticky).toBe(false);
      // fires twice in a row identically (no lastIndex drift)
      const code = p === "var_usage" ? "var x = 1" : p === "error_handling" ? "catch {}" : "fetch(u); await r.json()";
      expect(signatureFires(sig, code)).toBe(signatureFires(sig, code));
    }
  });
});
