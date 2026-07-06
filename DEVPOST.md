# Mneme — Devpost submission

> Paste-ready. Sections map to Devpost's standard fields. Every claim maps to a
> command you can run in the repo.

**Tagline:** The code reviewer that remembers you. It learns how *you* code from
your git history and catches the mistake you keep making — before it ships.

**Track:** Track 1 — MemoryAgent · **Repo:** https://github.com/muhammadegaa/mneme (MIT)

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

## What it does

Mneme reads your commit history and extracts atomic memories about how you
code, classified as **style · tech · mistake · project**. Then, on any new diff,
it runs a real memory pipeline you can watch happen:

- **Retrieve** — hybrid ranking over your memories: `semantic + recency + salience`.
- **Pack** — a 0/1 knapsack fits the best memory set under a fixed token budget
  (it shows what it kept, what it dropped, and why).
- **Ground** — every review comment cites the specific memory it came from.

The hero mechanic is **reinforcement**: each time you repeat a mistake, it
reinforces the *same* memory, so its salience climbs. The louder that memory
gets, the harder it is to miss. When Mneme catches the bug on your next diff it
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

The engine is a standalone, unit-tested TypeScript package (`@mneme/memory-engine`)
with pure, tested scoring / packing / decay math (29 deterministic tests). A single
Qwen client handles tiered routing, retries, timeouts, JSON repair, and token
accounting against the OpenAI-compatible DashScope endpoint. The demo is a Hono
API serving a self-contained Memory Inspector; memories persist across sessions
(JSON store locally, ApsaraDB PostgreSQL + pgvector on Alibaba Cloud).

We proved the moat with a **benchmark** (`npm run bench`, live `text-embedding-v3`):

| Config | Recall@5 | Contradiction acc. | Stale-fact leakage | Avg tokens |
|---|---|---|---|---|
| A — full-context stuffing | 100% | 50% | 100% | 446 |
| B — naive vector top-k | 100% | 50% | 100% | 67 |
| **C — Mneme (hybrid + forget + pack)** | **100%** | **100%** | **0%** | **69** |

Mneme matches full-context recall, resolves *every* contradiction, and drives
stale-fact leakage to zero — at ~1/6 the tokens. Forgetting + supersession is
exactly what a vector lookup can't do.

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

The managed-infra deploy (Function Compute + OSS + ApsaraDB pgvector) is fully
wired (`s.yaml`, `Dockerfile`, pgvector adapter) and flips on once our Alibaba
Cloud account clears its verification gate. Beyond that: a Git hook / CI check so
Mneme reviews every PR, and per-team memory so a whole codebase's habits compound.

## Built with

TypeScript · Qwen (DashScope: qwen-plus / qwen-turbo / qwen-max / text-embedding-v3)
· Alibaba Cloud (ApsaraDB PostgreSQL + pgvector, Function Compute, OSS) · Hono ·
Node.js
