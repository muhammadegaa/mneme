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
| WRITE: extract → classify → embed → dedupe → **reinforce/supersede** → store | 🟢 | [`extract.ts`](./packages/memory-engine/src/extract.ts), [`engine.ts`](./packages/memory-engine/src/engine.ts) |
| RETRIEVAL: hybrid semantic + recency + salience (scoring math) | 🟢 | [`scoring.ts`](./packages/memory-engine/src/scoring.ts) |
| FORGETTING: decay + contradiction resolution + audit trail | 🟢 | [`decay.ts`](./packages/memory-engine/src/decay.ts) |
| REINFORCEMENT: recurring mistakes get louder (demo hero) | 🟢 | [`engine.ts`](./packages/memory-engine/src/engine.ts) + tests |
| CONTEXT PACKING: knapsack under token budget | 🟢 | [`packing.ts`](./packages/memory-engine/src/packing.ts) |
| CROSS-SESSION persistence | 🟢 | [`JsonFileStore`](./packages/memory-engine/src/store/json-store.ts) survives restart offline; pgvector/ApsaraDB swap-in Phase 5 |

## Benchmark (the moat)

| Item | Status |
|---|---|
| Synthetic multi-session dataset (planted facts, updates, distractors) | 🟢 [`bench/data/history.json`](./bench/data/history.json) |
| Metrics: recall@k, contradiction-resolution acc, stale-leakage, tokens, latency | 🟢 [`bench/run.ts`](./bench/run.ts) |
| 3 configs: (A) full-context baseline, (B) naive top-k, (C) hybrid+forget+pack | 🟢 `npm run bench` |
| Results table in README | 🟢 [`bench/results/table.md`](./bench/results/table.md) → README lead |

## Engineering standards

| Item | Status |
|---|---|
| Memory engine standalone package w/ clean interface | 🟢 `@mneme/memory-engine` |
| Deterministic unit tests for ranking + packing | 🟢 27 tests passing |
| npm scripts: dev / test / bench / deploy | 🟡 test ✓, hello ✓, bench Phase 3, deploy Phase 5 |
| No placeholders/TODOs in shipped paths | 🟢 |

## Phase log

- **Phase 0 — DONE.** Scaffold, MIT license, modular engine, Qwen client (tiered + structured + embeddings + token accounting), in-memory store, passing tests, hello-qwen round-trip script, clean typecheck.
- **Phase 1 (Explore) — DONE.** Interview → `spec.md`. Vertical pivoted to **coding mentor** (code-review bot that learns from git history); hero = reinforced-mistake catch.
- **Phase 2 (Plan) — DONE.** 4 design directions in `design/`; **Hybrid (Clean SaaS + memory-field)** locked.
- **Phase 3 (Build) — IN PROGRESS.**
  - 3a: engine re-pointed to coding-mentor taxonomy + reinforcement mechanic (29 tests).
  - 3b: `MentorModel` interface + `MockMentorModel` (deterministic, zero-credit) + `QwenMentorModel`; `JsonFileStore`; `mneme` CLI (learn/review/forget/inspect) running end-to-end offline.
  - 3c: **benchmark** — A/B/C harness, C wins (100% contradiction acc, 0% stale leakage, 69 tok vs A's 446). Table leads the README.
  - Next: web UI (Hybrid) wrapping the CLI core.
- **Risk:** live Qwen still unproven (mock-first by design). `npm run hello` / `npm run bench --qwen` close it the moment a key is set.
