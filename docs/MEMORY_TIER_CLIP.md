# Memory-tier catch — live-Qwen clip (the ONE win-odds move)

Goal: convert the flagship claim ("the catch a regex can't make") from a note in
STATE.md into ~15–20s of **judge-visible live Qwen**, spliced into `demo.mp4`.
Cost ~$0.01–0.02 of coupon. This is the single highest-leverage remaining action.

## Run it (records the transcript at the same time)

```bash
cd /Users/muhammadegaa/code/qwenhack
npm run demo:memory -- --qwen | tee bench/results/memory-tier-live.txt
```

- `--qwen` builds the real `QwenMentorModel` (reads your Singapore key from `.env`
  via `configFromEnv()` — verified `bench/demo-memory-catch.ts:81`).
- The **whole loop** runs live: it learns the Redux→Zustand history *and* reviews
  the new diff on Qwen. `tee` writes the transcript so you have a committable
  artifact even beyond the video.

## What the screen MUST show for the clip to count (start capture here)

1. Header: `backend=qwen` (not mock).
2. `deterministic mistake signatures firing on this diff: 0` — the regex is blind.
3. `⚠ CATCH — GROUNDED by your memory · JUDGED by Qwen (no signature, no regex)`
   with Qwen's sentence naming the Redux-reintroduction and quoting `from 'react-redux'`.
4. Last line: `qwen usage: {...}` — **real token count on screen** (this is the proof
   it was live, not mock). Keep this frame in the clip.

If step 3 doesn't fire (live extraction occasionally misses the supersession),
just re-run once — STATE 2026-07-14 recorded a clean pass (2192 tok / 7 calls).

## Caption card to overlay (drop over the clip's first 3s)

> **The catch a regex can't make — on live Qwen.**
> 0 signature patterns fire. Engram still catches it: you're reintroducing Redux,
> but your own memory says you migrated to Zustand. Grounded by a verbatim quote,
> so it never fabricates.

Lower-third while `qwen usage` shows:
> `backend=qwen` · live DashScope · real tokens, not a script.

## After recording
1. Commit the transcript: `git add bench/results/memory-tier-live.txt && git commit`
   (message: why — "judge-visible proof of the memory-tier catch on live Qwen").
2. Splice the clip into `videos/engram-launch/renders/demo.mp4` (or attach as a
   second short video on Devpost if a re-render is too heavy).
