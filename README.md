# 🧠 Engram — the code reviewer that remembers you

> A persistent **MemoryAgent** with a real, benchmarkable memory engine.
> Powered end-to-end by **Qwen** (DashScope / Model Studio) on **Alibaba Cloud**.
> Qwen Cloud Global AI Hackathon — **Track 1: MemoryAgent**.

Linters know the language. Copilot forgets you the moment the session ends.
**Engram reads your git history and learns how _you_ code** — your style, your
tools, and the mistake you keep making — then catches it on your next diff,
*before it ships*.

Most "AI memory" is `topK(cosine)` over a vector store. Engram is a memory
**engine**: it extracts atomic memories from commits, ranks them with a hybrid
scoring function, **reinforces** recurring mistakes so they get louder,
**forgets** one-off noise via time-decay, **resolves contradictions** with an
audit trail, and **packs** the optimal memory set into a fixed token budget with
a 0/1 knapsack solver. Every decision is observable in a live Memory Inspector.

**The hero:** a bug you've made before makes its memory *louder* every time it
recurs. On a new diff, Engram catches it and tells you exactly how many times
you'd have shipped it — grounded in a specific memory of yours, not a generic
lint rule.

---

## 📊 Benchmark (the headline)

Reproducible harness (`npm run bench`) over a synthetic multi-session commit
history with planted facts, a later contradiction (Redux → Zustand), a style
flip (class → functional components), a decaying one-off (a Bun experiment), and
distractors. Embeddings are **live Qwen `text-embedding-v3` on Alibaba Cloud**;
the dataset is synthetic and controlled. Three context strategies, identical inputs:

All three configs achieve perfect Recall@5 here (the planted facts are all
retrievable) — so recall is *not* the differentiator. The engine earns its keep
on the two columns a naive store can't touch: **contradiction accuracy** and
**stale-fact leakage**.

| Config | Contradiction acc. | Stale-fact leakage | Avg tokens | Recall@5 | Avg latency† |
|---|---|---|---|---|---|
| A — full-context stuffing | 50% | 100% | 446 | 100% | ~0ms† |
| B — naive vector top-k | 50% | 100% | 67 | 100% | 292ms |
| **C — Engram (hybrid + forgetting + packing)** | **100%** | **0%** | **69** | **100%** | 318ms |

**Read:** full-context never misses but re-injects superseded facts (100% stale
leakage) at ~6.5× the tokens. Naive top-k is cheap but status-blind — it still
leaks the stale "Redux" fact and resolves the contradiction only half the time.
**Engram resolves every contradiction and drives stale leakage to zero — at a
fraction of the tokens and matching recall.** Forgetting + supersession is what
separates a memory *engine* from a vector lookup.

