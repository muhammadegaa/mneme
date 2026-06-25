# Mneme — Submission Checklist (Track 1: MemoryAgent)

Single source of truth mapping every hackathon requirement → status → artifact.
Updated every phase. 🟢 done · 🟡 in progress · 🔴 not started.

## Hard submission requirements

| # | Requirement | Status | Artifact |
|---|---|---|---|
| 1 | Public GitHub repo, MIT license detectable in About | 🟡 | [`LICENSE`](./LICENSE) (MIT). Repo to be pushed + license set in About. |
| 2 | Backend runs on Alibaba Cloud; one file proving Alibaba Cloud API calls (Qwen + ≥1 infra svc) | 🟡 | [`alibaba/proof.ts`](./alibaba/proof.ts) — Qwen (DashScope) live; OSS/ApsaraDB wired in Phase 5. |
| 3 | Architecture diagram (Mermaid + exported PNG) | 🟡 | Mermaid in [README](./README.md#architecture). PNG export pending Phase 6. |
| 4 | ~3-min demo video script + shot list | 🔴 | Phase 6. |
| 5 | ~30s "backend on Alibaba Cloud" proof recording script | 🔴 | Phase 5. |
| 6 | README: problem, features, architecture, how-to-run, benchmark | 🟡 | [README](./README.md) skeleton up; benchmark table lands Phase 3. |
| 7 | Qwen for ALL reasoning (max/plus agent, turbo cheap ops, Qwen embeddings) | 🟢 | [`qwen-client.ts`](./packages/memory-engine/src/model/qwen-client.ts) — tiered routing + embeddings. |

## Memory engine components (technical depth)

| Component | Status | Artifact |
|---|---|---|
| WRITE: extract → classify → embed → dedupe → store | 🟢 | [`extract.ts`](./packages/memory-engine/src/extract.ts), [`engine.ts`](./packages/memory-engine/src/engine.ts) |
| RETRIEVAL: hybrid semantic + recency + salience (scoring math) | 🟢 | [`scoring.ts`](./packages/memory-engine/src/scoring.ts) |
| FORGETTING: decay + contradiction resolution + audit trail | 🟢 | [`decay.ts`](./packages/memory-engine/src/decay.ts) |
| CONTEXT PACKING: knapsack under token budget | 🟢 | [`packing.ts`](./packages/memory-engine/src/packing.ts) |
| CROSS-SESSION persistence on Alibaba Cloud | 🟡 | InMemory adapter now; pgvector/ApsaraDB Phase 5 |

## Benchmark (the moat)

| Item | Status |
|---|---|
| Synthetic multi-session dataset (planted facts, updates, distractors) | 🔴 Phase 3 |
| Metrics: recall@k, contradiction-resolution acc, stale-leakage, tokens↔quality, latency | 🔴 Phase 3 |
| 3 configs: (A) full-context baseline, (B) naive top-k, (C) hybrid+forget+pack | 🔴 Phase 3 |
| Results table + chart in README | 🔴 Phase 3 |

## Engineering standards

| Item | Status |
|---|---|
| Memory engine standalone package w/ clean interface | 🟢 `@mneme/memory-engine` |
| Deterministic unit tests for ranking + packing | 🟢 27 tests passing |
| npm scripts: dev / test / bench / deploy | 🟡 test ✓, hello ✓, bench Phase 3, deploy Phase 5 |
| No placeholders/TODOs in shipped paths | 🟢 |

## Phase log

- **Phase 0 — DONE.** Scaffold, MIT license, modular engine, Qwen client (tiered + structured + embeddings + token accounting), in-memory store, 27 passing tests, hello-qwen round-trip script, clean typecheck. Awaiting `DASHSCOPE_API_KEY` in `.env` to run the live round-trip.
