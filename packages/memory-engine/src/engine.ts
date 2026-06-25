import type { Memory, MemoryInput, ScoredMemory, PackResult, RetrievalWeights } from "./types.js";
import { DEFAULT_WEIGHTS } from "./types.js";
import { cosineSimilarity, rankMemories } from "./scoring.js";
import { packMemories } from "./packing.js";
import { planDecay, planContradictionResolution, sameSlot } from "./decay.js";
import type { MemoryStore } from "./store/interface.js";

/** Anything that can turn text into vectors. QwenClient.embed satisfies this. */
export interface Embedder {
  embed(texts: string[]): Promise<number[][]>;
}

export interface EngineOptions {
  weights?: RetrievalWeights;
  /** Cosine >= this against a same-slot memory = duplicate -> reinforce, don't re-insert. */
  dedupeThreshold?: number;
  /** Effective-salience floor for the forgetting job. */
  forgetFloor?: number;
  /** Candidate cap pulled from the store before reranking. */
  candidateLimit?: number;
  /** Injectable so tests are deterministic. */
  idGen?: () => string;
}

export type WriteAction = "inserted" | "deduped" | "superseding";

export interface WriteResult {
  memory: Memory;
  action: WriteAction;
  /** ids of memories this write superseded (contradiction resolution). */
  superseded: string[];
  /** if deduped, the id of the existing memory that absorbed it. */
  mergedInto?: string;
}

export interface RetrieveResult {
  scored: ScoredMemory[];
  degraded: boolean;
}

let counter = 0;
const defaultIdGen = () => `m_${(counter++).toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export class MemoryEngine {
  private readonly weights: RetrievalWeights;
  private readonly dedupeThreshold: number;
  private readonly forgetFloor: number;
  private readonly candidateLimit: number;
  private readonly idGen: () => string;

  constructor(
    private readonly store: MemoryStore,
    private readonly embedder: Embedder,
    opts: EngineOptions = {},
  ) {
    this.weights = opts.weights ?? DEFAULT_WEIGHTS;
    this.dedupeThreshold = opts.dedupeThreshold ?? 0.92;
    this.forgetFloor = opts.forgetFloor ?? 0.05;
    this.candidateLimit = opts.candidateLimit ?? 200;
    this.idGen = opts.idGen ?? defaultIdGen;
  }

  /**
   * WRITE PATH: embed -> dedupe -> contradiction-resolve -> store.
   * (Extraction + classification happen upstream and hand us a typed MemoryInput.)
   */
  async write(input: MemoryInput, now: number): Promise<WriteResult> {
    const [embedding] = await this.embedder.embed([input.text]);
    const vec = embedding ?? [];

    const subjectMemories = await this.store.bySubject(input.subject);
    const active = subjectMemories.filter((m) => m.status === "active");

    // DEDUPE: a near-identical, same-slot memory already exists -> reinforce it.
    for (const m of active) {
      if (sameSlot(m, input) && cosineSimilarity(vec, m.embedding) >= this.dedupeThreshold) {
        await this.store.setStatus(m.id, "active");
        await this.store.touch([m.id], now);
        const reinforced = { ...m, salience: Math.min(1, m.salience + 0.1) };
        await this.store.insert(reinforced); // overwrite with bumped salience
        return { memory: reinforced, action: "deduped", superseded: [], mergedInto: m.id };
      }
    }

    const memory: Memory = {
      ...input,
      id: this.idGen(),
      embedding: vec,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      status: "active",
    };

    // CONTRADICTION: newer fact wins its (subject,predicate) slot; old -> superseded.
    const { supersede } = planContradictionResolution(active, input);
    for (const id of supersede) {
      await this.store.setStatus(id, "superseded", memory.id);
    }

    await this.store.insert(memory);
    return {
      memory,
      action: supersede.length > 0 ? "superseding" : "inserted",
      superseded: supersede,
    };
  }

  /** RETRIEVAL: hybrid semantic + recency + salience rerank over candidates. */
  async retrieve(
    query: string,
    opts: { now: number; subject?: string; limit?: number; weights?: RetrievalWeights } = { now: 0 },
  ): Promise<RetrieveResult> {
    const [qvec] = await this.embedder.embed([query]);
    const { memories, degraded } = await this.store.candidates({
      queryEmbedding: qvec,
      subject: opts.subject,
      limit: this.candidateLimit,
    });
    const ranked = rankMemories(memories, qvec ?? [], opts.now, opts.weights ?? this.weights);
    const limit = opts.limit ?? ranked.length;
    return { scored: ranked.slice(0, limit), degraded };
  }

  /**
   * CONTEXT PACKING: retrieve, then knapsack-select the optimal memory set under
   * a token budget. Reinforces whatever gets packed (it was actually used).
   */
  async pack(
    query: string,
    budget: number,
    opts: { now: number; subject?: string; weights?: RetrievalWeights; reinforce?: boolean } = { now: 0 },
  ): Promise<{ retrieved: ScoredMemory[]; pack: PackResult; degraded: boolean }> {
    const { scored, degraded } = await this.retrieve(query, {
      now: opts.now,
      subject: opts.subject,
      weights: opts.weights,
    });
    const pack = packMemories(scored, budget);
    if (opts.reinforce !== false && pack.packed.length > 0) {
      await this.store.touch(pack.packed.map((p) => p.memory.id), opts.now);
    }
    return { retrieved: scored, pack, degraded };
  }

  /** FORGETTING JOB: mark all memories whose effective salience fell below the floor. */
  async runDecay(now: number, floor?: number): Promise<{ forgotten: string[] }> {
    const all = await this.store.all();
    const { forget } = planDecay(all, now, floor ?? this.forgetFloor);
    for (const id of forget) await this.store.setStatus(id, "forgotten");
    return { forgotten: forget };
  }
}
