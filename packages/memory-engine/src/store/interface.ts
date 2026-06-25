import type { Memory } from "../types.js";

/**
 * Storage adapter contract. The engine depends ONLY on this interface, never on
 * a concrete store — so the in-memory dev store and the ApsaraDB/pgvector
 * production store are drop-in swappable, and the engine stays unit-testable.
 *
 * Graceful degradation lives here too: if a vector store can't answer an ANN
 * query, it may return a recency-ordered candidate set instead of throwing, and
 * the engine's hybrid reranker still produces a usable answer.
 */
export interface MemoryStore {
  insert(memory: Memory): Promise<void>;

  getById(id: string): Promise<Memory | null>;

  /** All memories for a subject, any status (used for contradiction checks + audit). */
  bySubject(subject: string): Promise<Memory[]>;

  /**
   * Candidate set for retrieval. A vector-backed store SHOULD use queryEmbedding
   * for ANN prefiltering and honor `limit`; the in-memory store returns all
   * active candidates and lets the engine rank. `degraded` signals the caller
   * fell back (e.g. ANN unavailable) so the engine/UI can surface it.
   */
  candidates(opts: {
    queryEmbedding?: number[];
    subject?: string;
    limit?: number;
  }): Promise<{ memories: Memory[]; degraded: boolean }>;

  setStatus(id: string, status: Memory["status"], supersededBy?: string): Promise<void>;

  /** Reinforce on retrieval: bump lastAccessedAt/accessCount. */
  touch(ids: string[], now: number): Promise<void>;

  /** All memories (decay job, benchmark, export). */
  all(): Promise<Memory[]>;
}
