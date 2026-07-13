---
format: 1920x1080
message: "Engram — a MemoryAgent that learns your recurring mistakes from git and catches them on your next diff, over MCP, on Qwen + Alibaba Cloud."
arc: Problem → What+Track1 → Architecture → Stack → Memory → Catch → Grounded → Benchmark → Proof → Close
audience: Qwen Cloud hackathon judges (Track 1: MemoryAgent)
mode: autonomous
---

## Video direction

- **palette system** (from `frame.md`): near-black canvas (`#0E0E10`), cream ink (`#F5F1E8`), coral (`#FF5C57`) reserved ONLY for the mistake/catch moments + one hero accent per stack/arch stage (never decorative), muted grey (`#8A8A8A`) for secondary, panel (`#1A1A1D`) for code/diagram surfaces. Display = EB Garamond (serif); code/terminal + labels = JetBrains Mono. Real terminal output renders as styled monospace, must read as real (no fake browser chrome).
- **motion grammar + reveal model**: long-tail settle (`power3`, never bouncy). VO-paced: at t=0 only what the VO is saying enters; each pipeline stage / stack row / stat reveals on its spoken cue, weighted to the back ~50%.
- **rhythm**: Frame 3 (architecture) and Frame 4 (stack) are dense explanatory beats — reveal one element per spoken clause, never dump. Frame 6 (catch) is the climax — hold still after the WARN. Frames hold on their last read; subtle jitter at most.
- **negative list**: no bounce/overshoot; no lazy breathing; no back-half pan/push; no bokeh / purple-blue "AI" gradients; no fake editor chrome; coral only for catches + the single accent role; no repeat/yoyo/random.

## Frame 1 — Problem

- scene: A linter warning flashes, gets muted, and the same bug ships again — a loop.
- duration: 18.987s
- transition_in: cut
- status: animated
- type: pain_point
- voiceover: "The bugs that reach production aren't exotic. They're the same handful each of us repeats — a missing res.ok check, an empty catch, a stray var. Your linter flags it once, you mute it, and you ship it again. Nothing remembers that you keep doing this."
- src: compositions/frames/01-problem.html

Reused verbatim from the prior cut (the linter flag → mute → ship loop, then the turn). Real visual, no change.

## Frame 2 — What it is + Track 1

- scene: The Engram wordmark resolves; three pills name the track — persistent · queryable · cross-session.
- duration: 18.645s
- transition_in: zoom-through
- status: outline
- type: product_intro
- persuasion: Category framing
- beat: clarity
- blueprint: kinetic-type-beats (Adapt)
- focal: the wordmark + the "Track 1 · MemoryAgent" label + three property pills
- voiceover: "Engram is our entry for Track One — MemoryAgent. It's a persistent, queryable memory of a developer's recurring mistakes, mined from git history. It retains what you get wrong across sessions, and any coding agent can query it over MCP to review your next diff."
- asset_candidates: (none — wordmark + labels)
- src: compositions/frames/02-track.html

Adapt kinetic-type-beats. Scene 1 (0–3s): "Engram" wordmark (EB Garamond) assembles center with coral ✱; a mono chip "Track 1 · MemoryAgent" sits above. Scene 2 (3–9s): as the VO says "persistent, queryable," three pills reveal in a row — `persistent` · `queryable` · `cross-session` (JetBrains Mono, hairline outline) — one per cue. Scene 3 (9–16s): as the VO says "over MCP," a subhead reveals: "a memory of the mistakes you keep making" (with "mistakes you keep making" coral), and a small `MCP` badge. Hold.

## Frame 3 — Architecture (the engine)

