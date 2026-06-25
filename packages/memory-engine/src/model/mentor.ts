import type { Memory, MemoryInput } from "../types.js";
import type { QwenUsage } from "./qwen-client.js";

/**
 * Domain-level model interface — the single swap point between deterministic
 * mock inference and live Qwen. The engine (Embedder), CLI, and benchmark all
 * depend on this, never on a concrete model. `MockMentorModel` runs the whole
 * pipeline offline with zero credits; `QwenMentorModel` is the real thing.
 */

export interface CommitSource {
  sha: string;
  message: string;
  diff: string;
}

export type ReviewSeverity = "warn" | "info" | "praise";

export interface ReviewComment {
  file?: string;
  line?: number;
  severity: ReviewSeverity;
  message: string;
  /** id of the memory this comment is grounded in (the trust anchor). */
  citedMemoryId?: string;
}

export interface ReviewResult {
  comments: ReviewComment[];
}

export interface MentorModel {
  /** Batch embeddings (satisfies the engine's Embedder). */
  embed(texts: string[]): Promise<number[][]>;
  /** Extract atomic developer memories from a commit (write path). */
  extractFromCommit(commit: CommitSource, ctx: { defaultSubject: string }): Promise<MemoryInput[]>;
  /** Extract from a free-form chat turn. */
  extractFromTurn(turn: { text: string }, ctx: { source: string; defaultSubject: string }): Promise<MemoryInput[]>;
  /** Produce review comments for a diff, grounded in the packed memories. */
  review(req: { diff: string; file?: string; memories: Memory[] }): Promise<ReviewResult>;
  /** Token accounting (mock returns zeros). */
  usage(): QwenUsage;
  /** "mock" | "qwen" — surfaced in the UI/CLI so it's never ambiguous which ran. */
  readonly backend: "mock" | "qwen";
}
