# real-codehere — live Qwen dogfood (2026-07-12, gated) — REAL recurring mistake

Run: `tsx bench/real-run.ts /Users/muhammadegaa/code/codehere 29 --qwen --label codehere`
Backend: live Qwen. Cost: 52,664 tok / 81 calls (~$0.02). 3/28 commits skipped on a malformed
model response (per-commit tolerance — one bad response no longer aborts the run).

> Supersedes an earlier pre-gate run on this repo (which surfaced empty-catch blocks AND emitted a
> hallucinated held-out "var" catch on a diff with no var). The gate now drops exactly that kind of
> misapplied catch — see "held-out catch is 0" below.

## Result (after the extraction-grounding gate)

| metric | value |
|---|---|
| memories extracted | 38 |
| mistake memories | 2 |
| recurring mistakes (seen ≥2×) | 1 — **"uses var instead of const/let"** |
| beliefs superseded | 1 |
| held-out catch (commit 7db8850e) | 0 |

## Independent verification — the mistake is REAL

Reproduced with the exact code path the run used (`commitsFromRepo` + `diffAddedText` + the
`var_usage` signature). 3 of 28 learned commits contain genuine `var` declarations:

```
9394312a  var onSpend=_spendVisible();   (function navSectionHtml())
c17ea8ab  var _rh=_roomHash();
8fbce950  var _sv=document.getElementById('spend-v…')
```

Real `var` declarations (should be `const`/`let`) — a real recurring mistake in a repo Engram had
never seen. The gate kept it *because* the signature matched real added code; reinforced across
commits (seen 2×).

The held-out catch is **0** — correct, not a miss: the newest commit (7db8850e) has no
var/empty-catch/null-check pattern in its added lines, so nothing false fired. (The pre-gate run
fired a false var catch here; the strengthened review guard now rejects a catch whose signature
isn't in the diff.)

## Honest caveats

- **Recall is Qwen-proposal-limited.** 3 commits use `var`; only 2 were captured, because
  extraction keeps a mistake only when Qwen *proposes* it AND the signature verifies. Every kept
  mistake is real; some real ones are missed. (A deterministic detector pass over the registry
  would lift recall to 3/3 — available, not yet enabled.)
- This is the 29 most-recent codehere commits — a different window than the earlier run that
  surfaced empty-catch. Both are real; which mistakes appear depends on the window.

## Contrast with ravenote (same day, same gate)

ravenote — no fetch/await/var/empty-catch anywhere — extracted **0 mistake memories** after the gate
(down from 3 fabricated before it). Same machinery: catches the real thing on codehere, stays silent
on ravenote. That is the honesty property the gate was built for.
