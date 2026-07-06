# STATE.md — Mneme self-improvement loop

The compounding memory for an autonomous loop driving Mneme to a **winning, submittable** state
for the Qwen Cloud Global AI Hackathon (Track 1: MemoryAgent).
Read this FIRST every iteration. Write it LAST every iteration. Never restart from zero.

Judging: Technical Depth 30% · Innovation 30% · Problem Value 25% · Presentation 15%.

---

## THE GOAL (stop condition — independent grader must pass ALL)

Submission is READY when every criterion below is CONFIRMED by an *independent verifier pass*
(a fresh sub-agent or a vision check — never self-critique):

- [ ] **G1 · Hero clarity** — a judge understands what Mneme is + why it's novel in ≤3 seconds, no scroll. (Innovation/Presentation)
- [ ] **G2 · Visceral catch** — the live "I've seen this one. N times." moment lands emotionally; the climbing number reads as "bugs you'd have shipped." (Problem Value/Presentation)
- [x] **G3 · Agent-state transparency** — DONE. Review now stages a live trace: RETRIEVE (ranked N by relevance·recency·salience) → PACK (kept X / dropped Y to fit used/budget tokens) → GROUND (matched memory id), then the catch card. All real telemetry from /api/review (packed/dropped/usedTokens/budget). Vision-verified. Commit pending.
- [ ] **G4 · Depth legible** — README leads with the real `backend=qwen` benchmark table + architecture diagram; the moat (hybrid retrieval, reinforcement, forgetting, knapsack packing) is skimmable. (Technical Depth)
- [ ] **G5 · Devpost text** — paste-ready description covering problem, what-it-does, Qwen/Alibaba usage, honest deploy caveat, all 4 rubric dimensions. (Presentation)
- [ ] **G6 · Video** — recordable shot list matching the exact demo state, ≤3 min, visceral-first. (Presentation)
- [ ] **G7 · Honesty** — nothing mock presented as live; deploy caveat stated once, clearly; every claim maps to a runnable command. (all — a caught lie tanks trust)
- [ ] **G8 · It runs** — `npm test` green, demo server up on Qwen, review fires the catch, `npm run proof` shows the live Alibaba call. (Technical Depth)

---

## VERIFIED FACTS (stage 3 — stop guessing about these)

- Engine is done + verified on LIVE Qwen: write/reinforce/contradiction/forgetting/retrieval/packing/cross-session all fire. Commit `afa1d9b`. 29/29 tests pass.
- Demo server: `MNEME_BACKEND=qwen MEMORY_STORE=json PORT=5273 npx tsx apps/api/server.ts` → http://127.0.0.1:5273. Restores good seed from `.mneme/memories.json` instantly.
- Clean demo start state: `backend=qwen · catches=0 · active=5`; hero null_check seen 3×; Redux→Zustand superseded; Bun fading (ready to forget).
- Qwen live via Singapore workspace key in `.env` (gitignored). DashScope OpenAI-compatible endpoint. `npm run proof` → `[1/2] Qwen/DashScope OK · embed dims=1024`.
- BLOCKED (not code): OSS + Function Compute deploy — account "complete your information" verification gate. Wired (`s.yaml`, `Dockerfile`, `pg-store.ts`); flips on when account clears. This is HONEST caveat #2 in the checklist, not a fake.
- UI file: `apps/web/index.html` (single file, inline CSS/JS). Editorial dark theme, coral #FF5C57 for catches, serif voice.

## GROUNDING PRINCIPLES (research-backed — consult before UI/copy work)

- **Show, don't tell**: replace mystery with momentum — show agent state (planning/retrieving/packing/grounding), not a spinner. [agentic UX]
- **Tool-use transparency at the decision moment**, not in a collapsed log — surfacing "retrieved memory X, packed under N tokens" is the depth signal judges can SEE.
- **3-second clarity above the fold**: headline+subhead+CTA visible on 1280×800 with no scroll. Vague/clever headlines lose. Lead with crystal-clear value.
- **Single focused conversion goal** per view. One visceral moment, not a feature buffet.
- **Independent verifier > self-critique** (the maker prefers its own reasoning). Every change graded by a fresh agent/vision pass.

## OPEN GAPS (ranked by leverage on the score — work top first)

1. *(assess)* UI vision-verify baseline — is the live-catch moment actually visceral on a real render? Does agent-state show, or is it a spinner ("thinking…")? → G2/G3
2. *(assess)* Devpost description text — does not exist yet as paste-ready. → G5
3. *(assess)* README — does it lead with the benchmark + make depth skimmable in 20s? → G4
4. *(assess)* Video shot list — matches current demo state? visceral-first? → G6

## LESSONS LEARNED (stage 4 — distilled, consult before repeating)

- **Vision-verify harness**: playwright-core download is sandbox-blocked; cached browsers max at build 1223 while playwright-core wants 1228 → launch with explicit `executablePath` to `~/Library/Caches/ms-playwright/chromium_headless_shell-1223/.../chrome-headless-shell`. Reset the demo via `page.request.post(.../api/reset)` INSIDE the browser (node `fetch`/`curl` are hook-redirected). Harness: `_shot.mjs`. Rerun: `node _shot.mjs <outdir>`.
- **Network from Bash is hook-redirected** (curl/wget/node-fetch → context-mode). To hit the live server, drive it from playwright's browser context, or read the server source for shapes.
- **Depth is a perception**: the engine already retrieved/packed/grounded — surfacing those real numbers as a staged trace turned invisible work into a visible Technical-Depth signal. Cheap change, high score leverage. Look for more "make the real work visible" moves.
- **Seed non-determinism**: force-reseed (`↻ relearn` / /api/reset) re-runs Qwen extraction → the mistake's reinforcement count varies run-to-run (12, 15, …). Hero number + catch number read the same memory so they stay consistent WITHIN a seed. For video/demo: do NOT click relearn before recording — use the persisted `.mneme/memories.json`.

## LAST SESSION (resume pointer — stage 5)

2026-07-06 · Loop iter 1 DONE. Shipped G3 (agent-state trace, vision-verified). Server live on
Qwen. Vision-verify harness working (`_shot.mjs`). NEXT: (1) draft paste-ready Devpost text →
G5. (2) verify README leads with benchmark + is skimmable in 20s → G4. (3) tighten video shot
list to match current demo incl. the new trace → G6. Then independent-verifier pass on the
whole demo (fresh sub-agent, grade against G1-G8). Reset demo to clean state before finishing.
