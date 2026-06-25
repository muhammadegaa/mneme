-- Mneme — ApsaraDB for PostgreSQL (pgvector) schema.
-- Apply once to your ApsaraDB instance:  psql "$DATABASE_URL" -f db/schema.sql
-- Embedding dim = 1024 (Qwen text-embedding-v3). Change if you switch models.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS memories (
  id               text PRIMARY KEY,
  text             text NOT NULL,
  kind             text NOT NULL,              -- style | tech | mistake | project
  subject          text NOT NULL,              -- "dev" or a repo slug
  predicate        text,                       -- slot for dedupe/supersede/reinforce
  salience         double precision NOT NULL,
  decay_rate       double precision NOT NULL,
  source           text NOT NULL,              -- commit sha / turn id
  embedding        vector(1024),
  created_at       bigint NOT NULL,
  last_accessed_at bigint NOT NULL,
  access_count     integer NOT NULL DEFAULT 0,
  reinforcements   integer NOT NULL DEFAULT 0,
  status           text NOT NULL DEFAULT 'active',  -- active | superseded | forgotten
  superseded_by    text
);

-- ANN index for hybrid retrieval (cosine distance).
CREATE INDEX IF NOT EXISTS memories_embedding_idx
  ON memories USING hnsw (embedding vector_cosine_ops);

-- Subject + status filters used by candidates()/bySubject().
CREATE INDEX IF NOT EXISTS memories_subject_idx ON memories (subject);
CREATE INDEX IF NOT EXISTS memories_status_idx  ON memories (status);
