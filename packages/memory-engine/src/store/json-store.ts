import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import type { Memory } from "../types.js";
import type { MemoryStore } from "./interface.js";

/**
 * File-backed store: same contract as InMemoryStore, but memories persist to a
 * JSON file and survive process restarts. This is what proves "cross-session"
 * for the offline/demo path — close the CLI, reopen, the mentor still remembers.
 * The production path swaps this for the pgvector/ApsaraDB adapter; the engine
 * is identical against both.
 */
export class JsonFileStore implements MemoryStore {
  private readonly mem = new Map<string, Memory>();

  constructor(private readonly path: string) {
    if (existsSync(path)) {
      const data = JSON.parse(readFileSync(path, "utf8")) as Memory[];
      for (const m of data) this.mem.set(m.id, m);
    }
  }

  private flush(): void {
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify([...this.mem.values()], null, 2));
  }

  async insert(memory: Memory): Promise<void> {
    this.mem.set(memory.id, memory);
    this.flush();
  }

  async getById(id: string): Promise<Memory | null> {
    return this.mem.get(id) ?? null;
  }

  async bySubject(subject: string): Promise<Memory[]> {
    return [...this.mem.values()].filter((m) => m.subject === subject);
  }

  async candidates(opts: { queryEmbedding?: number[]; subject?: string; limit?: number }): Promise<{ memories: Memory[]; degraded: boolean }> {
    let list = [...this.mem.values()].filter((m) => m.status === "active");
    if (opts.subject) list = list.filter((m) => m.subject === opts.subject);
    return { memories: list, degraded: true };
  }

  async setStatus(id: string, status: Memory["status"], supersededBy?: string): Promise<void> {
    const m = this.mem.get(id);
    if (!m) return;
    m.status = status;
    if (supersededBy !== undefined) m.supersededBy = supersededBy;
    this.flush();
  }

  async touch(ids: string[], now: number): Promise<void> {
    for (const id of ids) {
      const m = this.mem.get(id);
      if (!m) continue;
      m.lastAccessedAt = now;
      m.accessCount += 1;
    }
    this.flush();
  }

  async all(): Promise<Memory[]> {
    return [...this.mem.values()];
  }
}
