import type { Memory, MemoryInput } from "../types.js";
import type { CommitSource, MentorModel, ReviewComment, ReviewResult, ReviewSeverity } from "./mentor.js";
import { QwenClient, type QwenUsage } from "./qwen-client.js";
import { extractFromCommit, extractFromTurn } from "../extract.js";

/**
 * Live Qwen implementation of MentorModel. Extraction reuses the structured
 * prompt in extract.ts (qwen-turbo); review runs on qwen-plus with the packed
 * memories injected and each comment forced to cite the memory that motivated
 * it. Identical interface to MockMentorModel — swap is one line at the call site.
 */

const SEVERITIES: ReviewSeverity[] = ["warn", "info", "praise"];

function parseReview(raw: unknown): ReviewResult {
  const o = raw as { comments?: unknown };
  if (!Array.isArray(o.comments)) throw new Error("expected { comments: [...] }");
  const comments: ReviewComment[] = [];
  for (const c of o.comments as Record<string, unknown>[]) {
    if (typeof c?.message !== "string") continue;
    const severity = (SEVERITIES as string[]).includes(c.severity as string) ? (c.severity as ReviewSeverity) : "info";
    comments.push({
      severity,
      message: c.message,
      line: typeof c.line === "number" ? c.line : undefined,
      citedMemoryId: typeof c.citedMemoryId === "string" ? c.citedMemoryId : undefined,
      evidence: typeof c.evidence === "string" ? c.evidence : undefined,
      fix: typeof c.fix === "string" ? c.fix : undefined,
    });
  }
  return { comments };
}

const REVIEW_SYSTEM = `You are a senior code reviewer who remembers exactly how THIS developer codes. You are given memories about them (style, tech choices, recurring mistakes, project decisions) and a diff. The developer's known mistake PATTERNS have already been detected in the diff deterministically — your job is the JUDGMENT a linter can't do: decide whether each flagged pattern is genuinely a bug IN THIS CONTEXT, and if so, write the specific fix. Review ONLY the diff.
- If a flagged recurring mistake is a REAL bug here: severity "warn"; write a message explaining WHY it's dangerous in THIS specific code (not a generic rule); set "fix" to a concrete, minimal fix for this exact code. Do NOT state a numeric count (the UI shows the tally).
- If a flagged pattern is actually FINE in this context (the value isn't used, a deliberate throwaway, the guard exists elsewhere): DO NOT warn — use severity "info" and briefly say why it's acceptable here. This false-positive judgment is exactly your value over a linter.
- Note consistency or drift from their tracked preferences (severity "info").
- Every comment MUST set citedMemoryId to the id of the memory that motivated it.
- Every "warn" MUST set evidence to the EXACT offending line, copied VERBATIM from the diff (character-for-character — never paraphrase or invent), AND set "fix". A warn whose evidence is not found in the diff is discarded.
Return JSON: {"comments":[{"line":<number|null>,"severity":"warn|info|praise","message":"...","citedMemoryId":"m_...","evidence":"<verbatim diff line, warn only>","fix":"<concrete fix, warn only>"}]}. Empty list if nothing worth saying.`;

export class QwenMentorModel implements MentorModel {
  readonly backend = "qwen" as const;
  constructor(private readonly qwen: QwenClient) {}

  embed(texts: string[]): Promise<number[][]> {
    return this.qwen.embed(texts);
  }

  extractFromCommit(commit: CommitSource, ctx: { defaultSubject: string }): Promise<MemoryInput[]> {
    return extractFromCommit(this.qwen, commit, ctx);
  }

  extractFromTurn(turn: { text: string }, ctx: { source: string; defaultSubject: string }): Promise<MemoryInput[]> {
    return extractFromTurn(this.qwen, turn, ctx);
  }

  review(req: { diff: string; file?: string; memories: Memory[] }): Promise<ReviewResult> {
    const memoryBlock = req.memories
      .map((m) => `- ${m.id} [${m.kind}] "${m.text}" salience=${m.salience.toFixed(2)} seen=${m.reinforcements + 1}×`)
      .join("\n");
    return this.qwen.structured(
      [
        { role: "system", content: REVIEW_SYSTEM },
        { role: "user", content: `Developer memories:\n${memoryBlock || "(none)"}\n\nDiff${req.file ? ` (${req.file})` : ""}:\n${req.diff}` },
      ],
      parseReview,
      { tier: "agent" },
    );
  }

  usage(): QwenUsage {
    return this.qwen.getUsage();
  }
}
