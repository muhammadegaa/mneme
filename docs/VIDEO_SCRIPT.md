# Engram — 3-minute demo video script + shot list

Goal: win on the rubric in ~180 seconds. **Lead with the product**: Engram is a
memory *any coding agent can call over MCP* — it learns the mistakes you repeat
from your git history and catches them on your next diff. Show the agent surface
first (the MCP tools), then open the Inspector as the "look inside the engine"
visual, prove the moat (benchmark), close on Qwen / Alibaba Cloud.
**Everything here is real and running on live Qwen — no fakery, no mock, no false
claims.**

Pre-roll setup (NOT recorded):
- Terminal A — the MCP surface. Register/run the server on Qwen:
  `ENGRAM_BACKEND=qwen npm run mcp` (or have it registered in Claude Desktop /
  Cursor via the config in the README). Confirm it reports `backend=qwen`.
- Terminal B / browser — the Inspector, on Qwen:
  `ENGRAM_BACKEND=qwen MEMORY_STORE=json PORT=5273 npx tsx apps/api/server.ts`
  → `http://127.0.0.1:5273`. Top-right badge must read **backend: qwen** (green).
- Do NOT click "↻ relearn" before recording — it re-runs Qwen extraction and the
  numbers shift. Use the persisted seed as-is.
- A terminal in the repo, large font, for the benchmark + proof beats.

VO is tight; trim to fit. Total ≈ 180s.

---

### 0:00–0:14 · Hook  *(screen: an agent about to call the tool)*
**VO:** "Your linter knows the language. Your AI pair-programmer forgets you the
second the session ends. Neither one remembers the bug you keep shipping. Engram
does — and it plugs into the agent you already use."
**Shot:** Claude Desktop / Cursor with Engram registered as an MCP server (or
Terminal A showing `engram` connected, `backend=qwen`). The four tools visible:
`engram_review`, `engram_recall`, `engram_learn`, `engram_inspect`.

### 0:14–0:52 · THE CATCH, over MCP  *(screen: the agent calling `engram_review`)*
**VO:** "This is a memory server, but not the generic kind. It read my git history
and learned how *I* code. Here's a fresh diff — fetch a user, parse the JSON,
return it. Looks fine. Watch my agent hand it to Engram."
**Shot:** invoke `engram_review` on the `getUser` diff (`res.json()` with no
`res.ok` check). The tool result returns: *reviewed against N of your memories,
packed X/budget tokens* → a **⚠ WARN** grounded in a specific memory:
*"↳ grounded in your memory '…handle non-ok responses / null checks…' (seen N×)"*
plus *"1 repeat mistake caught before shipping — reinforced."*
**VO (kicker):** "That's not a generic lint rule. It's grounded in a specific
memory of *mine*, and it's loud because I've earned it N times. Catch it again and
the memory gets *louder* — the inverse of forgetting."

### 0:52–1:26 · LOOK INSIDE THE ENGINE  *(screen: the Inspector, backend: qwen)*
**VO:** "Every time an agent calls that tool, this is what happens inside — and the
Inspector lets you watch it think."
**Shot:** the Inspector's live trace on the same review — **RETRIEVE** ranked N by
relevance·recency·salience → **PACK** kept X / dropped Y to fit used/budget tokens
(a real 0/1 knapsack) → **GROUND** matched memory `m_…`. Then the catch card:
**"I've seen this one. N times."**
**VO:** "Retrieve what it knows about me, pack the best memories under a token
budget with a knapsack solver, ground the verdict in one specific memory. Same
engine the MCP tool runs — this is just the window into it."

### 1:26–1:50 · EARNED, CHANGES ITS MIND, FORGETS  *(screen: memory book)*
**VO:** "Nothing here was typed in by hand. Every memory was extracted from a real
commit — my style, my tools, the mistakes I repeat. And it maintains itself."
**Shot:** scroll "What Engram knows about you." Point at the loudest **Mistakes you
repeat** bar + **seen N×**. Then the "changed its mind" receipt:
~~uses Redux~~ → **uses Zustand**. Then click **run the forgetting job →** — the
faint one-off (a Bun experiment) ages out.
**VO:** "Repeat a mistake, its memory strengthens. Change your stack, the old fact
is superseded — with receipts, not deleted. A tool you tried once decays and stops
polluting advice."

