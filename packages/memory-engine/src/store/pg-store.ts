import type { Memory } from "../types.js";
import type { MemoryStore } from "./interface.js";

/**
 * Production store: ApsaraDB for PostgreSQL + pgvector. Same contract as the
 * in-memory/JSON stores, so swapping is `MEMORY_STORE=postgres` — no engine
 * change. ANN runs server-side via the cosine-distance operator; if the vector
 * index is unavailable the store DEGRADES to a recency-ordered candidate set
 * (returns degraded:true) instead of throwing, and the engine still reranks.
 *
 * `pg` is imported lazily so this module loads even when pg isn't installed
 * (the mock/offline path never touches it). See db/schema.sql for the DDL.
 */

type PgClient = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }>;
  end: () => Promise<void>;
};

function vecLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

function rowToMemory(r: any): Memory {
  return {
    id: r.id,
    text: r.text,
    kind: r.kind,
    subject: r.subject,
    predicate: r.predicate ?? undefined,
    salience: Number(r.salience),
    decayRate: Number(r.decay_rate),
    source: r.source,
    embedding: typeof r.embedding === "string" ? JSON.parse(r.embedding) : (r.embedding ?? []),
    createdAt: Number(r.created_at),
    lastAccessedAt: Number(r.last_accessed_at),
    accessCount: Number(r.access_count),
    reinforcements: Number(r.reinforcements),
    status: r.status,
    supersededBy: r.superseded_by ?? undefined,
  };
}

export class PgVectorStore implements MemoryStore {
  private client!: PgClient;
  private ready: Promise<void>;

  constructor(connectionString: string) {
    this.ready = this.connect(connectionString);
  }

  private async connect(connectionString: string): Promise<void> {
    const pg = await import("pg");
    const Pool = (pg as any).default?.Pool ?? (pg as any).Pool;
    this.client = new Pool({ connectionString, ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined });
  }

  async insert(memory: Memory): Promise<void> {
    await this.ready;
    await this.client.query(
      `INSERT INTO memories (id,text,kind,subject,predicate,salience,decay_rate,source,embedding,created_at,last_accessed_at,access_count,reinforcements,status,superseded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (id) DO UPDATE SET
         text=EXCLUDED.text, salience=EXCLUDED.salience, decay_rate=EXCLUDED.decay_rate,
         last_accessed_at=EXCLUDED.last_accessed_at, access_count=EXCLUDED.access_count,
         reinforcements=EXCLUDED.reinforcements, status=EXCLUDED.status, superseded_by=EXCLUDED.superseded_by, source=EXCLUDED.source`,
      [
        memory.id, memory.text, memory.kind, memory.subject, memory.predicate ?? null,
        memory.salience, memory.decayRate, memory.source, vecLiteral(memory.embedding),
        memory.createdAt, memory.lastAccessedAt, memory.accessCount, memory.reinforcements,
        memory.status, memory.supersededBy ?? null,
      ],
    );
  }

  async getById(id: string): Promise<Memory | null> {
    await this.ready;
    const { rows } = await this.client.query("SELECT * FROM memories WHERE id=$1", [id]);
    return rows[0] ? rowToMemory(rows[0]) : null;
  }

  async bySubject(subject: string): Promise<Memory[]> {
    await this.ready;
    const { rows } = await this.client.query("SELECT * FROM memories WHERE subject=$1", [subject]);
    return rows.map(rowToMemory);
  }

  async candidates(opts: { queryEmbedding?: number[]; subject?: string; limit?: number }): Promise<{ memories: Memory[]; degraded: boolean }> {
    await this.ready;
    const limit = opts.limit ?? 200;
    const subjFilter = opts.subject ? "AND subject = $2" : "";
    const params: unknown[] = [];

    if (opts.queryEmbedding && opts.queryEmbedding.length) {
      try {
        params.push(vecLiteral(opts.queryEmbedding));
        if (opts.subject) params.push(opts.subject);
        const { rows } = await this.client.query(
          `SELECT * FROM memories WHERE status='active' ${subjFilter}
           ORDER BY embedding <=> $1 LIMIT ${limit}`,
          params,
        );
        return { memories: rows.map(rowToMemory), degraded: false };
      } catch {
        // ANN unavailable (index missing / extension down) -> graceful fallback.
      }
    }
    const recencyParams = opts.subject ? [opts.subject] : [];
    const { rows } = await this.client.query(
      `SELECT * FROM memories WHERE status='active' ${opts.subject ? "AND subject=$1" : ""}
       ORDER BY last_accessed_at DESC LIMIT ${limit}`,
      recencyParams,
    );
    return { memories: rows.map(rowToMemory), degraded: true };
  }

  async setStatus(id: string, status: Memory["status"], supersededBy?: string): Promise<void> {
    await this.ready;
    await this.client.query("UPDATE memories SET status=$2, superseded_by=COALESCE($3, superseded_by) WHERE id=$1", [id, status, supersededBy ?? null]);
  }

  async touch(ids: string[], now: number): Promise<void> {
    await this.ready;
    if (!ids.length) return;
    await this.client.query("UPDATE memories SET last_accessed_at=$2, access_count=access_count+1 WHERE id = ANY($1)", [ids, now]);
  }

  async all(): Promise<Memory[]> {
    await this.ready;
    const { rows } = await this.client.query("SELECT * FROM memories", []);
    return rows.map(rowToMemory);
  }
}
