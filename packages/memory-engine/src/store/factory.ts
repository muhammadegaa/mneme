import type { MemoryStore } from "./interface.js";
import { InMemoryStore } from "./memory-store.js";
import { JsonFileStore } from "./json-store.js";
import { PgVectorStore } from "./pg-store.js";

/**
 * One place to choose the store from config, so the engine/app never names a
 * concrete adapter. MEMORY_STORE = memory | json | postgres.
 *   - memory   : ephemeral (tests, quick demo)
 *   - json     : file-backed, survives restart (offline cross-session)
 *   - postgres : ApsaraDB for PostgreSQL + pgvector (production / Alibaba Cloud)
 */
export function createStore(env: NodeJS.ProcessEnv = process.env): MemoryStore {
  const kind = env.MEMORY_STORE ?? "memory";
  switch (kind) {
    case "postgres": {
      if (!env.DATABASE_URL) throw new Error("MEMORY_STORE=postgres requires DATABASE_URL");
      return new PgVectorStore(env.DATABASE_URL);
    }
    case "json":
      return new JsonFileStore(env.MNEME_STORE ?? ".mneme/memories.json");
    case "memory":
    default:
      return new InMemoryStore();
  }
}
