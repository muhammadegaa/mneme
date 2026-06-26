# WIN.md — the LOCK (frozen)

Per `hackathon-os/PLAYBOOK.md` Phase 1. Three lines. After this, the idea is frozen.

### 1. One sentence (a stranger gets it)
**Mneme is a code reviewer that learns how *you* code from your git history — and catches the mistakes you personally keep making, before you ship them again.**

It's not a linter (knows the language) or Copilot (forgets you between sessions). It's a reviewer with a memory of *you*: your style, your tech choices, the bug you've shipped three times.

### 2. The 30-second visceral moment  *(wow-pattern #1 — the live catch, personalized)*
Hand the judge the keyboard. They write a `fetch().json()` with no null guard — a real, ordinary line. Mneme stops it **in real time**: *"You've shipped this exact bug 3 times. Not a fourth."* — and shows the three past commits where it bit them. It's not a generic rule. It's the judge's own mistake, remembered. The catch is on **live Qwen**, and we show the call (no fake autonomy).

### 3. The one number that climbs from real work
**Repeat mistakes caught before they shipped.** It ticks up — 3 → 4 — the instant the catch fires, from a real diff. Not a percentage, not a vanity counter: every increment is a bug that would have reached `main`.

---

## Demo order (visceral FIRST, thesis LAST — anti-pattern #5)
1. **0:00–0:30** — the live catch. The judge's own bug, stopped, counter ticks. They feel it.
2. **0:30–1:30** — the loop: how it learned them (`mneme learn` over real history) → the memory that fired, its salience climbing across 3 commits → it forgetting a stale preference. The number keeps climbing.
3. **1:30–2:00** — the thesis: every other AI tool forgets you the moment the session ends. Mneme is the first one that *accumulates* a model of how you, specifically, code. The benchmark proves the engine. MIT, on Alibaba Cloud.

## Honesty guardrails (anti-pattern #9)
- The demo runs on **live Qwen** (`MNEME_BACKEND=qwen`). The mock exists only for offline/CI and is labeled `backend: mock` in the UI — never presented as intelligence.
- The climbing number counts real catches on real diffs, nothing simulated.

## What we will NOT do (anti-pattern #7, #8)
- No second landing page, no rebrand, no four mockups. One UI, made excellent, wired live.
- Every change from here passes the demo-value test: does it change what a judge sees in 2 minutes?
