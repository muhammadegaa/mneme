import type { Memory } from "../types.js";
import type { MemoryStore } from "./interface.js";

/**
 * In-memory adapter. Used for unit tests, the benchmark harness, and local dev
 * with zero infra. Implements the same contract as the pgvector store; the
 * engine cannot tell them apart. ANN is not implemented here — it returns all
 * active candidates and lets the engine's reranker do the work (correct, just
 * not sublinear), which is exactly the documented degraded behavior.
 */
export class InMemoryStore implements MemoryStore {
  private readonly mem = new Map<string, Memory>();

  async insert(memory: Memory): Promise<void> {
    this.mem.set(memory.id, memory);
  }

  async getById(id: string): Promise<Memory | null> {
    return this.mem.get(id) ?? null;
  }

  async bySubject(subject: string): Promise<Memory[]> {
    return [...this.mem.values()].filter((m) => m.subject === subject);
  }

  async candidates(opts: {
    queryEmbedding?: number[];
    subject?: string;
    limit?: number;
  }): Promise<{ memories: Memory[]; degraded: boolean }> {
    let list = [...this.mem.values()].filter((m) => m.status === "active");
    if (opts.subject) list = list.filter((m) => m.subject === opts.subject);
    // No ANN here: this store always returns the full active set ("degraded"
    // relative to a real vector index) and trusts the engine to rerank.
    return { memories: list, degraded: true };
  }

  async setStatus(id: string, status: Memory["status"], supersededBy?: string): Promise<void> {
    const m = this.mem.get(id);
    if (!m) return;
    m.status = status;
    if (supersededBy !== undefined) m.supersededBy = supersededBy;
  }

  async touch(ids: string[], now: number): Promise<void> {
    for (const id of ids) {
      const m = this.mem.get(id);
      if (!m) continue;
      m.lastAccessedAt = now;
      m.accessCount += 1;
    }
  }

  async all(): Promise<Memory[]> {
    return [...this.mem.values()];
  }
}