### 1:50–2:20 · THE MOAT — benchmark + it never invents  *(screen: terminal)*
**VO:** "Does the engine beat the alternatives? We benchmarked it on live Qwen
embeddings — and on two real repos it had never seen."
**Shot:** run `npm run bench`. Hold on the A/B/C table. Then run `npm run demo:catch`.
**VO:** "Full-context stuffing and naive top-k both leak stale facts 100% of the
time and resolve contradictions only half the time. Engram: 100% contradiction
accuracy, zero stale leakage. And it doesn't hallucinate mistakes — detection is
grounded in real code. On `codehere` it caught two recurring mistakes I actually
make; on `ravenote`, which has none of them, it correctly found *nothing* to flag.
Here it learns a repo and catches the same mistake on a fresh diff — grounded in a
specific memory, and you can reproduce it offline for free."

### 2:18–2:46 · QWEN ON ALIBABA CLOUD  *(screen: terminal + badge)*
**VO:** "Every memory operation runs on Qwen, on Alibaba Cloud — extraction on
qwen-turbo, review on qwen-plus, retrieval on text-embedding-v3."
**Shot:** run `npm run proof` → hold on `Qwen/DashScope OK · embed dims=1024`. Cut
to the Inspector badge: **backend: qwen** + the live token counter.
**VO (honest close on infra):** "It's deployed and running right now on an Alibaba
Cloud ECS box in Singapore, on live Qwen. The managed serverless path — Function
Compute, ApsaraDB pgvector — is wired as the scale option; move persistence with
one env var."

### 2:46–3:00 · Close  *(screen: hero title card)*
**VO:** "Engram. A memory your coding agent can call — the reviewer that remembers
how you code. Open source, MIT."

---

## Shot list (capture order — record clips, edit to the script)
1. Agent surface — Claude Desktop / Cursor with Engram registered, or Terminal A
   showing the 4 tools + `backend=qwen`.
2. `engram_review` on the `getUser` diff — capture the WARN grounded in a memory +
   "1 repeat mistake caught before shipping — reinforced." Record 2 takes.
3. Browser Inspector — the same review: full trace reveal (RETRIEVE→PACK→GROUND) +
   catch card. Record 2 takes. `backend: qwen` badge visible.
4. Browser: scroll the memory book; loudest **Mistakes you repeat** bar + **seen N×**.
5. Browser: the Redux→Zustand receipt; click **run the forgetting job →**.
6. Terminal: `npm run bench` — hold 5s on the table.
6b. Terminal: `npm run demo:catch` — the learn→catch loop on codehere; hold on the
   grounded, signature-verified CATCH (var, seen 3×) + `grounded=true`.
7. Terminal: `npm run proof` — hold on the live `Qwen/DashScope OK · embed dims=1024` line.
8. Browser: `backend: qwen` badge + footer token counter.
9. Title card.

## Rubric mapping (why each beat earns points)
- **Technical depth (30%)** → the MCP tool surface, the retrieve→pack→ground trace
  (real telemetry), the knapsack drop count, the benchmark table.
- **Innovation (30%)** → developer-mistake memory from git (unclaimed niche), the
  reinforced-mistake catch, forgetting + supersession — not general chat memory.
- **Problem value (25%)** → the hook (the bug you keep shipping that no tool learned),
  delivered *inside the agent you already use* via MCP.
- **Presentation (15%)** → the editorial Inspector, the staged trace, the honest cloud close.

## Honesty guardrails (do not violate on camera)
- Record on **backend: qwen** only. Never show `backend: mock` and imply it's live.
  This applies to the MCP surface too — run `ENGRAM_BACKEND=qwen npm run mcp` for
  the on-camera tool call, and verify it returns a real grounded catch before
  recording (the live-Qwen MCP path shares the API's proven client, but confirm it
  once on the day — do not record an unverified call).
- `npm run proof` shows the Qwen call only. Do NOT claim an OSS round-trip. The app
  IS live on Alibaba Cloud ECS (Singapore); state Function Compute / ApsaraDB as the
  wired scale path, not as blocked.
- The catch number (N) is the real reinforcement count from the seed. Don't edit it
  to a rounder number.
- The unseen-repo claim = the grounded real-repo runs: `codehere` (var ×3, empty-catch
  ×2 — both verifiable in the commits) and `ravenote` (0 — correct silence). Both are
  reproducible offline via `npm run demo:catch` / `bench/real-run.ts`. Do NOT show or
  cite the pre-gate hallucination as a current result — the guard now rejects it.
