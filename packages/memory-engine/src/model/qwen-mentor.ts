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
    });
  }
  return { comments };
}

const REVIEW_SYSTEM = `You are a senior code reviewer who remembers exactly how THIS developer codes. You are given memories about them (their style, tech choices, recurring mistakes, project decisions) and a diff. Review ONLY the diff.
- Prioritize their recurring mistakes: if the diff repeats one, flag it (severity "warn") and reference how many times they've done it.
- Note consistency or drift from their tracked preferences (severity "info").
- Every comment MUST set citedMemoryId to the id of the memory that motivated it.
Return JSON: {"comments":[{"line":<number|null>,"severity":"warn|info|praise","message":"...","citedMemoryId":"m_..."}]}. Empty list if nothing worth saying.`;

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
