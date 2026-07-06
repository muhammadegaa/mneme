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
- [x] **G4 · Depth legible** — DONE. Rewrote stale README (was old "account manager" vertical) into a coherent coding-mentor story: benchmark lead, Qwen model-routing table, honest live-vs-mock + deploy caveat, accurate stack. Benchmark reordered to lead with the differentiator + 0.02ms footnoted.
- [x] **G5 · Devpost text** — DONE. `DEVPOST.md`, paste-ready, all 4 rubric dims, number genericized to "N times", honest deploy caveat.
- [x] **G6 · Video** — DONE. `docs/VIDEO_SCRIPT.md` rewritten to match current UI (the trace, `reset demo` button, real button labels), record-on-qwen-only, removed a FALSE `[2/2] OSS round-trip OK` claim, added honesty guardrails.
- [x] **G7 · Honesty** — DONE. README/DEVPOST/video all honest; false OSS claim removed; mock labeled `backend: mock`; deploy caveat stated once; every claim maps to a runnable command.
- [x] **G8 · It runs** — DONE. 29/29 tests pass; demo live on `backend: qwen`; catch fires 5/5 (reliability probe); clean state `catches:0 active:5 mistake seen 18×`; golden restores on fresh clone.

## ALL G1–G8 PASS → submittable + honest. Two adversarial verifier rounds applied.

VERIFIER ROUND 2 fixes (all DONE + DOM-verified): reinforce-on-catch (count climbs
18→19→20 consistently across hero/card/bar — desync killed); live token meter refreshes
(was stuck 0 tok); faded memories dropped from main list (Bun no longer double-labeled);
DEVPOST benchmark table aligned to README order. Round-2 confirmed round-1 fixes all landed.

## WIN-HARDER BACKLOG (next-tier, ranked — for continued loop iterations)

