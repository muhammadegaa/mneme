# Engram — Devpost submission

> Paste-ready. Sections map to Devpost's standard fields. Every claim maps to a
> command you can run in the repo.

**Tagline:** The code reviewer that remembers you. It learns how *you* code from
your git history and catches the mistake you keep making — before it ships.

**Track:** Track 1 — MemoryAgent · **Repo:** https://github.com/muhammadegaa/mneme (MIT)

**🟢 Live on Alibaba Cloud:** http://47.84.61.162 — the Memory Inspector on real Qwen (`backend=qwen`), ECS · Singapore.

---

## Inspiration

Linters know the language. Copilot forgets you the moment the session ends. But
the bugs that actually reach production aren't exotic — they're the *same* handful
of mistakes each of us makes over and over: forgetting to check `res.ok` before
parsing JSON, swallowing errors in an empty catch, reaching for `var`. No tool
remembers that *you specifically* keep doing this. We wanted a reviewer with a
memory of the developer — one that gets sharper the more it sees you code.

That's also the honest core of "MemoryAgent." Most "AI memory" is just
`topK(cosine)` over a vector store: it can recall, but it can't forget, can't
resolve a contradiction, and can't tell a one-off from a habit. We wanted to
build the memory *engine* those demos skip.

And it's not CodeRabbit: tools like that learn from the review comments you
*write* — Engram learns from the mistakes you already *shipped* and never
commented on, mined from git history. The bug class it targets is the hardest to
catch — an **omission** (a missing `res.ok`, an empty `catch {}`): there's no bad
token to grep for, only the *absence* of a guard, which a linter can't flag.
Engram reinforces that missing-guard pattern into one memory that gets louder each
time you repeat it.

## What it does

Engram reads your commit history and extracts atomic memories about how you
code, classified as **style · tech · mistake · project**. Then, on any new diff,
it runs a real memory pipeline you can watch happen:

- **Retrieve** — hybrid ranking over your memories: `semantic + recency + salience`.
- **Pack** — a 0/1 knapsack fits the best memory set under a fixed token budget
  (it shows what it kept, what it dropped, and why).
- **Ground** — every review comment cites the specific memory it came from.

The hero mechanic is **reinforcement**: each time you repeat a mistake, it
reinforces the *same* memory, so its salience climbs. The louder that memory
gets, the harder it is to miss. When Engram catches the bug on your next diff it
says: *"I've seen this one. N times."* — where N is literally the number of times
you'd have shipped the same bug. It also **forgets on purpose** (a tool you tried
once decays away so it stops polluting advice) and **resolves contradictions**
(Redux → Zustand supersedes the old choice, with an audit trail kept).

## How we built it — and how it uses Qwen + Alibaba Cloud

Every piece of reasoning runs on **Qwen via Alibaba Cloud DashScope**:

| Job | Qwen model |
|---|---|
| Extract memories from each commit diff (cheap, per-commit) | `qwen-turbo` |
| Memory-grounded code review (the agent) | `qwen-plus` |
| Heavy reasoning tier | `qwen-max` |
| Embeddings for retrieval (1024-dim) | `text-embedding-v3` |

The engine is a standalone, unit-tested TypeScript package (`@engram/memory-engine`)
with pure, tested scoring / packing / decay math (29 deterministic tests). A single
Qwen client handles tiered routing, retries, timeouts, JSON repair, and token
accounting against the OpenAI-compatible DashScope endpoint. The demo is a Hono
API serving a self-contained Memory Inspector; memories persist across sessions
(JSON store locally, ApsaraDB PostgreSQL + pgvector on Alibaba Cloud).

We proved the moat with a **benchmark** (`npm run bench`, live `text-embedding-v3`):

Every config hits 100% Recall@5 (facts are retrievable) — so recall isn't the
story. It's the two columns a *forgetting-blind* store can't touch:

| Config | Contradiction acc. | Stale-fact leakage | Avg tokens | Recall@5 |
|---|---|---|---|---|
| A — full-context stuffing | 50% | 100% | 446 | 100% |
| B — naive vector top-k *(status-blind)* | 50% | 100% | 67 | 100% |
| **B+ — top-k + forgetting** *(fair baseline)* | **100%** | **0%** | 69 | 100% |
| **C — Engram (hybrid + forget + knapsack)** | **100%** | **0%** | 69 | 100% |

The status-blind strategies leak superseded facts 100% of the time; add forgetting
and it's fixed. We deliberately put a *fair* baseline (B+ = top-k **with**
forgetting, nothing else) in the ring — and it ties Engram on this small set.
That's the honest point: **forgetting/supersession is the differentiator here, not
the ranking or the packer.** Engram's hybrid rerank + knapsack earn their keep at
scale — visible live in the packing-causality panel and on the real repo below.

That bench is synthetic, so we also ran it on **a real 1,456-commit repo it had
never seen** (`tsx bench/real-run.ts ../codehere 30 --qwen`). With nothing planted,
it extracted 37 memories and flagged one **genuinely recurring mistake — "swallows
errors in empty catch blocks"** (seen 2×) — the exact anti-pattern from our Inspiration,
found in the wild for ~$0.02. We keep it honest: the same run's held-out live review
also hallucinated a *"uses `var`"* comment that wasn't in the diff, so we **discard**
it. Extraction over real history is grounded; a single live-review comment isn't —
full writeup in `bench/results/real-codehere.md`.

## Challenges we ran into

- **Getting the model to detect an *omission*.** A missing `res.ok` guard is the
  absence of code, not a token you can grep. We had to prompt Qwen to judge the
  anti-pattern with canonical predicates so repeat occurrences reinforce the same
  memory instead of scattering into new ones.
- **Making reinforcement/supersession reliable.** Qwen returned inconsistent
  "subjects" (sometimes a commit SHA, sometimes a filename), which broke slot
  matching. Normalizing the subject by memory kind fixed contradiction resolution
  and forgetting end-to-end on live Qwen.
- **Honesty over polish.** We kept a hard rule: the mock model is CI-only and
  labeled `backend: mock`; the demo and benchmark run on live Qwen. Nothing mock
  is ever presented as live intelligence.

## Accomplishments we're proud of

A memory system that actually completes the loop — recall, reinforce, forget,
resolve — not just retrieval; a benchmark that *proves* it beats the two obvious
baselines; and a demo where you watch the engine retrieve, pack under budget, and
ground its verdict in one of your own memories in real time.

## What we learned

Memory is a *systems* problem, not a prompt. The hard, interesting parts —
salience decay, knapsack packing under a token budget, contradiction audit trails,
turning a repeat mistake into a rising signal — live in the engine around the
model, not in the model call itself.

## What's next

Engram is **live on Alibaba Cloud** — an ECS instance in Singapore serving the
Memory Inspector on real Qwen (`backend=qwen`) at **http://47.84.61.162**, as a
persistent auto-restarting service. Next: move persistence from the on-disk JSON
store to the already-wired **ApsaraDB pgvector** adapter (`MEMORY_STORE=postgres`)
and the serverless **Function Compute** deploy (`s.yaml`, `Dockerfile`); then a Git
hook / CI check so Engram reviews every PR, and per-team memory so a whole
codebase's habits compound.

## Built with

TypeScript · Qwen (DashScope: qwen-plus / qwen-turbo / qwen-max / text-embedding-v3)
· Alibaba Cloud (ApsaraDB PostgreSQL + pgvector, Function Compute, OSS) · Hono ·
Node.js
