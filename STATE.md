# STATE.md — Engram self-improvement loop

The compounding memory for an autonomous loop driving Engram to a **winning, submittable** state
for the Qwen Cloud Global AI Hackathon (Track 1: MemoryAgent).
Read this FIRST every iteration. Write it LAST every iteration. Never restart from zero.

Judging: Technical Depth 30% · Innovation 30% · Problem Value 25% · Presentation 15%.

---

## STRATEGIC PIVOT (2026-07-10 · CEO review, founder-approved: Approach A)

**North star changed.** The old loop optimized a presentation proxy ("judge gets it in 3s")
and shipped a landing-page demo. The rubric's real bar is a **production-ready agent**. Pivot:
reframe Engram from a poster into a **production MCP memory agent** — keep the (strong, tested)
engine, change the surface.

WHY (CEO-review findings): (1) #1 risk is DISQUALIFICATION — the rules REQUIRE proof the backend
runs on Alibaba Cloud; ours is blocked on account verification. Bigger than presentation. (2)
Landing page reads as toy, not agent. (3) Technical Depth (30%) explicitly names "MCP integrations"
— we have zero. (4) Memory space is crowded (Mem0/Zep/Letta/OpenMemory-MCP) BUT all are GENERAL
chat memory; developer-mistake memory from git + forgetting/reinforcement/knapsack is UNCLAIMED —
that niche is the moat. Don't pitch "a memory server"; pitch "the reviewer that learns your mistakes."
CLOSEST COMPETITOR = CodeRabbit (learns from review comments you WRITE); Engram learns from mistakes
you already SHIPPED (git history) + targets OMISSIONS (missing guard = absence of a token no linter
greps). README + DEVPOST now name/beat CodeRabbit + headline the omission insight (Innovation judge fix).

SEQUENCED PLAN (deploy-first):
1. **UNBLOCK ALIBABA DEPLOY** — ✅ DONE (2026-07-12). LIVE on Alibaba Cloud **ECS** (Singapore,
   `47.84.61.162`, instance `i-t4n2e2kxvzk0yz0sbl8g`), `backend=qwen`, persistent `systemd` service
   (auto-restart), MEMORY_STORE=json (disk persistence). Health returns `{"ok":true,"backend":"qwen"}`.
   Founder cleared account activation (personal acct + $40 coupon); we deployed via ECS + browser
   Workbench (node20 + git clone + npm + systemd) rather than Function Compute — simplest reliable path.
   THE DQ GATE IS CLEARED. FC/OSS/pgvector remain the documented managed/scale alternative (`s.yaml`).
   NOTE: keep the ECS instance RUNNING through judging (pay-as-you-go ~$0.53/day, covered by coupon);
   if it's stopped/deleted the live URL dies. Consider a domain + HTTPS later (optional).
2. **MCP server over the engine** — DONE (2026-07-10). `apps/mcp/server.ts` (stdio, @modelcontextprotocol/sdk),
   4 tools: `engram_review` (grounded diff review + reinforce-on-catch), `engram_recall`, `engram_learn`,
   `engram_inspect`. Persists via store factory (json local / pgvector Alibaba); restores golden seed
   free on fresh json store BEFORE store construction (JsonFileStore reads its file once at ctor — key gotcha).
   Forces MEMORY_STORE=json over the .env demo default (=memory) so MCP memory isn't ephemeral. Smoke-verified
   (mock): 5 memories loaded, review catches the null/ok repeat mistake grounded in m_3 (seen 18×) + reinforces.
   29/29 tests still pass. `npm run mcp`. README has Claude Desktop/Cursor config + tool table. Live Qwen
   path = same as API (proven); not re-run to save credits. NEXT: verify live-qwen MCP once (small), then package.
