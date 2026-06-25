# Mneme — Product Spec

*Generated from a Phase 1 (Exploration) interview, following the "How We Claude Code" Explore → Plan → Verify method. This is the source of truth the design (Phase 2) and build (Phase 3) point at.*

## What it is

**Mneme is a code-review bot with a memory.** It reads your git history to learn how *you* code — your style, your tech choices, your recurring mistakes, your project's decisions — then reviews your next diff against that memory. The same medium goes in and comes out: **diffs in, a memory-grounded review out.**

The thesis: a generic linter knows the rules of the language. Mneme knows the rules of *you*. It remembers that you keep forgetting to handle null, that you moved off Redux, that this repo decided "no ORM in the hot path" — and it brings exactly those memories to bear on the lines you just changed. And because it's a real memory engine, those memories **reinforce, decay, and supersede** over time instead of piling up.

## Audience

Individual developers and small teams who want review that's personalized and persistent — not a static ruleset, and not an LLM that forgets everything between sessions. Highest pain: the developer who repeats the same mistake across months and whose tooling never learns.

## Core thesis moment (the demo hero)

**Reinforced-mistake catch.** Across past commits, Mneme noticed you forgot a null check three times. Each repeat **raised the salience** of that memory. Now, reviewing a fresh diff, Mneme flags the same class of bug *before you ship it* — and the Memory Inspector shows that warning is loud specifically because you've earned it three times over. It's the inverse of forgetting: memory that gets *stronger* with evidence.

Supporting beats in the same demo:
- **Contradiction / supersession** — an old preference ("I use class components") is overwritten by a new one ("functional + hooks now"); the old memory is kept as a `superseded` audit-trail entry, not silently deleted.
- **Decay** — a one-off tool you tried once fades and stops polluting advice.

## The memory model

A memory is an **atomic, self-contained statement** about the developer or the project, extracted from a commit diff or a conversation turn. Four first-class categories (all selected in interview):

| Category | Example | Slot behavior |
|---|---|---|
| **Style preference** | "prefers early-return over nested if" | slot `(dev, style:control_flow)` — supersedable |
| **Tech/library choice** | "uses Zustand for state" | slot `(dev, tech:state_mgmt)` — supersedable, the contradiction source |
| **Recurring mistake** | "forgets null checks on API responses" | salience **reinforces** on each new occurrence |
| **Project fact/decision** | "this repo: no ORM in request hot path" | slot `(project, decision:data_access)` |

Each memory carries: `text`, `kind`, `subject`, `predicate` (slot), `salience` (0–1), `decayRate` (1/day), `source` (commit SHA / turn), `createdAt`, `lastAccessedAt`, `accessCount`, `status` (`active｜superseded｜forgotten`).

## How it works

### Write path — `mneme learn <git-range>`
1. Walk `git log -p` over a commit range; each commit's diff is one source.
2. **Qwen structured extraction** (qwen-turbo) → atomic memories, classified into the four categories, with subject/predicate slots and salience.
3. **Embed** (Qwen `text-embedding-v3`).
4. **Dedupe** against existing same-slot memories (cosine ≥ threshold → reinforce, don't duplicate).
5. **Reinforce mistakes**: a new occurrence of an existing recurring-mistake memory bumps its salience (this is the hero mechanic).
6. **Contradiction resolution**: a new tech/style choice in an occupied slot supersedes the old one; the old is retained with `supersededBy` + timestamp (audit trail).
7. Store on the memory store (local persistent for dev/demo; ApsaraDB pgvector for cloud — fork decided after the live Qwen round-trip is green).

### Retrieval — hybrid rerank
`score = 0.6·semantic + 0.2·recency + 0.2·salience`, where recency is half-life decay on `lastAccessedAt` and salience is time-decayed on `createdAt`. The reinforced-mistake memory ranks high precisely because its salience kept climbing. Scoring math is exposed per result for the Inspector.

### Review path — `mneme review <diff>`
1. For the changed hunks, retrieve relevant memories (the diff text is the query).
2. **Context-pack** under a fixed token budget via 0/1 knapsack over (relevance × salience); show packed vs dropped + why.
3. **Qwen agent** (qwen-plus) produces inline review comments, each **grounded in a cited memory** ("flagging this because you've missed null checks 3× — memory `m_…`").

### Forgetting job — `mneme forget`
Continuous salience decay; memories below the retention floor flip to `forgotten`. Runs as an explicit, observable job so the demo can show memories aging out.

## Surface (what a judge sees)

A **web code-review view** — the editor/review-bot surface chosen in interview — with two panes:
- **Left: the diff** (PR-style), with **inline AI comments** grounded in cited memories.
- **Right: the Memory Inspector** — every memory with its salience bar, decay curve, category, and status; for the current review it highlights which memories were **retrieved → packed → dropped**, with the scoring breakdown and packing reasons.

**De-risk (stated up front):** the editor/diff surface + git-diff ingestion is the heaviest path. Mitigation — build a **headless CLI core first** (`learn` / `review` / `forget`) that fully exercises the engine and runs the benchmark; the web view is a thin wrapper over that same core. If the UI runs late, the CLI + Inspector JSON still demonstrate every component on camera.

### Key screens
1. **Onboarding** — point Mneme at a repo / git range; watch it "learn you" (memories streaming in, categorized).
2. **Review** — a diff with memory-grounded inline comments.
3. **Memory Inspector** — salience/decay/status timeline; retrieved/packed/dropped for the active review; the supersession audit trail.

## Benchmark (the moat) — "real but small"

A compact, honest, reproducible harness over a **synthetic multi-session commit dataset** (planted style/tech/mistake facts, later contradictions, decoy commits). Real Qwen calls; clearly-labeled scope (~10–20 sessions). Compares:
- **A** — no memory / full-context stuffing
- **B** — naive vector top-k
- **C** — Mneme (hybrid + reinforcement/forgetting + packing)

Metrics: recall@k, contradiction-resolution accuracy, **stale-fact leakage rate**, tokens-injected vs review quality, latency. README leads with the table; the video shows it.

## Platform & tech

- **Engine**: standalone `@mneme/memory-engine` (TypeScript) — pure, unit-tested ranking/packing/decay (already scaffolded in Phase 0; extraction prompt to be re-pointed from B2B to code-mentor).
- **Models**: Qwen via DashScope/Model Studio (OpenAI-compatible). qwen-turbo for extraction/cheap ops, qwen-plus for review reasoning, `text-embedding-v3` for embeddings. One client with retries, timeouts, JSON repair, token accounting.
- **Store**: local persistent adapter for dev/demo; **ApsaraDB for PostgreSQL (pgvector)** + **OSS** for the cloud deployment & proof. Persistence-surface fork decided once `npm run hello` is green.
- **API/UI**: Hono API + Next.js + Tailwind + shadcn/ui for the review view + Inspector.
- **Cloud**: backend on Alibaba Cloud; `alibaba/proof.ts` exercises Qwen + OSS as the "Proof of Alibaba Cloud Deployment."

## Open fork (decide next)
- **Persistence surface**: local-persistent demo + separate cloud proof clip **vs** fully live on ApsaraDB pgvector. Gated on the live Qwen round-trip.

## Deferred (not v1)
- Real-time editor/IDE plugin (we render a diff view, not a live LSP).
- Multi-developer team memory & per-author attribution at scale.
- Auto-PR-comment GitHub App integration.
- Learning from CI/test outcomes.
