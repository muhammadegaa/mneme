/**
 * Core domain types for the Mneme memory engine.
 *
 * A "memory" is an atomic, self-contained statement extracted from a
 * conversation turn — not the raw turn itself. Atomicity is what makes
 * dedup, contradiction resolution, and packing tractable.
 */

export type MemoryKind = "preference" | "fact" | "event" | "episodic";

export interface MemoryInput {
  /** The atomic statement, e.g. "Acme prefers email over calls". */
  text: string;
  kind: MemoryKind;
  /** Stable subject the memory is about, e.g. "acme-corp". Drives contradiction grouping. */
  subject: string;
  /** Normalized relation/attribute, e.g. "contact_channel". Subject+predicate = a slot. */
  predicate?: string;
  /** 0..1 importance at write time. Higher survives decay longer. */
  salience: number;
  /** Per-memory decay constant (1/day). Higher = forgets faster. */
  decayRate: number;
  /** Where it came from — session id, message id, "user", "agent". */
  source: string;
}

export interface Memory extends MemoryInput {
  id: string;
  embedding: number[];
  /** Epoch ms. */
  createdAt: number;
  /** Epoch ms of last retrieval; recency uses this for reinforcement. */
  lastAccessedAt: number;
  /** Number of times retrieved. Reinforcement signal. */
  accessCount: number;
  /** Lifecycle. `superseded` keeps the audit trail; `forgotten` aged out by decay. */
  status: "active" | "superseded" | "forgotten";
  /** If superseded, the id of the memory that replaced it. */
  supersededBy?: string;
}

/** A scored candidate produced by retrieval, with the math exposed for the Inspector. */
export interface ScoredMemory {
  memory: Memory;
  /** Final ranking score. */
  score: number;
  /** Decomposed contributions so the UI can show *why* something ranked. */
  breakdown: {
    semantic: number;
    recency: number;
    salience: number;
    /** salience after time-decay at scoring time. */
    effectiveSalience: number;
  };
  /** Estimated token cost of injecting this memory. */
  tokens: number;
}

/** Result of knapsack context packing under a token budget. */
export interface PackResult {
  packed: ScoredMemory[];
  dropped: Array<ScoredMemory & { reason: string }>;
  usedTokens: number;
  budget: number;
}

export interface RetrievalWeights {
  semantic: number;
  recency: number;
  salience: number;
  /** recency half-life in days for the retrieval recency term. */
  recencyHalfLifeDays: number;
}

export const DEFAULT_WEIGHTS: RetrievalWeights = {
  semantic: 0.6,
  recency: 0.2,
  salience: 0.2,
  recencyHalfLifeDays: 14,
};