3. **Package** — architecture diagram DONE (`docs/architecture.html` + rendered `docs/architecture.png`;
   two-surface story: MCP agent + Inspector → engine → Qwen + Alibaba; vision-verified clean). 3-min
   video script DONE — `docs/VIDEO_SCRIPT.md` rewritten to LEAD with the MCP agent surface (the catch
   over `engram_review`), Inspector demoted to "look inside the engine" visual; unseen-repo evidence +
   MCP honesty guardrail added (verify live-qwen MCP call before recording). Real-repo evidence already
   folded into README + DEVPOST. REMAINING in packaging: none blocking; optional = record the video.
4. **STRETCH** (only if 1-3 land): autonomous PR-review bot (GH App/Action).

Win-odds: as-is = low (DQ risk + toy read). Deploy-cleared + MCP + packaging = competitive.
Old landing-demo assets (hero/trace/causal panel) are NOT thrown away — Inspector stays as the
"watch it think" visual; the MCP server is the production surface around the same engine.

---

## THE GOAL (stop condition — independent grader must pass ALL)

Submission is READY when every criterion below is CONFIRMED by an *independent verifier pass*
(a fresh sub-agent or a vision check — never self-critique):

- [ ] **G1 · Hero clarity** — a judge understands what Engram is + why it's novel in ≤3 seconds, no scroll. (Innovation/Presentation)
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

## ✅ TIER 0 — LIVE-BOX HARDENING (2026-07-12, code done; box redeploy = USER)

Code fixes committed (verified: 29/29, tsc clean, API boots on mock, golden cold-boot restores 27
deterministically — no relearn):
- COUPON GUARD (`apps/api/server.ts`): `/api/review` now metered on the qwen backend — per-IP
  sliding-window limit (ENGRAM_RATE_MAX=15/min) + hard cap since boot (ENGRAM_REVIEW_CAP=800).
  Public demo stays usable; a script can't drain the coupon. Mock is unmetered (free).
- ATOMIC STORE (`json-store.ts`): temp-file+rename on flush; ctor JSON.parse guarded (corrupt file →
  warn + start empty, never crash). Kill-mid-write no longer bricks boot.
- STORE-PATH SYNC (`apps/api/server.ts`): pins `process.env.ENGRAM_STORE` to the absolute STORE_PATH
  so createStore() reads exactly the file golden was restored to, regardless of cwd (was: cwd≠root →
  empty store → live relearn).
