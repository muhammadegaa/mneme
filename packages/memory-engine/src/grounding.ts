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
 * The single definition of a real catch, shared by the API, the MCP server, and
 * the benchmark: a warn, cited to a memory of a past mistake, that is BOTH
 * grounded (the model quoted real code) AND — for a known mistake class — whose
 * signature is actually present in the diff. The signature check is what stops
 * mischaracterization: a model can quote a real, innocuous line and mislabel it
 * as a null-check bug; requiring the null-check pattern to genuinely appear
 * rejects that. Unknown classes (e.g. a self-reported mistake with no signature)
 * fall back to grounding alone.
 */
export function isRepeatMistakeCatch(
  comment: ReviewComment,
  diff: string,
  cited: { kind: MemoryKind; predicate?: string } | undefined,
): boolean {
  if (comment.severity !== "warn" || !comment.citedMemoryId) return false;
  if (cited?.kind !== "mistake") return false;
  if (!isGroundedInDiff(comment, diff)) return false;
  const sig = mistakeSignature(cited.predicate);
  return sig ? signatureFires(sig, diffAddedText(diff)) : true;
}
