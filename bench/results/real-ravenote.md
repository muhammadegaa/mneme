# real-ravenote — live Qwen dogfood (2026-07-12)

## UPDATE (same day) — the extraction gate FIXED it

Re-ran after adding the extraction-grounding gate + strengthened review guard:
`tsx bench/real-run.ts ravenote 29 --qwen` → **0 mistake memories, 0 held-out catches**
(down from 3 fabricated mistakes + 1 hallucinated catch below). 53,194 tok / 94 calls (~$0.02).
Still extracted 43 style/tech/project memories + superseded 11 beliefs — the fuzzy work Qwen
legitimately does — but invented **nothing** about mistakes, because ravenote's code genuinely has
no fetch/await/var/empty-catch and the gate drops any mistake whose signature isn't in real added
code. This is the intended honesty property: says nothing false when there's nothing there.
The pre-gate failure below is preserved for the record.

---

# (pre-gate) real-ravenote — HALLUCINATION, documented

Run: `tsx bench/real-run.ts /Users/muhammadegaa/code/ravenote 29 --qwen --label ravenote`
Backend: live Qwen (qwen-turbo extract / qwen-plus review). Cost: 51,749 tok / 97 calls (~$0.02).

## What the run reported (do NOT quote as a win)

| metric | value |
|---|---|
| memories extracted | 38 |
| recurring mistakes (seen ≥2×) | 3 |
| beliefs superseded | 7 |
| held-out catch (commit 993b6058) | 1 "grounded" |

Recurring mistakes it claimed:
- ▲×8 "uses async/await for API calls without null/ok checks on response"
- ▲×4 "swallows errors in empty catch blocks"
- ▲×4 "uses var instead of const/let"

## Independent verification — all three are FABRICATED

Checked against the exact bytes Qwen saw (`git show <sha> --unified=1`, first 4000 chars,
added lines only) across the 29 learned commits **and** the held-out diff:

```
var decls   0
await usage 0
fetch calls 0
async fns   0
empty catch 0
```

- Commit messages mention `api|async|await|fetch` **0 times**.
- The held-out commit `993b6058` ("demo quiz on first install") added a **static object +
  DOM code** — `const _DEMO_QUIZ = { question, choices, ... }` and `function showDemoQuiz()`
  using `$()`, `safeStorage.set`, `track()`. No network call, nothing async to get wrong.
- Whole repo at HEAD: **0 files** use `fetch`, `await`, or `var`.

Conclusion: Qwen invented "uses async/await for API calls without null/ok checks" (and the
others) about a codebase that has no async, await, or fetch. This is worse than the codehere
run, where the extracted mistake (empty catch blocks) was real and only the held-out review
hallucinated. Here **extraction itself hallucinates.**

## The diff-grounding guard did not stop it

`isRepeatMistakeCatch` (added 2026-07-12) **passed** the hallucinated held-out catch. The guard
verifies the comment's quoted `evidence` line is present in the diff — not that the line actually
exhibits the flagged mistake. Qwen quoted a real, innocuous line from the quiz code and labeled
it an async/await-null-check bug; the guard confirmed the line exists and let it through.

The guard is **necessary but insufficient**: it kills pure fabrication (no evidence, or an invented
quote not in the diff — proven in the mock smoke test) but not **mischaracterization** (a real quote
with a wrong judgment), which is the failure mode that occurred here.

## Takeaway

Extraction/review reliability is **repo-dependent and not trustworthy without per-item human
verification.** The "catches a repeat mistake on your next diff" claim does not survive this real
repo. Treat all live-Qwen review output as unverified until each item is checked against the diff.
