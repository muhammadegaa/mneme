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
    // ApsaraDB often presents a self-signed cert, so verification is off by
    // default for a working connection; set PGSSL_STRICT=true to require a valid
    // chain once you've configured the CA.
    const ssl = process.env.PGSSL === "true" ? { rejectUnauthorized: process.env.PGSSL_STRICT === "true" } : undefined;
    this.client = new Pool({ connectionString, ssl });
  }

  async insert(memory: Memory): Promise<void> {
    await this.ready;
    await this.client.query(
      `INSERT INTO memories (id,text,kind,subject,predicate,salience,decay_rate,source,embedding,created_at,last_accessed_at,access_count,reinforcements,status,superseded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (id) DO UPDATE SET
         text=EXCLUDED.text, kind=EXCLUDED.kind, subject=EXCLUDED.subject, predicate=EXCLUDED.predicate,
         salience=EXCLUDED.salience, decay_rate=EXCLUDED.decay_rate, embedding=EXCLUDED.embedding,
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
    const limit = Math.max(1, Math.floor(opts.limit ?? 200));

    if (opts.queryEmbedding && opts.queryEmbedding.length) {
      try {
        // All values parameterized ($1 vector needs an explicit ::vector cast so
        // pgvector's <=> operator resolves; limit is bound, never interpolated).
        const p: unknown[] = [vecLiteral(opts.queryEmbedding)];
        let subj = "";
        if (opts.subject) { p.push(opts.subject); subj = `AND subject = $${p.length}`; }
        p.push(limit);
        const { rows } = await this.client.query(
          `SELECT * FROM memories WHERE status='active' ${subj} ORDER BY embedding <=> $1::vector LIMIT $${p.length}`,
          p,
        );
        return { memories: rows.map(rowToMemory), degraded: false };
      } catch (e) {
        // ANN unavailable (index missing / extension down) -> recency fallback,
        // but LOG it: a silent swallow hides a broken production index.
        console.warn(`pgvector ANN query failed, falling back to recency: ${(e as Error).message}`);
      }
    }

    const rp: unknown[] = [];
    let subj = "";
    if (opts.subject) { rp.push(opts.subject); subj = `AND subject = $${rp.length}`; }
    rp.push(limit);
    const { rows } = await this.client.query(
      `SELECT * FROM memories WHERE status='active' ${subj} ORDER BY last_accessed_at DESC LIMIT $${rp.length}`,
      rp,
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
