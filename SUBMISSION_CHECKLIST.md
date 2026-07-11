# Engram — Submission Checklist (Track 1: MemoryAgent)

Single source of truth mapping every hackathon requirement → status → artifact.
Updated every phase. 🟢 done · 🟡 in progress · 🔴 not started.

## Hard submission requirements

| # | Requirement | Status | Artifact |
|---|---|---|---|
| 1 | Public GitHub repo, MIT license detectable in About | 🟢 | **https://github.com/muhammadegaa/engram** (public, MIT [`LICENSE`](./LICENSE)). |
| 2 | Backend runs on Alibaba Cloud; file proving Alibaba Cloud API calls | 🟢 (Qwen) / 🟡 (infra) | **Qwen on Alibaba Cloud is LIVE and proven**: `npm run proof` → `[1/2] Qwen/DashScope OK · embed dims=1024`. Infra service (OSS/FC) is fully wired ([`proof.ts`](./alibaba/proof.ts), [`s.yaml`](./s.yaml), [`Dockerfile`](./Dockerfile), [`pg-store.ts`](./packages/memory-engine/src/store/pg-store.ts)) but **not activated — blocked by the account's "complete your information" verification gate**, which disables OSS + Function Compute. Flips on the moment the account clears. |
| 3 | Architecture diagram (Mermaid + exported PNG) | 🟢 | Mermaid in [README](./README.md#architecture) + [`docs/architecture.mmd`](./docs/architecture.mmd) (renders natively on GitHub). |
| 4 | ~3-min demo video script + shot list | 🟢 | [`docs/VIDEO_SCRIPT.md`](./docs/VIDEO_SCRIPT.md) — demo runs live on Qwen; ready to record. |
| 5 | ~30s "backend on Alibaba Cloud" proof recording script | 🟢 | [`docs/PROOF_RECORDING.md`](./docs/PROOF_RECORDING.md); `npm run proof` shows the live Qwen call now. |
| 6 | README: problem, features, architecture, how-to-run, benchmark | 🟢 | [README](./README.md) leads with the live benchmark table. |
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
| Memory engine standalone package w/ clean interface | 🟢 `@engram/memory-engine` |
| Deterministic unit tests for ranking + packing | 🟢 27 tests passing |
| npm scripts: dev / test / bench / deploy | 🟡 test ✓, hello ✓, bench Phase 3, deploy Phase 5 |
| No placeholders/TODOs in shipped paths | 🟢 |

## Phase log

- **Phase 0 — DONE.** Scaffold, MIT license, modular engine, Qwen client (tiered + structured + embeddings + token accounting), in-memory store, passing tests, hello-qwen round-trip script, clean typecheck.
- **Phase 1 (Explore) — DONE.** Interview → `spec.md`. Vertical pivoted to **coding mentor** (code-review bot that learns from git history); hero = reinforced-mistake catch.
- **Phase 2 (Plan) — DONE.** 4 design directions in `design/`; **Hybrid (Clean SaaS + memory-field)** locked.
- **Phase 3 (Build) — IN PROGRESS.**
  - 3a: engine re-pointed to coding-mentor taxonomy + reinforcement mechanic (29 tests).
  - 3b: `MentorModel` interface + `MockMentorModel` (deterministic, zero-credit) + `QwenMentorModel`; `JsonFileStore`; `engram` CLI (learn/review/forget/inspect) running end-to-end offline.
  - 3c: **benchmark** — A/B/C harness, C wins (100% contradiction acc, 0% stale leakage, 69 tok vs A's 446). Table leads the README.
  - 3d: live Memory Inspector UI + Hono API (the demo hero surface).
- **Live-Qwen verification (Alibaba Cloud) — DONE.**
  - `npm run hello` → real qwen-plus completion + structured JSON + 1024-dim embeddings.
  - `npm run bench` → `backend=qwen`, live `text-embedding-v3`; C wins (100% contradiction acc, 0% stale leakage).
  - Demo hero fires on `backend=qwen`: review flags the null-check citing a reinforced memory (seen 3×).
  - Cross-session proven (json store restores across restart on live Qwen).
  - `npm run proof` → live Qwen/DashScope call succeeds (Alibaba Cloud).
- **Blocked (not by code):** Function Compute deploy + OSS write are wired (`s.yaml`, `Dockerfile`, `pg-store.ts`) but the account's **"complete your information" verification gate** disables OSS + FC. Clears the moment the account is verified.
- **Submittable now:** public MIT repo · README leads with real `backend=qwen` benchmark · demo runs live on Qwen · `proof.ts` shows the live Alibaba Cloud call. Infra deploy flips on post-verification.
