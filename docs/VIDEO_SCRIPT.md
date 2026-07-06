# Mneme — 3-minute demo video script + shot list

Goal: win on the rubric in ~180 seconds. Lead with the hero (a mistake that gets
*louder*), show the engine think (retrieve → pack → ground), prove the moat
(benchmark), close on Qwen / Alibaba Cloud. **Everything here is real and running
on live Qwen — no fakery, no mock, no false claims.**

Pre-roll setup (NOT recorded):
- Start the demo on Qwen: `MNEME_BACKEND=qwen MEMORY_STORE=json PORT=5273 npx tsx apps/api/server.ts`
  → open `http://127.0.0.1:5273`. The top-right badge should read **backend: qwen** (green).
- Do NOT click "↻ relearn" before recording — it re-runs Qwen extraction and the
  numbers shift. Use the persisted seed as-is.
- A terminal in the repo, large font, for the benchmark + proof beats.

VO is tight; trim to fit. Total ≈ 180s.

---

### 0:00–0:16 · Hook  *(screen: the hero, full-bleed)*
**VO:** "This number is how many times you'd have shipped the exact same bug.
Your linter never noticed. Copilot forgot you the second the session ended.
Mneme caught every one."
**Shot:** hold on the big serif hero number and the line *"times you'd have
shipped the same bug. Mneme caught every one."* Badge **backend: qwen** visible.

### 0:16–0:52 · THE LIVE CATCH  *(screen: the "live catch" panel)*
**VO:** "Here's a fresh diff — fetch a user, parse the JSON, return it. Looks fine.
Watch what Mneme does with it."
**Shot:** the editor shows `getUser` calling `res.json()` with no `res.ok` check.
Click **Review with memory →**.
**VO:** "It retrieves what it knows about me, packs the best memories under a token
budget, and grounds its verdict."
**Shot:** the trace reveals live — **RETRIEVE** ranked N memories · **PACK** kept X,
dropped Y to fit used/budget tokens · **GROUND** matched memory `m_…`. Then the
catch card rises: **"I've seen this one. N times."**
**VO (kicker):** "Not a generic lint rule — it's grounded in a specific memory of
*mine*, and it's loud because I've earned it N times. That's the inverse of forgetting."

### 0:52–1:18 · WHAT IT KNOWS — earned, not configured  *(screen: memory book)*
**VO:** "Every memory here was extracted from a real commit — my style, my tools,
the mistakes I repeat. Nothing typed in by hand."
**Shot:** scroll "What Mneme knows about you." Point at **Mistakes you repeat** —
the null-check memory has the longest strength bar and a **seen N×** tag.
**VO:** "Repeat a mistake and its memory gets stronger. The louder it is, the
harder it is to miss."

### 1:18–1:44 · CHANGES ITS MIND + FORGETS  *(screen: lower sections)*
**VO:** "Mneme also changes its mind — with receipts — and forgets on purpose."
**Shot:** the "changed its mind" receipt: ~~uses Redux~~ → **uses Zustand**. Then
click **run the forgetting job →** — the faint one-off (a Bun experiment) ages out.
**VO:** "I moved off Redux; the old fact is superseded, not deleted. A tool I tried
once decays and stops polluting advice."

### 1:44–2:16 · THE MOAT — benchmark  *(screen: terminal)*
**VO:** "Does the engine actually beat the alternatives? We benchmarked it on live
Qwen embeddings."
**Shot:** run `npm run bench`. Hold on the A/B/C table.
**VO:** "Full-context stuffing and naive top-k both leak stale facts 100% of the
time and resolve contradictions only half the time. Mneme: 100% contradiction
accuracy, zero stale leakage — at six times fewer tokens. Forgetting and
supersession are the difference between a memory *engine* and a vector lookup."

### 2:16–2:46 · QWEN ON ALIBABA CLOUD  *(screen: terminal + badge)*
**VO:** "Every memory operation runs on Qwen, on Alibaba Cloud — extraction on
qwen-turbo, review on qwen-plus, retrieval on text-embedding-v3."
**Shot:** run `npm run proof` → hold on `[1/2] Qwen/DashScope OK · embed dims=1024`.
Cut to the UI badge: **backend: qwen**, and the live token counter in the footer.
**VO (honest close on infra):** "The managed-infra deploy — Function Compute,
ApsaraDB, OSS — is fully wired and flips on the moment our account clears
verification. The intelligence is already live."

### 2:46–3:00 · Close  *(screen: hero title card)*
**VO:** "Mneme. The code reviewer that remembers how you code. Open source, MIT."

---

## Shot list (capture order — record clips, edit to the script)
1. Browser hero — hold on the number + headline + `backend: qwen` badge.
2. Browser: **Review with memory →** — capture the full trace reveal + catch card. Record 2 takes.
3. Browser: scroll the memory book; point at the loudest **Mistakes you repeat** bar + **seen N×**.
4. Browser: the Redux→Zustand receipt; click **run the forgetting job →** (one-off ages out).
5. Terminal: `npm run bench` — hold 5s on the table.
6. Terminal: `npm run proof` — hold on the live `Qwen/DashScope OK · embed dims=1024` line.
7. Browser: `backend: qwen` badge + footer token counter.
8. Title card.

## Rubric mapping (why each beat earns points)
- **Technical depth (30%)** → the retrieve→pack→ground trace (real telemetry), the knapsack drop count, the benchmark table.
- **Innovation (30%)** → the reinforced-mistake hero, forgetting + supersession, memory learned from git history.
- **Problem value (25%)** → the hook (the bug you keep shipping that no tool ever learned).
- **Presentation (15%)** → the editorial Inspector, the staged trace, the honest cloud close.

## Honesty guardrails (do not violate on camera)
- Record on **backend: qwen** only. Never show `backend: mock` and imply it's live.
- `npm run proof` shows the Qwen call only (`[1/2]`). Do NOT claim an OSS round-trip — OSS is blocked pending account verification. State the infra as "wired, flips on when the account clears."
- The catch number (N) is real reinforcement count from the seed. Don't edit it to a rounder number.