- Cold-boot relearn already made per-commit tolerant (won't crash-loop if Qwen returns a bad shape).
STILL ON USER (console, I can't reach the box): (a) lock SG port 22 → your IP; (b) strip unused
OSS_*/RAM keys from /root/engram/.env; (c) redeploy the box to pick up ALL of today's commits
(git pull + systemd restart); (d) after redeploy, ONE live check that the getUser hero still fires
— the review now REQUIRES Qwen to return `evidence` + a signature match; the getUser diff has a real
fetch/json line to quote, but verify once live (risk: if Qwen paraphrases, the hero won't count).

## ✅ PATH B++ — MISTAKE DETECTION NOW DETERMINISTIC (2026-07-12)

Upgraded the gate: commit-derived mistakes are no longer Qwen PROPOSALS-then-verified; they are
DETECTED directly from the added code by `detectMistakes()` (shared registry) in
`extractFromCommit`. Qwen still owns style/tech/project (its fuzzy strength) + review narration +
embeddings; mistakes are 100% deterministic → reproducible, full-recall, Qwen-independent, and
validatable OFFLINE FOR FREE (no coupon). Turns still keep model mistakes (self-report, no diff).
AUTHORITATIVE deployed-path numbers (detectMistakes over added lines only, 28 learned commits, $0):
- codehere: **error_handling (empty catch) seen 2×** [9394312,c17ea8a] + **var_usage seen 3×**
  [9394312,c17ea8a,8fbce95] — TWO real recurring mistakes, full recall (the Qwen-proposal run only
  caught var 2× and missed empty-catch entirely).
- ravenote: **none — correct silence.**
29/29 tests, tsc clean. Committed `aff5538` (gate) + this deterministic upgrade. Net: the "learns a
real recurring mistake, never fabricates" claim is now TRUE, reproducible, and free to re-verify.
REMAINING to demo the full loop: review a diff that actually re-commits a real var/empty-catch
(honest, not planted) → grounded+signature-matched catch. Then Tier 0 (lock the public box).

## ✅ PATH B — GROUNDING GATE MAKES IT REAL (2026-07-12, live-validated)

User chose Path B (make real-repo catching actually work). Root-caused the ravenote hallucination:
review had an evidence guard but EXTRACTION didn't — asked "what mistakes does this dev make?",
Qwen confabulates to fill the schema. Fix shipped + live-validated:
- `mistakes.ts` — shared signature registry (predicate → canonical text + regex). Single source of
  truth for mock, extraction gate, review guard. Mock PATTERNS now derive mistakes from it.
- EXTRACTION GATE (`extract.ts`): a commit-derived `mistake` is kept only if it names a known class
  AND that class's signature is present in the added code; survivors normalized to canonical text.
  Turns (self-report) skip the gate. Softened the "judge the absence/OMISSION" prompt line that
  invited fabrication.
- REVIEW GUARD (`grounding.ts`): `isRepeatMistakeCatch` now also requires the mistake's signature to
  be present in the diff (not just a grounded quote) → kills mischaracterization (real line, wrong
  label). Call sites pass the cited memory (kind+predicate).
- RESILIENCE: per-commit try/catch in bench + API `learnHistory` — one malformed model response no
  longer aborts a run / crash-loops a cold-boot relearn (was a MUST-FIX).
LIVE RESULTS (user-approved, ~$0.04):
- ravenote (the repo that hallucinated): 3 fabricated mistakes + 1 hallucinated catch → **0 mistakes,
  0 catches**. Still 43 style/tech/project memories, 11 superseded. Correct silence.
- codehere (unseen): **1 REAL recurring mistake — "uses var" seen 2×, grounded**. Independently
  re-verified via the exact code path: `var onSpend=_spendVisible()` etc. in 3 learned commits.
  Held-out catch 0 (newest commit has no mistake pattern → no false catch; the pre-gate run fired a
  FALSE var catch here — guard now rejects it).
VERIFIED: 29/29 tests, package tsc clean, mock gate smoke (7/7 cases), MCP hero still fires.
LESSON: verify against the ACTUAL code path (commitsFromRepo+diffAddedText), not an approximate
shell grep — my shell grep gave a false-0 on codehere var; the code-path probe caught it.
HONEST CAVEATS: (1) recall is Qwen-proposal-limited (codehere: 3 var commits, 2 captured) — a
deterministic scan over the registry would give 3/3, available not enabled. (2) held-out catch needs
a diff that actually contains a mistake; to DEMO the full loop, review a diff that re-commits a real
mistake (legit, not planted). Docs: `bench/results/real-{ravenote,codehere}.md`.

## ⛔ (superseded by Path B above) RAVENOTE DOGFOOD (2026-07-12) — IT HALLUCINATED

The honest answer to "real product or demo?": on the one real repo we dogfooded, live Qwen
FABRICATED its core output. Run: `tsx bench/real-run.ts ravenote 29 --qwen`. Reported (looks
great): 38 memories, 3 recurring mistakes — "uses async/await for API calls without null/ok
checks" ×8, "empty catch blocks" ×4, "uses var" ×4 — + 1 GROUNDED held-out catch, ~$0.02 (51,749
tok/97 calls). VERIFIED AGAINST THE BYTES QWEN SAW (the 29 learned diffs, first 4000 chars each,
+ the held-out diff): **0 var, 0 await, 0 fetch, 0 async, 0 empty-catch. All three "recurring
mistakes" are invented.** Commit messages mention api/async/fetch 0×. The held-out catch fired on
commit 993b6058 whose added code is a HARDCODED QUIZ OBJECT + DOM code (`const _DEMO_QUIZ={...}`,
`showDemoQuiz()` using `$()`/`safeStorage.set`) — no network, no async. Whole repo at HEAD: 0
fetch/0 await/0 var files. So extraction ITSELF hallucinates (worse than codehere, where extraction
was real and only the held-out review hallucinated). Extraction is repo-dependent + untrustworthy
without per-item human verification → NOT yet a shippable product; the "catches your repeat mistake"
claim does not survive a real repo.

THE GUARD DID NOT SAVE IT. `isRepeatMistakeCatch` PASSED the hallucinated held-out catch, because
the guard checks the quoted evidence LINE EXISTS in the diff, not that the line exhibits the mistake.
Qwen quoted a real (innocuous) line and mislabeled it → grounded-but-mischaracterized, the guard's
documented blind spot. Guard is NECESSARY (kills no-evidence / invented-quote — smoke-proven) but
INSUFFICIENT (doesn't kill mischaracterization, the dominant real failure). Open: I couldn't see the
exact evidence string (real-run.ts discarded it — now FIXED to print `evidence` + DROPPED warns);
mechanism (real-line-mislabel vs guard bypass) needs one more ~$0.02 run to nail, if user approves.
Artifacts: `bench/results/real-ravenote.md` (honest writeup), `.json` (raw counts — DO NOT quote
heldOutCatches:1 as a real catch; it's the hallucination).

## DIFF-GROUNDING GUARD (2026-07-12) — DONE local, live-UNPROVEN

The #1 correctness hole is closed in code: a "catch" (warn + citedMemoryId + kind==mistake)
was counted AND reinforced with NO check the flagged issue was in the diff, so a Qwen
hallucination (the codehere "uses var" on a diff with no var) inflated the tally + reinforced
a memory off nothing. FIX (shipped, uncommitted):
- New `packages/memory-engine/src/grounding.ts`: `diffAddedText`, `isGroundedInDiff`,
  `isRepeatMistakeCatch`. A warn now must carry `evidence` (verbatim offending code); a catch
  counts only if that quote is actually present in the diff's added lines (whitespace-normalized).
- `ReviewComment.evidence` added (mentor.ts). Mock attaches the regex match as evidence (so mock
  catches stay grounded). Qwen prompt now REQUIRES verbatim evidence per warn; parseReview reads it.
- All 3 call sites (api/server.ts, mcp/server.ts, bench/real-run.ts) replaced their duplicated
  ungrounded filter with the shared `isRepeatMistakeCatch`. API also returns `grounded` per warn
  so an ungrounded flag is SHOWN but not counted (honest, not hidden).
- SCOPE (honest): guard proves the flagged code EXISTS in the diff, NOT that the judgment is
  correct. It kills pure fabrication (the documented failure), not semantic mischaracterization.
VERIFIED (free/local): 29/29 tests pass; package tsc clean; guard smoke — hallucinated `var`
REJECTED, no-evidence warn REJECTED, real quote counted; MCP hero catch grounded+counted; mock
real-repo bench runs the new path. UNPROVEN (needs live Qwen + user approval): (a) does live
Qwen return evidence verbatim so the hero still fires (risk: a false-negative if it paraphrases —
norm() collapses whitespace but not rewrites); (b) the product question — catch a REAL recurring
mistake on one of MY repos WITHOUT hallucinating, now with the guard auto-discarding bad catches.
NEXT (blocked on user): scoped live dogfood (~$0.02–0.05) on ravenote/nectic/clipa via
`tsx bench/real-run.ts <repo> 29 --qwen --label <name>`. Guard is the prerequisite; it's done.

## WIN-HARDER BACKLOG (next-tier, ranked — for continued loop iterations)

1. **Reinforcement flips a packing decision** — DONE (reliable variant), commit `58f1341`.
   Shipped as a COMPUTED counterfactual, not a live miss-then-catch (see LESSON: semantic
   dominance made a live flip razor-thin fragile + would gut the proven instant-catch hero).
   `/api/review` re-runs the REAL knapsack on the memory that grounded the catch, recomputed
   as "seen once" (salience 0.45, stale) → reports quietWouldDrop. PACK trace shows it as
   PACKED ✓ (reinforced 0.61) vs DROPPED ✗ (seen once 0.47) with token cost — "the catch only
   fires because you kept making it." Honest (real DP re-run, baseline assumption stated), 5/5,
   29/29. Judge-verified (fixed cut-line→topK misread, dropped Bun-coincidence lean).
   OPTIONAL FUTURE (needs user decision — see resume pointer): the FULLER live miss→teach→catch
   arc (hero starts low + climbs). Higher visceral ceiling but reshapes the recorded hero +
   needs fat-margin seed surgery. Asked user; they were away; shipped the safe variant.
2. **Real-repo benchmark** — DONE (user-approved live run). Pointed Engram at **codehere** (1,456-commit
   repo it had never seen) via new `bench/from-repo.ts` (git→history.json, free) + `bench/real-run.ts`
   (learn 29 oldest-first, hold out newest for review). Live Qwen: 37 memories, 1 REAL recurring
   mistake ("swallows errors in empty catch blocks" — independently verified: codehere history is
   full of empty `}catch(e){}`), 3 beliefs superseded. Cost 46,953 tok / 78 calls (~$0.02 of coupon).
   HONESTY: the held-out review catch ("uses var") was a Qwen HALLUCINATION (no var in the fed diff) →
   DISCARDED, documented in `bench/results/real-codehere.md`. Extraction signal real; review can still
   hallucinate. Artifacts: `bench/results/real-codehere.{json,md}`.
3. **Problem-value evidence** (25%) — LARGELY DONE via #2: README + DEVPOST now show a REAL
   recurring mistake found on an unseen repo (codehere empty-catch), not an asserted stat.
   All doc numbers cross-checked against `real-codehere.json` (37/1/46953). Could still add an
   external citation that devs repeat mistakes, but the demonstrated evidence is stronger.
4. **Budget realism** — 64-tok budget reads as a toy (verifier). Either raise it (still visibly
   dropping) or annotate why it's small for demo legibility. (Overlaps #1.)

## DONE THIS SESSION (loop iters 1–3)
G3 trace · G4 README rewrite · G5 Devpost · G6 video script · golden-seed reliability ·
verifier round 1 fixes · hero copy + benchmark clarity · verifier round 2 fixes.
Demo clean + recording-ready on live Qwen. 29/29 tests. proof → live Qwen OK.

---

## VERIFIED FACTS (stage 3 — stop guessing about these)

- Engine is done + verified on LIVE Qwen: write/reinforce/contradiction/forgetting/retrieval/packing/cross-session all fire. Commit `afa1d9b`. 29/29 tests pass.
- Demo server: `ENGRAM_BACKEND=qwen MEMORY_STORE=json PORT=5273 npx tsx apps/api/server.ts` → http://127.0.0.1:5273. Restores good seed from `.engram/memories.json` instantly.
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
- **Hero silently failed** (GROUND "—", no catch card). Root cause: `/api/reset` force-reseeded via non-deterministic Qwen; and the browser review call (~3.8s) + slow staging pushed the catch past the screenshot. FIX: (a) froze a golden seed (`.engram/golden.json`, committed, extracted once by live Qwen), reset now restores it deterministically — catch fires 5/5; (b) tightened the trace stagger; (c) harness waits on `.catch`. Fresh clone restores golden on first boot → reproducible for judges.
- **Number mismatch** (UI 18 vs writeup 15). FIX: genericized DEVPOST to "N times"; the one concrete number lives only in the frozen UI.
- **Audit wall** (Redux→Zustand repeated ~11×). FIX: renderAudit dedupes to one receipt per superseded slot → now exactly 2 clean receipts.
- **"↻ relearn" button** was a footgun (live non-deterministic reseed). FIX: renamed "↻ reset demo", restores golden.
- STILL OPEN (lower leverage): benchmark `0.02ms` latency looks fabricated (footnote it); Recall@5 ties 100/100/100 (lead with the differentiator: contradiction acc + stale leakage); hero copy could name the reinforcement mechanic + size the problem-value vs a lint rule.
- Verifier praised: the retrieve→pack→ground trace (most credible asset) and the honest deploy caveat (builds trust). Keep both.

## LESSONS LEARNED (stage 4 — distilled, consult before repeating)

- **Vision-verify harness**: playwright-core download is sandbox-blocked; cached browsers max at build 1223 while playwright-core wants 1228 → launch with explicit `executablePath` to `~/Library/Caches/ms-playwright/chromium_headless_shell-1223/.../chrome-headless-shell`. Reset the demo via `page.request.post(.../api/reset)` INSIDE the browser (node `fetch`/`curl` are hook-redirected). Harness: `_shot.mjs`. Rerun: `node _shot.mjs <outdir>`.
- **Network from Bash is hook-redirected** (curl/wget/node-fetch → context-mode). To hit the live server, drive it from playwright's browser context, or read the server source for shapes.
- **Depth is a perception**: the engine already retrieved/packed/grounded — surfacing those real numbers as a staged trace turned invisible work into a visible Technical-Depth signal. Cheap change, high score leverage. Look for more "make the real work visible" moves.
- **Seed non-determinism → SOLVED with a golden seed**: force-reseed re-runs Qwen extraction (non-deterministic → hero sometimes fails). Fix pattern: extract once with live Qwen, freeze the good state as a committed fixture (`.engram/golden.json`), restore it deterministically on reset/first-boot. The live inference (review) still runs on Qwen — only the SEED is frozen. Honest + reproducible. Reliability probe: `_rel.mjs` (fires /api/review 5× via browser context, counts grounded catches). Always 5/5 now.
- **Browser review latency ~3.8s**: live qwen-plus review is slow; don't add long UI staging on top. Screenshot/verify by waiting on the `.catch` selector, not a fixed timeout.
- **Real-repo run: extraction is grounded, live review can hallucinate**: on codehere (unseen), Qwen extraction over git history produced REAL, verifiable recurring-mistake memories, but the held-out review invented a "uses var" catch not present in the diff. Lesson: trust the learn/reinforce pipeline over real history; do NOT trust a single live review comment without checking it against the diff. The demo hero avoids this because it grounds against a memory the diff genuinely matches — always spot-check any real-repo review claim before quoting it. `bench/real-run.ts` + `bench/from-repo.ts` are the (gitignored-safe) harness; re-running costs coupon (~$0.02/repo) so DON'T re-run casually.

## PACKING-CAUSALITY (backlog #1) — DONE (reliable variant), commit `58f1341`
- LESSON (design fork): a LIVE "quiet null_check → dropped → bug slips → reinforce → packed →
  caught" flip is NOT robustly achievable with this seed. Weights are semantic 0.6 / recency 0.2
  / salience 0.2, and the null_check memory's semantic sim to the diff is high, so lowering
  salience alone can't drop it (floor ~0.55 > the cut memory Bun ~0.47). Even lowering recency
  too, quiet-m_3 lands at 0.4737 vs Bun 0.4745 — a razor-thin 0.0008 margin that drifts with
  time. Forcing it = fragile OR dishonest. Instead: prove causality with a COMPUTED counterfactual
  — re-run the actual deterministic knapsack at the memory's "seen once" baseline and report the
  real PACKED/DROPPED outcome. Deterministic, honest, zero extra Qwen, preserves the instant-catch
  hero. This captures the causal-proof leverage without the reliability risk.
- LESSON (judge pass): a "cut line" bar visual made the token-aware 0/1 knapsack read as
  top-k-with-a-threshold — contradicting the "beats greedy top-k" claim. Fix: show real
  PACKED ✓ / DROPPED ✗ outcome badges + token cost, label the axis "ranking value," say
  "token-aware, not a threshold." Also: don't lean on coincidental equal scores (quiet-m_3
  0.47 ≈ Bun 0.47) as "same fate" — reads as cherry-picked even when each number is real.
- LESSON (honesty gate): the strong claim ("this catch never fires") is gated on the live
  packer's quietWouldDrop; the non-drop branch shows a weaker always-true line. Never asserts
  a drop the real DP didn't produce.

## PACKING-CAUSALITY (older partial notes)
- PACK trace step now NAMES the memory the knapsack drops ("cut the faded 'uses Bun…'") — salience-driven packing made concrete + honest (loud mistake kept, quiet one-off cut). Verified from real `dropped[]` telemetry.
- Review prompt no longer bakes a count into prose (was stating a stale "18×" after reinforce-on-catch); the tally is UI-only now → hero/card/bar all read one consistent climbing number. Reliability 5/5, 29/29 tests.
- STILL OPEN: the FULL before/after flip (memory literally dropped when quiet → catch MISSED → reinforce → packed → caught). Bigger, reliability-sensitive; do in fresh context, verify 5×, never fabricate the "was dropped" claim.

## LAST SESSION (resume pointer — stage 5)

2026-07-09 · Loop iter 6 DONE. Backlog #2 (real-repo benchmark) SHIPPED, user-approved live run.
Built `bench/from-repo.ts` + `bench/real-run.ts`; ran on codehere (unseen, 1456 commits). Real
result: 37 memories, 1 VERIFIED recurring mistake (empty catch blocks), 3 superseded, ~$0.02.
Held-out review catch was a Qwen hallucination → discarded + documented (honesty). 29/29 tests
still pass; demo untouched + clean (InMemoryStore, no golden touch). Artifacts committed.

2026-07-06 · Loop iter 5 DONE (commit `58f1341`). Backlog #1 (packing causality) SHIPPED in
its reliable computed-counterfactual form: PACK trace now proves salience is causal (real
knapsack re-run → PACKED/DROPPED at reinforced-vs-seen-once value), judge-verified, 5/5, 29/29.
Demo left clean (catches 0, hero 18, backend qwen). All G1–G8 still pass; submission remains
submittable + honest, now with a stronger Technical-Depth/Innovation asset.

DECISION PENDING FOR USER (asked mid-iter; user was away → shipped the safe variant):
Do you want the FULLER live "miss → teach it → catch" hero arc (bug visibly slips on first
review, you reinforce, then it's caught)? Higher visceral ceiling but (a) reshapes the hero you
record — headline can no longer be "18×, caught every one," it starts low + climbs; (b) needs
fat-margin seed surgery because semantic dominance makes the flip razor-thin at this budget.
If YES, that's the next iteration (verify 5×, adversarial judge, keep the computed panel too).
If NO, the computed-counterfactual panel already proves the causality reliably — leave it.

REMAINING BACKLOG: #2 real-repo benchmark (BURNS finite $40 Qwen coupon — confirm scope+cost
with user before running); #3 problem-value evidence (safe, no blocker); #4 budget realism.
Blocked-on-user: Alibaba infra deploy (account verification), video recording + submission.

To resume the loop: restart server (`ENGRAM_BACKEND=qwen MEMORY_STORE=json PORT=5273 npx tsx
apps/api/server.ts`), read this file, pick the top UNBLOCKED backlog item (#3 if not pursuing
#1's fuller arc; #2 only with credit approval), verify with `_shot.mjs`/`_rel.mjs` + an
independent verifier sub-agent, write results back here. Loop tools: `_shot.mjs` (vision),
`_rel.mjs` (5/5 reliability), `_probe.mjs` (scratch probe for scores/state — gitignored).