- scene: The engine pipeline builds stage by stage — a write path and a read path resolving into a grounded catch.
- duration: 34.901s
- transition_in: crossfade
- status: outline
- type: feature_showcase
- persuasion: Show-don't-tell depth
- beat: understanding
- blueprint: spatial-pan-stations (Adapt)
- focal: the pipeline diagram (WRITE row + READ row)
- voiceover: "Here's how it works, in two halves. When you commit code, Qwen reads it and Engram records how you code. Mistakes are found directly in the real code, so they are never made up. Then, when you're about to ship a change, Engram ranks what it knows — by what's relevant, recent, and important. Repeat a mistake and its memory grows stronger. Do something once and it fades. Change your mind, and the old note is replaced. It keeps only the most useful memories that fit a small budget — and every warning points back to a specific memory, and to the real code that triggered it."
- asset_candidates: (none — animated diagram, typography + boxes/arrows)
- src: compositions/frames/03-architecture.html

Adapt spatial-pan-stations: build an animated pipeline (labeled nodes + connecting arrows), each node revealing on its spoken clause — DO NOT dump the whole diagram at t=0. PLAIN-ENGLISH labels (a novice should follow) — NOT jargon.
LAYOUT / OVERLAP FIX: only an EB Garamond title "How Engram works" top-left (NO second grey subtitle line under it — the old "HOW MEMORIES ARE WRITTEN, THEN READ" line collided with the WRITE lane label and must be removed). Put clear vertical space between the title and the top lane. Two lanes, each with a small left-side lane label (`WRITE` / `READ`) that sits ABOVE its row with a clear gap (must not overlap the title or the boxes).
  WRITE lane (each box = title line + small sub line):
    `commit` (your code) → `Qwen reads it` (records how you code) → `find real mistakes` (from the actual code — never made up)  ← this last box coral-outline
  READ lane:
    `rank what matters` (relevant · recent · important) → `repeats get louder` (a small bar grows) → `one-offs fade` (a box dims) → `update old notes` (when you change your mind) → `keep the best` (fits a budget — a meter fills) → `⚠ catch` (points to a real memory)  ← coral
Scene 1 (0–9s): WRITE lane reveals left-to-right as the VO names it; the "find real mistakes" box coral-outline on "never made up". Scene 2 (9–26s): READ lane reveals box-by-box on each clause. Scene 3 (26–30s+): the `⚠ catch` box lands coral with a soft glow; a hairline draws from it back to a memory box; hold. JetBrains Mono labels in rounded hairline boxes; arrows draw on via GSAP strokeDashoffset. Legible, generous spacing, nothing overlaps.

## Frame 4 — The stack

- scene: The stack, named — Qwen models on Alibaba Cloud, MCP, TypeScript, pgvector.
- duration: 23.851s
- transition_in: push-slide LEFT
- status: outline
- type: feature_showcase
- persuasion: Technical credibility
- beat: confidence
- blueprint: grid-card-assemble (Adapt)
- focal: the model-routing rows + the Alibaba Cloud / MCP / TS chips
- voiceover: "Everything runs on Qwen, on Alibaba Cloud. Extraction on qwen-turbo, review on qwen-plus, embeddings on text-embedding-v3. The engine is a standalone TypeScript package with forty-seven tests, exposed as an MCP server, persisting to Postgres with pgvector, and deployed on an Alibaba Cloud ECS instance."
- asset_candidates: (none — labeled rows/chips)
- src: compositions/frames/04-stack.html

Adapt grid-card-assemble: rows self-assemble on their spoken cue.
Scene 1 (0–8s): a titled panel "Qwen · DashScope" with rows revealing one per cue — `qwen-turbo → extract`, `qwen-plus → review`, `text-embedding-v3 → retrieval` (mono, each with a small role tag). Scene 2 (8–14s): a second cluster of chips reveals — `TypeScript engine · 47 tests`, `MCP server`, `ApsaraDB pgvector`. Scene 3 (14–18s): an `Alibaba Cloud · ECS · Singapore` bar lands beneath with a coral live-dot. Hold. Clean rows, hairline separators, no coral except the ECS dot.

## Frame 5 — The memory (real: engram_inspect)

