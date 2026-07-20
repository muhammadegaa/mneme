# I built a memory of my own bugs on Qwen Cloud, and it caught me lying to myself

*My journey building Engram for the Global AI Hackathon with Qwen Cloud (Track 1: MemoryAgent).*

---

## The bug I keep shipping

Here's a line I have written a hundred times:

```js
const user = await res.json()
```

It looks fine. Copilot autocompletes it happily. It passes review. And then one Monday
production is down, because the API returned a `404` with an HTML error page, `res.json()`
threw, and `user.profile` crashed for every user.

I've shipped that exact bug more than once. So has everyone I know. The bugs that reach
production aren't exotic. They're the *same handful of mistakes each of us makes over and
over*: forgetting to check `res.ok`, swallowing an error in an empty `catch`, reaching for `var`.

And here's the thing that bothered me: **no tool remembers that *I specifically* keep doing
this.** My linter flags it once, I mute it, I ship it again. Copilot has no memory of me between
sessions. CodeRabbit reviews the PR, but it learns from the comments I *write*, not the mistakes
I keep *shipping*.

So for Track 1, MemoryAgent, I built the tool I wanted: **Engram**, a memory of the mistakes
you personally repeat, mined from your own git history, that catches them on your next diff.

## What a "memory agent" actually needs

The track spec is precise: *efficient memory storage and retrieval, timely forgetting of
outdated information, and recalling critical memories within a limited context window.* That's
not a vector database with a `topK(cosine)` call. It's an **engine**:

- **Retrieve.** Hybrid ranking: `semantic + recency + salience`.
- **Reinforce.** A repeated mistake makes the *same* memory louder (its salience climbs). The
  more you repeat it, the harder it is to miss. This is the "increasingly accurate over time" part.
- **Forget.** One-off noise decays below a floor, and a stale decision gets *superseded* by a newer
  one, with an audit trail. (You switched from Redux to Zustand? The old note steps aside.)
- **Pack.** A **0/1-knapsack** solver fits the *most valuable* memories into a fixed token
  budget. Greedy top-k drops the relevant memory to keep one big one. The knapsack keeps it.

All of it runs on **Qwen, on Alibaba Cloud**: `qwen-turbo` for extraction, `qwen-plus` for the
review agent, `text-embedding-v3` for retrieval. And it's exposed as an **MCP server** so any
coding agent (Cursor, Claude Code) can call it before you ship.

## The failure I'm glad I hit

Then I did the honest thing. I pointed it at my *own* repos, repos it had never seen, and
checked every claim against the actual code.

On one of them, `ravenote`, Qwen extraction confidently reported three "recurring mistakes":
async/await null-checks, `var`, empty catches. **None of them exist in the repo.** It has no
`fetch`, no `await`, no `var` anywhere. Asked "what mistakes does this developer make?", the model
had *confabulated* plausible-sounding answers to fill the schema.

A memory that hallucinates is worse than no memory. This was the moment the project could have
died, or gotten real.

## The fix: ground the detection, let Qwen judge

I moved mistake **detection** off the model and onto deterministic, high-precision signatures over
the *real added code*, so a mistake is only ever recorded if its pattern is genuinely there. Then
I gave **Qwen** the job it's actually good at: **judgment**. The signature grounds the catch (it
can never fabricate), and Qwen reads the specific code, decides whether it's a real bug *in this
context*, writes a concrete fix, and can even *decline to warn* on a false positive. That's the
reasoning a regex or a linter can't do.

The result, re-verified against the real commits:

- **codehere** (a repo it had never seen): two *real* recurring mistakes, `var` (seen 3×) and
  empty-catch (seen 2×), every one quotable in the actual commits.
- **ravenote** (which has none): **zero.** Correct silence.

And live on Qwen, on the classic `getUser` bug, the review read like a senior engineer:

> *"`res.json()` may throw or return undefined if the response is not OK... `user.profile` will
> crash with Cannot read property 'profile' of undefined."* Fix: `if (!res.ok) throw new
> Error(HTTP ${res.status})`

It even caught a second, downstream issue the pattern-match never could.

But the tier I'm proudest of is the one **no regex could ever cover**. Engram remembers decisions,
not just mistakes, including that this project migrated its state layer from Redux to Zustand (the
old choice is superseded, with an audit trail). So when a later diff quietly reintroduces
`createStore(`, no signature fires. There's no `var`, no empty catch, nothing to grep. Yet the
review flags it: *"you're reintroducing Redux here, but you'd moved to Zustand."* Only a model
reading the accumulated memory can catch that. And it's still grounded the same way, because Qwen
has to quote the real `createStore(` line from the diff, so it can't invent the catch. This is the
"increasingly accurate across sessions" property made literal: **the more the memory holds, the more
the model catches, beyond any fixed rule set.**

## What I learned

**Memory is a systems problem, not a prompt.** The interesting parts live in the engine *around*
the model rather than in the model call itself: salience decay, knapsack packing under a token
budget, contradiction audit trails, and turning a repeat mistake into a rising signal.

And the honesty property turned out to be the whole product: a signature that grounds detection so
it *never invents*, plus a model that supplies judgment a linter can't. On a benchmark, the moment
the memory *forgets* superseded facts, contradiction accuracy goes to 100% and stale-advice leakage
to 0%, at a fraction of the tokens.

## Why I think this matters beyond a demo

Every other tool helps you write code *faster*. Engram is the one that remembers how you *break*
it, and stops you before you ship. The moat isn't the detector, which is swappable (a better Qwen
model makes it better). It's the **accumulating, private memory of how you and your team
specifically repeat mistakes**, compounding with every commit. A smarter base model doesn't erase
that memory. It makes reading it sharper.

It's live on an Alibaba Cloud ECS box in Singapore, open-source under MIT, and it caught a real bug
on a repo it had never seen. That's the memory agent I wanted: one that remembers *me*.

---

*Engram · [github.com/muhammadegaa/mneme](https://github.com/muhammadegaa/mneme) · MIT · built on
Qwen Cloud for the Global AI Hackathon, Track 1: MemoryAgent.*
