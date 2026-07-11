# Real-repo benchmark — codehere (unseen)

Engram pointed at **codehere** (a 1,456-commit repo it had never seen), backend **Qwen** (live
`qwen-plus` extraction + review, `text-embedding-v3`). Last 30 commits: learn 29 oldest-first,
hold out the newest for review. Command:

```
tsx bench/real-run.ts ../codehere 30 --qwen --label codehere
```

## What it found (verified)

| metric | value |
|---|---|
| memories extracted | 37 |
| mistake memories | 2 |
| **recurring mistake (seen ≥2×)** | **1 — "swallows errors in empty catch blocks"** |
| beliefs superseded | 3 |
| Qwen cost | 46,953 tokens · 78 calls (~$0.02) |

The recurring mistake is **real and independently verifiable**: codehere's recent history is
pervaded by empty `}catch(e){}` blocks that discard the error, e.g.

```
+  try{ renderSidebar(); }catch(e){} // the rail's you-are-here follows
+  try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){}
```

Engram learned this pattern from commits it had never seen and marked it recurring — the core
claim ("learns your real recurring mistakes") holds on a real codebase, not a planted one.

## Honesty caveat — held-out review catch discarded

The held-out review (newest commit `aa61172a`) produced one grounded comment: *"uses `var`
instead of `const`/`let`."* **Manual check: that commit's fed diff contains no `var`.** The
comment is a Qwen **hallucination** — a real style memory (codehere does use `var` elsewhere)
misapplied to a diff that doesn't contain it. It is **excluded** from every claim.

This is the honest boundary of the current system: extraction + reinforcement over real history
is reliable and grounded; the live review model can still hallucinate an application. The demo's
hero catch avoids this by grounding against a memory the diff genuinely matches; this benchmark
is the unfiltered, warts-and-all run on unseen code.

Raw run output: `bench/results/real-codehere.json`.