- scene: A terminal renders the developer's live memory; the mistake row (seen 18×) glows coral.
- duration: 18.475s
- transition_in: crossfade
- status: animated
- type: feature_showcase
- voiceover: "This is what it remembers about me, pulled live from Qwen. The mistake I make most — forgetting null and ok checks on API responses. Seen eighteen times. Repeat a mistake and it gets louder; a one-off experiment fades."
- src: compositions/frames/05-memory.html

Reused verbatim (real engram_inspect output, backend: qwen, null-check seen 18×, Bun fading).

## Frame 6 — The catch, over MCP (real: engram_review) — HERO

- scene: An agent calls engram_review on a fresh diff; the terminal returns a coral WARN grounded in memory, "seen 18×."
- duration: 17.323s
- transition_in: crossfade
- status: animated
- type: feature_showcase
- voiceover: "Now the payoff. My agent hands Engram a fresh diff over MCP — fetch a user, parse the JSON, return it. Looks fine. But Engram remembers I forget the res.ok check. So it catches it, live on Qwen, grounded in my own memory, before it ships."
- src: compositions/frames/06-catch.html

Reused verbatim (the real live-Qwen engram_review catch — the hero).

## Frame 7 — Grounded, never fabricates (real: demo:catch)

- scene: Split proof — codehere catches two real mistakes; ravenote stays silent.
- duration: 13.867s
- transition_in: push-slide LEFT
- status: animated
- type: benefit_highlight
- voiceover: "And it never invents. On a repo it had never seen, it caught two real mistakes. On another, with none of them, it correctly found nothing. Detection is deterministic and grounded in real code."
- src: compositions/frames/07-grounded.html

Reused verbatim (codehere CATCH vs ravenote correct-silence).

## Frame 8 — Benchmark (real)

- scene: The A/B/B+/C table; the forgetting rows snap to 100% / 0%.
- duration: 16.299s
- transition_in: zoom-through
- status: animated
- type: social_proof
- voiceover: "Does the memory logic pay off? Status-blind stores leak stale advice every time. The moment Engram forgets superseded facts, contradiction accuracy hits a hundred percent and stale leakage drops to zero — at a sixth of the tokens."
- src: compositions/frames/08-benchmark.html

Reused verbatim (the real A/B/B+/C benchmark table).

## Frame 9 — Proof of deployment (real: proof + health)

- scene: The proof line prints, then a live health check returns backend=qwen.
- duration: 12.16s
- transition_in: crossfade
- status: outline
- type: social_proof
- persuasion: Authority / proof
- beat: trust
- blueprint: device-surface-showcase (Adapt)
- focal: the terminal proof output + the health-check JSON
- voiceover: "And it's live. Here's the Qwen call on Alibaba Cloud, and the health check on our ECS box in Singapore, returning backend qwen. Persistent memory, running in production."
- asset_candidates: (none — real terminal output)
- src: compositions/frames/09-proof.html

Adapt device-surface-showcase: a terminal panel. Render REAL output verbatim:
  `$ npm run proof`
  `[1/2] Qwen/DashScope OK → "Qwen on Alibaba Cloud is reachable." · embed dims=1024`
  then a second command:
  `$ curl http://47.84.61.162/api/health`
  `{"ok":true,"backend":"qwen"}`
Scene 1 (0–6s): the `npm run proof` command types on; the `Qwen/DashScope OK` line reveals with a green check on "OK". Scene 2 (6–12s): the `curl …/api/health` command types on; the JSON `{"ok":true,"backend":"qwen"}` reveals, `"backend":"qwen"` tinted coral. Scene 3 (12–16s): an `Alibaba Cloud · ECS · Singapore · live` bar lands with a coral live-dot. Hold.

## Frame 10 — Track recap + close

- scene: The wordmark locks up with the live URL and MIT.
- duration: 10.965s
- transition_in: crossfade
- status: animated
- type: branding
- voiceover: "Engram — a MemoryAgent that learns your mistakes from git, remembers them across sessions, and catches them on your next diff. Live on Alibaba Cloud. Open source, MIT."
- src: compositions/frames/10-close.html

Reused verbatim (the wordmark lockup + live URL + MIT).