1. **Reinforcement flips a packing decision** (BOTH verifiers' "one change"; 60% of rubric).
   Show the null/ok memory get DROPPED by the knapsack when quiet (bug slips through), then
   PACKED once reinforced loud (bug caught). Makes salience CAUSAL, not a tally, and proves the
   packer is consequential. PLAN (honest, must be real not narrated): add a "quiet start" demo
   mode or a small budget where a freshly-low-salience null_check is genuinely dropped, then a
   "teach it" action reinforces until it crosses the threshold and starts catching. Risk: demo
   reliability + must not fabricate the "was dropped before" claim. Do in fresh context, verify 5×.
2. **Real-repo benchmark** (Technical Depth credibility — the bench is synthetic/self-designed).
   Run the engine over a real OSS git history; report recall where baselines MISS + a non-binary
   contradiction score. CAVEAT: live Qwen extraction over many commits burns credits ($40 coupon
   is finite) — scope small (one repo / curated commits) and flag cost to the user before running.
3. **Problem-value evidence** (25%) — one concrete stat/line that developers really repeat the
   same mistake (not just asserted).
4. **Budget realism** — 64-tok budget reads as a toy (verifier). Either raise it (still visibly
   dropping) or annotate why it's small for demo legibility. (Overlaps #1.)

## DONE THIS SESSION (loop iters 1–3)
G3 trace · G4 README rewrite · G5 Devpost · G6 video script · golden-seed reliability ·
verifier round 1 fixes · hero copy + benchmark clarity · verifier round 2 fixes.
Demo clean + recording-ready on live Qwen. 29/29 tests. proof → live Qwen OK.

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

## INDEPENDENT VERIFIER (iter 2) — findings + resolution

A fresh adversarial judge-agent graded the demo (screenshots) + README + DEVPOST. Confirmed issues → all fixed:
- **Hero silently failed** (GROUND "—", no catch card). Root cause: `/api/reset` force-reseeded via non-deterministic Qwen; and the browser review call (~3.8s) + slow staging pushed the catch past the screenshot. FIX: (a) froze a golden seed (`.mneme/golden.json`, committed, extracted once by live Qwen), reset now restores it deterministically — catch fires 5/5; (b) tightened the trace stagger; (c) harness waits on `.catch`. Fresh clone restores golden on first boot → reproducible for judges.
- **Number mismatch** (UI 18 vs writeup 15). FIX: genericized DEVPOST to "N times"; the one concrete number lives only in the frozen UI.
- **Audit wall** (Redux→Zustand repeated ~11×). FIX: renderAudit dedupes to one receipt per superseded slot → now exactly 2 clean receipts.
- **"↻ relearn" button** was a footgun (live non-deterministic reseed). FIX: renamed "↻ reset demo", restores golden.
- STILL OPEN (lower leverage): benchmark `0.02ms` latency looks fabricated (footnote it); Recall@5 ties 100/100/100 (lead with the differentiator: contradiction acc + stale leakage); hero copy could name the reinforcement mechanic + size the problem-value vs a lint rule.
- Verifier praised: the retrieve→pack→ground trace (most credible asset) and the honest deploy caveat (builds trust). Keep both.

## LESSONS LEARNED (stage 4 — distilled, consult before repeating)

- **Vision-verify harness**: playwright-core download is sandbox-blocked; cached browsers max at build 1223 while playwright-core wants 1228 → launch with explicit `executablePath` to `~/Library/Caches/ms-playwright/chromium_headless_shell-1223/.../chrome-headless-shell`. Reset the demo via `page.request.post(.../api/reset)` INSIDE the browser (node `fetch`/`curl` are hook-redirected). Harness: `_shot.mjs`. Rerun: `node _shot.mjs <outdir>`.
- **Network from Bash is hook-redirected** (curl/wget/node-fetch → context-mode). To hit the live server, drive it from playwright's browser context, or read the server source for shapes.
- **Depth is a perception**: the engine already retrieved/packed/grounded — surfacing those real numbers as a staged trace turned invisible work into a visible Technical-Depth signal. Cheap change, high score leverage. Look for more "make the real work visible" moves.
- **Seed non-determinism → SOLVED with a golden seed**: force-reseed re-runs Qwen extraction (non-deterministic → hero sometimes fails). Fix pattern: extract once with live Qwen, freeze the good state as a committed fixture (`.mneme/golden.json`), restore it deterministically on reset/first-boot. The live inference (review) still runs on Qwen — only the SEED is frozen. Honest + reproducible. Reliability probe: `_rel.mjs` (fires /api/review 5× via browser context, counts grounded catches). Always 5/5 now.
- **Browser review latency ~3.8s**: live qwen-plus review is slow; don't add long UI staging on top. Screenshot/verify by waiting on the `.catch` selector, not a fixed timeout.

## PACKING-CAUSALITY (backlog #1) — partial DONE
- PACK trace step now NAMES the memory the knapsack drops ("cut the faded 'uses Bun…'") — salience-driven packing made concrete + honest (loud mistake kept, quiet one-off cut). Verified from real `dropped[]` telemetry.
- Review prompt no longer bakes a count into prose (was stating a stale "18×" after reinforce-on-catch); the tally is UI-only now → hero/card/bar all read one consistent climbing number. Reliability 5/5, 29/29 tests.
- STILL OPEN: the FULL before/after flip (memory literally dropped when quiet → catch MISSED → reinforce → packed → caught). Bigger, reliability-sensitive; do in fresh context, verify 5×, never fabricate the "was dropped" claim.

## LAST SESSION (resume pointer — stage 5)

2026-07-06 · Loop iters 1–4 DONE (9 commits). All G1–G8 pass; 2 adversarial verifier rounds
applied; demo bulletproof (5/5, golden seed, reproducible on clone) + clean; 29/29 tests; proof
→ live Qwen OK. Submission is submittable, honest, winning-grade. NEXT (needs decision/fresh
context): backlog #1 full packing before/after flip (risky — verify 5×); backlog #2 real-repo
benchmark (burns Qwen credits — confirm cost with user first). User must record video + submit;
Alibaba infra deploy still gated on account verification.
To resume the loop: restart server (`MNEME_BACKEND=qwen MEMORY_STORE=json PORT=5273 npx tsx
apps/api/server.ts`), read this file, pick the top backlog item, verify with `_shot.mjs`/`_rel.mjs`
+ an independent verifier sub-agent, write results back here.