> †Latency for B/C is one live Qwen embedding round-trip. Config A does **no**
> embedding call (it stuffs raw text), so its retrieval step is ~free — but it
> pays that back many times over in LLM input tokens on *every* turn (446 vs 69).
> The point of the latency column is that Engram's forgetting/packing adds
> negligible overhead (318ms vs B's 292ms) while fixing what B gets wrong.

> Run it yourself: `npm run bench`. With `DASHSCOPE_API_KEY` set it reports
> `backend=qwen` on live `text-embedding-v3` (the numbers above); with no key it
> falls back to a deterministic embedder so the harness still runs in CI.

### A repo it had never seen

The bench above is synthetic — so the fair objection is "you planted those
mistakes." So we pointed Engram at **`codehere` — a real 1,456-commit repo it had
never seen** — and learned its last 29 commits live on Qwen (`tsx bench/real-run.ts
../codehere 30 --qwen`). It extracted **37 memories** and, with no planted data,
identified a **genuinely recurring mistake**:

> `mistake` · seen 2× (reinforced once) — **"swallows errors in empty catch blocks"**

That's real and independently checkable — `codehere`'s history is full of
`}catch(e){}` blocks that discard the error. Engram learned the pattern from
commits it had never seen and marked it recurring. Cost: ~47k tokens (~$0.02).

**Honest boundary:** the same run also held out the newest commit for a live
review, which produced one comment — *"uses `var`"* — that **isn't in the diff**.
It's a model hallucination, so we **discard it**; it is not counted as evidence.
Extraction + reinforcement over real history is grounded and reliable; a single
live-review comment still needs checking against the diff. Full writeup:
[`bench/results/real-codehere.md`](bench/results/real-codehere.md).

---

## ✨ What it does

- **Learns from commits** — Qwen structured-output extraction turns each commit
  (message + diff) into atomic memories, classified as
  `style ｜ tech ｜ mistake ｜ project`. Nothing is typed in by hand.
- **Hybrid retrieval** — `score = semantic + recency + salience`; recency as
  half-life decay, salience time-decayed. The math is exposed per result.
- **Reinforcement (the hero)** — a repeated mistake reinforces the *same* memory
  (same `subject·predicate` slot / high cosine), so its salience climbs. The
  louder it gets, the harder it is to miss on your next diff.
- **Forgetting, on purpose** — continuous salience decay ages one-off noise (a
  tool you tried once) below a floor so it stops polluting advice.
- **Contradiction resolution** — a newer decision supersedes the old one in the
  same slot (Redux → Zustand), old memory kept with an audit trail.
- **Context packing** — a 0/1 knapsack selects the optimal memory set under a
  token budget; the Inspector shows what was packed, what dropped, and **why**.
- **Cross-session** — memories persist between runs (JSON store locally,
  ApsaraDB pgvector on Alibaba Cloud) so each session resumes instead of restarts.
- **Grounded review** — every review comment cites the specific memory it came
  from. Live retrieve → pack → ground is visible as the engine works.

## 🔌 Use it as an MCP server (the production surface)

Engram isn't a webpage you paste diffs into — the demo Inspector is just a window
into the engine. The way you actually *use* it is as an **MCP server**: a
long-term developer memory any MCP client (Claude Desktop, Cursor, Windsurf) can
call. It learns your recurring mistakes and grounds a review of your next diff in
a specific memory — memory that **forgets** one-off noise and gets **louder** on
repeated mistakes, unlike the general chat-memory MCP servers.

```bash
npm run mcp        # stdio MCP server (backend=mock; set ENGRAM_BACKEND=qwen for live)
```

Register it (Claude Desktop `claude_desktop_config.json` / Cursor MCP settings):

```json
{
  "mcpServers": {
    "engram": {
      "command": "npx",
      "args": ["tsx", "/ABSOLUTE/PATH/qwenhack/apps/mcp/server.ts"],
      "env": { "ENGRAM_BACKEND": "qwen" }
    }
  }
}
```

Tools it exposes:

| Tool | What it does |
|---|---|
| `engram_review` | Review a diff grounded in your memories; a warn cited to a *mistake* memory is a repeat bug caught before it ships (and reinforces that memory). |
| `engram_recall` | Recall the memories most relevant to a query/context, ranked by relevance · recency · salience. |
| `engram_learn` | Learn from a commit (message + diff) — extract, reinforce repeats, supersede contradictions. |
| `engram_inspect` | List active memories with salience + reinforcement counts. |

Memory persists via the store factory — JSON locally, ApsaraDB pgvector on
Alibaba Cloud — so it accumulates across sessions. Same engine as the benchmark
and the Inspector; this is just the surface an agent talks to.

## 🤖 How Qwen powers it (all reasoning)

| Job | Model (DashScope) |
|---|---|
| Memory extraction from diffs (per-commit, cheap) | `qwen-turbo` |
| Memory-grounded code review (the agent) | `qwen-plus` |
| Heavy reasoning tier | `qwen-max` |
| Embeddings for retrieval (1024-dim) | `text-embedding-v3` |

One client (`qwen-client.ts`) handles tiered routing, retries, timeouts,
JSON repair, and token accounting against the OpenAI-compatible DashScope
endpoint. `npm run proof` makes a live call and prints
`Qwen/DashScope OK · embed dims=1024`.

## 🏗️ Architecture

```mermaid
flowchart LR
    U[Developer] -->|commit / diff| API[Hono API + Memory Inspector]
    AGENT[Coding agent · Claude Desktop / Cursor] -->|MCP tools| MCP[Engram MCP server]
    API --> ENG[Memory Engine]
    MCP --> ENG

    subgraph Qwen Cloud · DashScope
      LLM[qwen-plus · qwen-turbo · qwen-max]
      EMB[text-embedding-v3]
    end

    ENG -->|extract · review| LLM
    ENG -->|embed| EMB

    subgraph Alibaba Cloud
      PG[(ApsaraDB PostgreSQL · pgvector)]
      JSON[(JSON store · cross-session)]
    end

    ENG -->|write / retrieve / reinforce / forget| PG
    ENG --> JSON

    API -->|salience · decay · packed/dropped · grounding| U
```

## 🚀 How to run

```bash
npm install
npm test                    # 29 deterministic tests (scoring / packing / decay / reinforce)
npm run bench               # A/B/C benchmark — prints the table above

# Live Memory Inspector UI + API (the demo hero):
npm run dev                 # → http://127.0.0.1:5273

# Headless CLI — the whole engine from the terminal:
npm run engram learn         # learn a developer from planted git history
npm run engram inspect       # salience bars, reinforcement counts, audit trail
npm run engram review        # memory-grounded review of a fresh diff
npm run engram forget        # run the decay job; watch a one-off memory age out

# Go live on Qwen / Alibaba Cloud:
cp .env.example .env        # add DASHSCOPE_API_KEY + DASHSCOPE_BASE_URL
npm run hello               # live Qwen round-trip: chat + structured + embeddings
npm run engram review --qwen # same pipeline, live inference
npm run proof               # proof of the live Alibaba Cloud (Qwen/DashScope) call
```

> **Live by default, mock for CI.** The demo and benchmark above run on **live
> Qwen** when `DASHSCOPE_API_KEY` is set. Every command *also* runs with no key
> via a deterministic `MockMentorModel` behind the same `MentorModel` interface
> — so tests and CI are reproducible and free. The mock is labeled as such in the
> UI (`backend: mock`); it is never presented as live intelligence.

## ✅ Status (honest)

- **Qwen on Alibaba Cloud is live and proven** — extraction, review, and
  embeddings all run on DashScope; `npm run proof` shows the round-trip. The
  demo hero, the benchmark, and cross-session persistence are all verified on
  `backend=qwen`.
- **Managed infra deploy (OSS + Function Compute) is wired but not yet
  activated** — `s.yaml`, `Dockerfile`, and the pgvector store adapter are in the
  repo, but the Alibaba Cloud account is behind a "complete your information"
  verification gate that disables OSS and Function Compute. It flips on the
  moment the account clears; no code change needed.

## 🧩 Project layout

```
packages/memory-engine/     standalone, unit-tested engine (the moat)
  src/scoring.ts            pure hybrid ranking (tested to exact numbers)
  src/packing.ts            0/1 knapsack context packer (tested)
  src/decay.ts              forgetting + contradiction resolution (tested)
  src/engine.ts             write / retrieve / reinforce / pack / forget
  src/extract.ts            Qwen structured-output memory extraction
  src/model/qwen-client.ts  one client: retries, timeouts, JSON repair, tokens
  src/store/                MemoryStore interface · in-memory / JSON / pgvector
apps/api/server.ts          Hono API + static Memory Inspector (the demo hero)
apps/web/index.html         the Memory Inspector UI (self-contained)
apps/mcp/server.ts          MCP server — the production surface (agents call the engine)
cli/engram.ts                headless CLI (learn / review / forget / inspect)
bench/                      synthetic A/B/C harness + real-repo runner (from-repo.ts, real-run.ts)
alibaba/                    proof.ts + deploy config (s.yaml, Dockerfile)
```

## 🔧 Tech

TypeScript · Qwen via DashScope (OpenAI-compatible) · ApsaraDB for PostgreSQL
(pgvector) · Function Compute / OSS · Hono · self-contained HTML Inspector.

## 📄 License

MIT — see [LICENSE](./LICENSE).
