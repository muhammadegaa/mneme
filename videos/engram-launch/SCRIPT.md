# SCRIPT — engram-demo (technical walkthrough, plain language)

**Voice:** am_michael (Kokoro, local)
**Voice settings:** default
**Voice direction:** A developer explaining a working system to a mixed room — a judge and a beginner. Clear, calm, plain English. No jargon without a plain-word gloss. Let the numbers and the catch land.

---

## Line 1 — Problem (Frame 1)

**Time:** 0.0 – 14.0s
**Delivery:** Matter-of-fact.

    Every developer makes the same few mistakes, over and over. Forgetting to check that a network request actually worked. Leaving an error unhandled. An old habit you meant to drop. Your tools flag it once, you ignore it, and you ship it again — because nothing remembers that you keep doing this.

## Line 2 — What it is + Track 1 (Frame 2)

**Time:** 14.0 – 30.0s
**Delivery:** Land the track name clearly.

    Engram is our project for Track One — MemoryAgent. It's a memory of the mistakes you personally repeat, learned from your git history. It remembers them between sessions, and any A-I coding assistant can ask it to check your next change, through the open standard called MCP.

## Line 3 — Architecture (Frame 3)

**Time:** 30.0 – 60.0s
**Delivery:** Slow, one idea per step. This is the teaching moment.

    Here's how it works, in two halves. When you commit code, Qwen reads it and Engram records how you code. Mistakes are found directly in the real code, so they are never made up. Then, when you're about to ship a change, Engram ranks what it knows — by what's relevant, recent, and important. Repeat a mistake and its memory grows stronger. Do something once and it fades. Change your mind, and the old note is replaced. It keeps only the most useful memories that fit a small budget — and every warning points back to a specific memory, and to the real code that triggered it.

## Line 4 — The stack (Frame 4)

**Time:** 60.0 – 78.0s
**Delivery:** Crisp, plain.

    Everything runs on Qwen, on Alibaba Cloud. A fast model reads your commits, a stronger one reviews your code, and a third turns text into searchable vectors. The engine is TypeScript, with forty-seven tests. It's an MCP server, it stores memories in a Postgres database, and it's deployed on an Alibaba Cloud server in Singapore.

## Line 5 — The memory (Frame 5)

**Time:** 78.0 – 93.0s
**Delivery:** Show-and-tell.

    This is what Engram remembers about me — live from Qwen. My most common mistake: forgetting to check a network response before using it. It has seen me do this eighteen times. The more I repeat it, the louder that memory gets, while a one-time experiment quietly fades.

## Line 6 — The catch, over MCP (Frame 6)

**Time:** 93.0 – 110.0s
**Delivery:** Even through the code, small pause before "it catches it."

    Now the payoff. My assistant sends Engram a new piece of code — fetch a user, read the response, return it. It looks fine. But Engram remembers I skip that safety check. So it catches it — live on Qwen, based on my own history — before it ever ships.

## Line 7 — Grounded, never fabricates (Frame 7)

**Time:** 110.0 – 125.0s
**Delivery:** Steady, trustworthy.

    And it never makes things up. On a project it had never seen, it found two mistakes that were really there. On another, with none, it correctly stayed silent. Every catch is grounded in real code — not a guess.

## Line 8 — Benchmark (Frame 8)

**Time:** 125.0 – 139.0s
**Delivery:** Plain, factual.

    Does remembering actually help? A plain memory keeps handing you outdated advice every time. The moment Engram forgets what's no longer true, it gets every contradiction right, never repeats stale advice, and uses a fraction of the space.

## Line 9 — Proof of deployment (Frame 9)

**Time:** 139.0 – 154.0s
**Delivery:** Confident.

    And it's real. Here's Engram calling Qwen on Alibaba Cloud, and here's our live server in Singapore, reporting that it's running on Qwen. A memory agent, in production.

## Line 10 — Close (Frame 10)

**Time:** 154.0 – 165.0s
**Delivery:** Warm resolve.

    Engram — a memory agent that learns your coding mistakes, remembers them across sessions, and catches them before you ship. Live on Alibaba Cloud. Open source.
