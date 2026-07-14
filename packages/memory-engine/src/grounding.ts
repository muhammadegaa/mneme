/**
 * DIFF-GROUNDING GUARD.
 *
 * A "catch" is a review comment that warns about a repeat mistake and cites the
 * memory of it. Counting/reinforcing a catch is only honest if the flagged code
 * is ACTUALLY in the diff — otherwise a model that hallucinates a mistake it
 * never saw (observed live: Qwen flagged "uses var" on a diff with no `var`)
 * inflates the number and reinforces a memory off nothing.
 *
 * The guard requires every warn to quote its offending code (`evidence`) and
 * verifies that quote appears in the code under review. It is deliberately
 * conservative and honest about scope: it proves the flagged code EXISTS in the
 * diff, not that the judgment about it is correct. No evidence => not grounded.
 */
import type { MemoryKind } from "./types.js";
import type { ReviewComment } from "./model/mentor.js";
import { mistakeSignature, signatureFires } from "./mistakes.js";

/**
 * The added ("+") lines of a unified diff, or the whole text when it isn't a
 * diff (e.g. a raw "review this" snippet). This is the code actually under
 * review — the surface a catch must be grounded in. Shared with the mock model
 * so extraction and grounding judge the exact same lines.
 */
export function diffAddedText(diff: string): string {
  const lines = diff.split("\n");
  const added = lines.filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1));
  if (added.length) return added.join("\n");
  // No added lines. If this is a unified diff (hunk headers, file markers, or
  // removed lines), there is genuinely nothing added — do NOT fall back to
  // removed/context lines, or removing a mistake would count as committing one.
  const looksLikeDiff = lines.some((l) => /^(@@|diff --git |--- |\+\+\+ |-)/.test(l));
  return looksLikeDiff ? "" : diff;
}

/** Collapse whitespace so a quote survives indentation/reflow differences. */
const norm = (s: string) => s.replace(/^\+/, "").replace(/\s+/g, " ").trim();

/**
 * True when the comment's cited code (`evidence`) is present in the diff's added
 * lines. Missing or too-short evidence is treated as ungrounded — a catch must
 * point at real code, not assert one.
 */
export function isGroundedInDiff(comment: ReviewComment, diff: string): boolean {
  const evidence = norm(comment.evidence ?? "");
  if (evidence.length < 4) return false;
  return norm(diffAddedText(diff)).includes(evidence);
}

/**
 * What grounds a catch — its trust tier. Every catch is grounded (the model
 * quoted real code from the diff); the tier says by WHAT:
 *  - "signature": a known mistake class whose deterministic regex genuinely
 *    fires in the diff. Highest precision — the pattern is provably present, so
 *    it can't be a mischaracterization. This is the regex-grounded core.
 *  - "memory": the diff repeats or contradicts a cited memory of the developer's
 *    OWN style/tech/project (or a self-reported mistake with no signature). This
 *    is the catch a regex CANNOT make — the model recognizing a repeat of THIS
 *    developer's history — and the verbatim evidence quote is what keeps it
 *    honest: the offending line must actually be in the diff.
 */
export type CatchTier = "signature" | "memory";

/**
 * Classify a review comment as a real catch and at what tier, or null if it
 * isn't one. Shared by the API, the MCP server, and the benchmark so "what
 * counts as a catch" has exactly one definition.
 *
 * A catch is a `warn` that cites a real memory AND is grounded (the model quoted
 * offending code that is actually in the diff). A known mistake class must also
 * have its signature genuinely fire — requiring the pattern to appear rejects a
 * model that quotes a real, innocuous line and mislabels it. Everything else
 * grounded by a cited memory + a verbatim quote is a "memory"-tier catch.
 */
export function classifyCatch(
  comment: ReviewComment,
  diff: string,
  cited: { kind: MemoryKind; predicate?: string } | undefined,
): CatchTier | null {
  if (comment.severity !== "warn" || !comment.citedMemoryId || !cited) return null;
  if (!isGroundedInDiff(comment, diff)) return null;
  if (cited.kind === "mistake") {
    const sig = mistakeSignature(cited.predicate);
    if (sig) return signatureFires(sig, diffAddedText(diff)) ? "signature" : null;
    // Unknown/self-reported mistake class: grounded by the evidence quote alone.
    return "memory";
  }
  // style/tech/project memory repeat — grounded by the quote, model-only reasoning.
  return "memory";
}

/**
 * A signature-grounded repeat-MISTAKE catch (the high-precision core). Kept as a
 * named predicate for the API/MCP/bench that specifically tally mistake catches.
 */
export function isRepeatMistakeCatch(
  comment: ReviewComment,
  diff: string,
  cited: { kind: MemoryKind; predicate?: string } | undefined,
): boolean {
  return cited?.kind === "mistake" && classifyCatch(comment, diff, cited) !== null;
}
