# 🧠 Mneme — the account manager that never forgets

> A persistent **MemoryAgent** with a real, benchmarkable memory engine.
> Built on **Qwen** (DashScope / Model Studio) and **Alibaba Cloud**.
> Qwen Cloud Global AI Hackathon — **Track 1: MemoryAgent**.

Most "AI memory" is `topK(cosine)` over a vector store. Mneme is a memory
**engine**: it extracts atomic memories, ranks them with a hybrid scoring
function, **forgets** via time-decay, **resolves contradictions** with an audit
trail, and **packs** an optimal memory set into a fixed token budget with a
knapsack solver. Every decision is observable in a Memory Inspector.

The vertical: a **B2B account manager** that remembers every client interaction
across sessions — preferences, commitments, renewal dates — and stops re-asking
what it was already told.

---

## 📊 Benchmark (the headline)

> _Populated in Phase 3._ A reproducible harness over a synthetic multi-session
> dataset (planted facts, later contradictions, distractors), comparing:
> **(A)** full-context stuffing · **(B)** naive vector top-k · **(C)** Mneme
> (hybrid + forgetting + packing).

| Config | Recall@5 | Contradiction acc. | Stale-fact leakage | Tokens injected | Answer quality | p50 latency |
|---|---|---|---|---|---|---|
| A — full context | _tbd_ | _tbd_ | _tbd_ | _tbd_ | _tbd_ | _tbd_ |
| B — naive top-k | _tbd_ | _tbd_ | _tbd_ | _tbd_ | _tbd_ | _tbd_ |
| **C — Mneme** | _tbd_ | _tbd_ | _tbd_ | _tbd_ | _tbd_ | _tbd_ |

---

## ✨ Features

- **Write path** — Qwen structured-output extraction → classification
  (`preference｜fact｜event｜episodic`) → embedding → dedupe → store.
- **Hybrid retrieval** — `score = 0.6·semantic + 0.2·recency + 0.2·salience`,
  recency as half-life decay, salience time-decayed. Math exposed per result.
- **Forgetting** — continuous salience decay ages memories out; new facts
  supersede old ones in the same `(subject, predicate)` slot, audit trail kept.
- **Context packing** — 0/1 knapsack selects the optimal memory set under a
  token budget; shows what was packed, what dropped, and **why**.
- **Cross-session** — memories persist on Alibaba Cloud and improve answers
  across separate sessions.
- **Graceful degradation** — if the vector index can't answer, the store falls
  back to a candidate set and the engine still reranks.

## 🏗️ Architecture

```mermaid
flowchart LR
    U[User / Account Manager] -->|turn| API[Hono API · Alibaba Cloud ECS/FC]
    API --> ENG[Memory Engine]

    subgraph Qwen Cloud · DashScope
      LLM[qwen-max / qwen-plus / qwen-turbo]
      EMB[text-embedding-v3]
    end

    ENG -->|extract · classify · pack| LLM
    ENG -->|embed| EMB

    subgraph Alibaba Cloud
      PG[(ApsaraDB PostgreSQL · pgvector)]
      OSS[(OSS · blobs)]
    end

    ENG -->|write / retrieve / forget| PG
    ENG --> OSS

    API --> WEB[Next.js · Memory Inspector]
    WEB -->|salience · decay · packed/dropped| U
```

## 🚀 How to run

```bash
cp .env.example .env        # add DASHSCOPE_API_KEY (mainland or -intl endpoint)
npm install
npm test                    # 27 deterministic tests for scoring/packing/decay/engine
npm run hello               # live Qwen round-trip: chat + structured + embeddings
npm run bench               # benchmark harness (Phase 3)
npm run proof               # Alibaba Cloud proof: Qwen + OSS (Phase 5)
```

## 🧩 Project layout

```
packages/memory-engine/     standalone, unit-tested engine (the moat)
  src/scoring.ts            pure hybrid ranking (tested to exact numbers)
  src/packing.ts            0/1 knapsack context packer (tested)
  src/decay.ts              forgetting + contradiction resolution (tested)
  src/engine.ts             write / retrieve / pack / forget orchestration
  src/extract.ts            Qwen structured-output memory extraction
  src/model/qwen-client.ts  one client: retries, timeouts, JSON repair, token accounting
  src/store/                MemoryStore interface · in-memory + pgvector adapters
apps/api/                   Hono API (Phase 4)
apps/web/                   Next.js + Memory Inspector (Phase 4)
alibaba/proof.ts            Proof of Alibaba Cloud deployment
bench/                      benchmark harness + dataset (Phase 3)
```

## 🔧 Tech

TypeScript · Qwen via DashScope (OpenAI-compatible) · ApsaraDB for PostgreSQL
(pgvector) · OSS · Hono · Next.js + Tailwind + shadcn/ui.

## 📄 License

MIT — see [LICENSE](./LICENSE).
