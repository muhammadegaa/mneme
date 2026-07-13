# Engram — Hackathon Demo Recording Script (the REAL submission video)

> This is the **substantive demo** judges score on — the real product running, the stack named,
> the mechanism explained, and Track 1 mapped explicitly. Screen-record yourself following it.
> Target **~2.5–3 min**. Tone = a developer walking a judge through a working system, not a promo.
> (The 1:42 promo cut in `videos/engram-launch/renders/video.mp4` is now just a social teaser.)

---

## 0. Prerequisites (do once, before recording)

- [ ] **Live box is redeployed + up** (for Scene 8's proof). Run `docs/DEPLOY.md` → "Redeploy + lockdown". Confirm `curl http://47.84.61.162/api/health` → `{"ok":true,"backend":"qwen"}`.
- [ ] **Local env for live Qwen**: `.env` has `DASHSCOPE_API_KEY` + `DASHSCOPE_BASE_URL`. You'll run a couple of live-Qwen commands (~$0.02 total).
- [ ] Terminal at repo root `~/code/qwenhack`, **large font** (18pt+), dark theme, wide window.
- [ ] Open `docs/architecture.png` in an image viewer (Scene 3).
- [ ] (Optional but strongest) Engram registered as an MCP server in **Cursor or Claude Code** — config in `README.md`. If setup is fiddly, use the terminal MCP call in Scene 6 instead.
- [ ] Screen recorder ready (QuickTime / OBS / ScreenStudio), 1920×1080, 30fps, with mic or record VO separately.

## Honesty guardrails (do not violate on camera)
- Everything shown is REAL: `backend=qwen` where live, `backend=mock` labeled where deterministic. Never imply mock is live.
- The catch numbers are real reinforcement counts / real detections — don't edit them.
- Say "wired scale path" for Function Compute / ApsaraDB (the ECS deploy is what's live), not "deployed" for FC.

---

## Scene-by-scene

### Scene 1 — The problem (0:00–0:15)
**On screen:** a code editor showing a plain line: `const user = await res.json()` (no `res.ok` check). Optionally a `git log` scrolling past.
**Say:**
> "The bugs that reach production aren't exotic — they're the same handful each of us makes over and over. Forgetting to check `res.ok` before parsing JSON. An empty `catch`. Reaching for `var`. A linter flags it once, you mute it, and you ship it again. No tool remembers that *you specifically* keep doing this."

### Scene 2 — What it is + Track 1 mapping (0:15–0:35)
**On screen:** the README top, or a title slide.
**Say:**
> "Engram is our entry for Track 1 — MemoryAgent. It's a **persistent, queryable memory of a developer's recurring mistakes**, mined from git history. It **retains** what you keep getting wrong across sessions, and any coding agent can **query** it over MCP to review your next diff. Not chat memory — a memory of the mistakes you already shipped."

### Scene 3 — How it works: the architecture (0:35–1:10)
**On screen:** `docs/architecture.png` full-screen. Point at each stage as you say it.
**Say:**
> "Here's the engine. On the **write** path, Qwen extracts atomic memories from each commit — but mistakes are detected **deterministically** from the real code, so they're grounded, never hallucinated. On the **read** path: hybrid ranking — semantic, recency, and salience; **reinforcement** so a repeated mistake gets louder; **forgetting** so one-off noise decays; **contradiction resolution** when you change your stack; a **0/1-knapsack** packer that fits the best memories under a token budget; and finally **grounding** — every review comment cites a specific memory and must match real code in the diff."

### Scene 4 — The stack (1:10–1:30)
**On screen:** split — the Qwen model-routing table (README) + `docs/architecture.png` cloud layer. Or just narrate over the architecture.
**Say:**
> "Everything runs on **Qwen, on Alibaba Cloud**. Extraction on `qwen-turbo`, review on `qwen-plus`, heavy reasoning on `qwen-max`, retrieval on `text-embedding-v3`. The engine is a standalone TypeScript package with 47 tests. It's exposed as an **MCP server** any agent can call, persists to a JSON store locally or **ApsaraDB pgvector** on Alibaba, and it's deployed on an Alibaba Cloud **ECS** instance."
**On screen (optional):** run `npm test` → hold on `47 passed`.

### Scene 5 — See it learn (1:30–1:55)
**On screen:** run this and let it play:
```
npm run demo:catch
```
**Say:**
> "Let's point it at a real repo it's never seen — `codehere`. It learns twenty-nine commits and, with nothing planted, extracts the mistakes this developer actually repeats: `var` three times, empty catch blocks twice. Every one is verifiable in the commits — grounded, not guessed."

### Scene 6 — The catch, over MCP (1:55–2:25) ⭐ the hero
**On screen — pick ONE:**
- **(A) Best:** in Cursor/Claude Code with Engram registered, ask the agent: *"review this diff"* with the `getUser` diff (fetch → `res.json()`, no `res.ok`). Show the agent call `engram_review` and return the catch **in the editor**.
- **(B) Reliable fallback (terminal, real live Qwen):**
```
rm -f .engram/mcp-memories.json
ENGRAM_BACKEND=qwen MEMORY_STORE=json npm run demo:mcp
```
This spins up the MCP server and drives it like an agent would — prints `engram_inspect`
(5 memories, null-check seen 18×, `backend: qwen`) then the live `engram_review` catch.
**Say:**
> "Now the payoff. My agent hands Engram a fresh diff over MCP — fetch a user, parse the JSON, return it. Looks fine. But Engram remembers I forget the `res.ok` check — it's seen it eighteen times. So it catches it, live on Qwen, **grounded in my own memory**, before it ships. Catch it again and the memory gets louder. That's the loop."

### Scene 7 — Grounded, never fabricates (2:25–2:45)
**On screen:** `bench/results/real-ravenote.md` and `real-codehere.md` side by side, or narrate over Scene 5's output.
**Say:**
> "The thing that makes this trustworthy: it never invents. On `codehere` it caught two real mistakes. On `ravenote` — which has none of them — it correctly found **nothing**. Detection is deterministic and grounded in real code, so a memory that would hallucinate is worse than no memory — and ours doesn't."

### Scene 8 — Benchmark + proof of deployment (2:45–3:10)
**On screen:** run in sequence:
```
npm run bench                                  # the A/B/B+/C table
npm run proof                                  # live Qwen on Alibaba Cloud
curl -s http://47.84.61.162/api/health         # the live ECS box
```
**Say:**
> "Does the memory logic actually pay off? Full-context and naive top-k leak stale advice a hundred percent of the time; the moment Engram forgets superseded facts, contradiction accuracy goes to a hundred percent and stale leakage to zero — at a sixth of the tokens. And it's live: here's the Qwen call on Alibaba Cloud, and the health check on our ECS box in Singapore returning `backend: qwen`."

### Scene 9 — Track recap + close (3:10–3:25)
**On screen:** the live Inspector `http://47.84.61.162`, or a title card.
**Say:**
> "That's Engram — a MemoryAgent that's **persistent, queryable, and cross-session**: it learns your recurring mistakes from git, remembers them across sessions, and catches them on your next diff over MCP. Live on Alibaba Cloud, open source, MIT."

---

## Command cheat-sheet (copy-paste in order)

```bash
# Scene 4 — credibility
npm test                                        # 47 passed

# Scene 5 — learn a real unseen repo → grounded catch (free, deterministic)
npm run demo:catch

# Scene 6B — live MCP catch on Qwen (fallback if not using Cursor/Claude Code)
rm -f .engram/mcp-memories.json
ENGRAM_BACKEND=qwen MEMORY_STORE=json npm run demo:mcp

# Scene 8 — benchmark + proof of Alibaba Cloud deployment
npm run bench                                   # free
npm run proof                                   # live Qwen (~$0.01)
curl -s http://47.84.61.162/api/health          # live ECS box (needs redeploy)
```

## Recording tips
- Record each scene as a separate clip; edit them together. Redo a take freely.
- For the live-Qwen scenes (6B, proof), the call takes ~2–4s — let it breathe, don't cut early.
- If a live command stalls (Qwen slow), you have the deterministic `demo:catch` + `bench` as always-works anchors.
- Keep total ~3 min. If long, cut Scene 7 into a line inside Scene 5.

## What still needs YOUR hands
- The **screen recording** itself (I can't capture your screen).
- **Redeploy the box** so Scene 8's `curl` returns live (`docs/DEPLOY.md`).
- Optional: the **Cursor/Claude Code MCP setup** for Scene 6A (the strongest hero) — else use 6B.
