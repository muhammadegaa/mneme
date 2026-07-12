# Engram — Submission Checklist (Track 1: MemoryAgent)

Single source of truth mapping every hackathon requirement → status → artifact.
🟢 done · 🟡 in progress · 🔴 not started.

## Hard submission requirements

| # | Requirement | Status | Artifact |
|---|---|---|---|
| 1 | Public GitHub repo, MIT license | 🟢 | **https://github.com/muhammadegaa/mneme** (public, MIT [`LICENSE`](./LICENSE)). |
| 2 | Backend runs on Alibaba Cloud; proof of Alibaba Cloud API calls | 🟢 | **LIVE on Alibaba Cloud ECS** (Singapore, `47.84.61.162`, `backend=qwen`, persistent `systemd` service). Health: `{"ok":true,"backend":"qwen"}`. All reasoning on DashScope; `npm run proof` → `Qwen/DashScope OK · embed dims=1024`. FC + ApsaraDB pgvector are the wired **scale** path ([`s.yaml`](./s.yaml), [`Dockerfile`](./Dockerfile), [`pg-store.ts`](./packages/memory-engine/src/store/pg-store.ts)); move persistence with `MEMORY_STORE=postgres`. |
| 3 | Architecture diagram | 🟢 | [`docs/architecture.png`](./docs/architecture.png) embedded in [README](./README.md) (source: [`.html`](./docs/architecture.html) / [`.mmd`](./docs/architecture.mmd)). |
| 4 | ~3-min demo video script + shot list | 🟢 | [`docs/VIDEO_SCRIPT.md`](./docs/VIDEO_SCRIPT.md) — leads with the grounding story + `npm run demo:catch`. **Recording pending (manual).** |
| 5 | ~30s "backend on Alibaba Cloud" proof recording | 🟢 script | [`docs/PROOF_RECORDING.md`](./docs/PROOF_RECORDING.md); `npm run proof` shows the live Qwen call. **Recording pending (manual).** |
| 6 | README: problem, features, architecture, how-to-run, benchmark | 🟢 | [README](./README.md) — leads with the benchmark + the failure-then-fix grounding story. |
| 7 | Qwen for reasoning (plus/max agent, turbo cheap ops, Qwen embeddings) | 🟢 | [`qwen-client.ts`](./packages/memory-engine/src/model/qwen-client.ts) — tiered routing + embeddings. Mistake *detection* is deterministic (a signature registry), Qwen does extraction/review/embeddings. |

## Memory engine components (technical depth)

| Component | Status | Artifact |
|---|---|---|
| WRITE: extract → embed → dedupe → **reinforce/supersede** → store | 🟢 | [`extract.ts`](./packages/memory-engine/src/extract.ts), [`engine.ts`](./packages/memory-engine/src/engine.ts) |
| RETRIEVAL: hybrid semantic + recency + salience | 🟢 | [`scoring.ts`](./packages/memory-engine/src/scoring.ts) |
| FORGETTING: decay + contradiction resolution + audit trail | 🟢 | [`decay.ts`](./packages/memory-engine/src/decay.ts) |
| REINFORCEMENT: recurring mistakes get louder (demo hero) | 🟢 | [`engine.ts`](./packages/memory-engine/src/engine.ts) + tests |
| CONTEXT PACKING: 0/1 knapsack under a token budget | 🟢 | [`packing.ts`](./packages/memory-engine/src/packing.ts) |
| **GROUNDING: mistakes detected from real code; catches never fabricated** | 🟢 | [`mistakes.ts`](./packages/memory-engine/src/mistakes.ts), [`grounding.ts`](./packages/memory-engine/src/grounding.ts) |
| CROSS-SESSION persistence | 🟢 | [`json-store.ts`](./packages/memory-engine/src/store/json-store.ts) (atomic) offline; [`pg-store.ts`](./packages/memory-engine/src/store/pg-store.ts) pgvector on Alibaba |

## Benchmark + real-repo evidence (the moat)

| Item | Status |
|---|---|
| Synthetic A/B/B+/C harness (recall, contradiction acc, stale leakage, tokens) | 🟢 `npm run bench` (free; `--qwen` for live) |
| Results table in README | 🟢 [`bench/results/table.md`](./bench/results/table.md) → README lead |
| **Real unseen repos, grounded**: codehere (var ×3, empty-catch ×2), ravenote (0) | 🟢 [`real-codehere.md`](./bench/results/real-codehere.md), [`real-ravenote.md`](./bench/results/real-ravenote.md) |
| Reproducible held-out catch (learn → catch a fresh diff, grounded) | 🟢 `npm run demo:catch` (free) |

## Engineering standards

| Item | Status |
|---|---|
| Memory engine as a standalone, clean-interface package | 🟢 `@engram/memory-engine` |
| Deterministic unit tests (scoring / packing / decay / reinforce / grounding) | 🟢 **30 tests passing** |
| Adversarial code review done + findings fixed (engine, apps, stores) | 🟢 |
| Live box hardened (metered `/api/review` + `/api/reset`, atomic store) | 🟢 code done — **redeploy pending** (see [`docs/DEPLOY.md`](./docs/DEPLOY.md)) |
| npm scripts: dev / test / bench / demo:catch / proof | 🟢 |
| No placeholders/TODOs in shipped paths | 🟢 |

## Remaining before submit (all manual — need the box/screen)

1. **Lock + redeploy the box** — run the runbook in [`docs/DEPLOY.md`](./docs/DEPLOY.md): lock SSH to your IP, strip unused keys, `git pull` + restart, verify the getUser hero still fires. (Protects the coupon + ships all hardening.)
2. **Record the video** (`docs/VIDEO_SCRIPT.md`) + the ~30s Alibaba proof (`docs/PROOF_RECORDING.md`).
3. **Submit on Devpost** — paste [`DEVPOST.md`](./DEVPOST.md), attach video + repo + live URL.
