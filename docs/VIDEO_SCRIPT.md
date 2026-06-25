# Mneme — 3-minute demo video script + shot list

Goal: win on the rubric in 180 seconds. Lead with the hero (a mistake that gets
*louder*), prove the moat (benchmark), close on Alibaba Cloud. Everything below
is real and runnable today — no fakery.

Pre-roll setup (not recorded):
- `npm run dev` → open `http://127.0.0.1:5273` (Memory Inspector, backend badge = mock).
- A terminal in the repo, font large.
- Optional: a second `.env` ready with `DASHSCOPE_API_KEY` + `MNEME_BACKEND=qwen` for the cloud beat.

Voiceover (VO) is tight; trim to fit. Total ≈ 180s.

---

### 0:00–0:18 · Hook + problem  *(screen: editor showing a repeated bug)*
**VO:** "Your linter knows the rules of the language. It doesn't know the rules of *you*. You forgot a null check here last month — and again last week. Your tools never learned. Mneme does."
**Shot:** quick cuts of three past commits each missing a null guard (`bench/data/history.json` shas c3, c5, c9).

### 0:18–0:35 · Thesis + write path  *(screen: terminal)*
**VO:** "Mneme reads your git history and remembers how you code — your style, your tech choices, your recurring mistakes."
**Shot:** run `npm run mneme learn`. Let the stream show: `+ new`, then `▲ reinforced ×1`, `▲ reinforced ×2`, `⊳ supersedes`. Cursor-highlight the `reinforced` lines.

### 0:35–1:12 · THE HERO — a mistake that gets louder  *(screen: terminal → browser)*
**VO:** "Each time you repeat a mistake, the memory of it gets *stronger*."
**Shot:** `npm run mneme inspect` — point at `mistake … 0.75 ▲×2` with the longest salience bar.
**VO:** "So when you write the same bug again, Mneme catches it before you ship."
**Shot:** switch to the browser. Click **Review against memory →**. The ⚠ warn appears: *"No res.ok/null guard… you've shipped this 3× — memory m_3, salience 0.75."* In the memory field, the red orb is pulsing with **▲×3**.
**VO (kicker):** "That warning is loud because you've earned it three times. It's the inverse of forgetting."

### 1:12–1:38 · Forgetting + contradiction  *(screen: browser)*
**VO:** "Mneme also changes its mind — with receipts."
**Shot:** scroll the Inspector audit trail: `⊘ uses Redux → superseded by …zustand`, `⊘ class components → functional`. Then click **Run forget** — the faint **Bun** orb disappears.
**VO:** "You moved off Redux; the old fact is superseded, not deleted. A tool you tried once decays and stops polluting advice."

### 1:38–2:02 · Context packing (knapsack)  *(screen: browser)*
**VO:** "Every review runs under a token budget. Mneme solves a knapsack to pack the highest-value memories and drops the rest — and shows you exactly what and why."
**Shot:** point at the pack meter `57/64 tok · 4 packed · 2 dropped`; hover a dropped row showing `displaced_by_higher_value_set`.

### 2:02–2:38 · THE MOAT — benchmark  *(screen: terminal)*
**VO:** "Does the memory engine actually beat the alternatives? We benchmarked it."
**Shot:** run `npm run bench`. Hold on the table.
**VO:** "Full-context stuffing and naive top-k both leak stale facts 100% of the time and resolve contradictions only half the time. Mneme: 100% contradiction accuracy, zero stale leakage — at six times fewer tokens. Forgetting and supersession are the difference between a memory *engine* and a vector lookup."

### 2:38–2:58 · Alibaba Cloud  *(screen: terminal + browser badge)*
**VO:** "All reasoning runs on Qwen, on Alibaba Cloud."
**Shot:** `npm run proof` → `[1/2] Qwen/DashScope OK …` `[2/2] OSS round-trip OK`. Cut to the UI badge flipping **mock → qwen** after restart with `MNEME_BACKEND=qwen`.
**VO:** "Qwen for every memory operation, OSS and ApsaraDB for storage. Same engine, live."

### 2:58–3:00 · Close
**Shot:** title card. **VO:** "Mneme. The mentor that remembers how you code. Open source, MIT."

---

## Shot list (capture order — record these clips, edit to the script)
1. `npm run mneme learn` (full stream)
2. `npm run mneme inspect` (hold on the ▲×2 mistake)
3. Browser: **Review against memory →** (warn + pulsing orb) — record 2 takes
4. Browser: scroll audit trail; **Run forget** (Bun disappears)
5. Browser: pack meter + a dropped row hover
6. `npm run bench` (hold 5s on the table)
7. `npm run proof` (Qwen + OSS lines)
8. Browser refresh with `MNEME_BACKEND=qwen` → badge = qwen
9. Title card

## Rubric mapping (why each beat earns points)
- **Technical depth (30%)** → write-path stream, knapsack pack meter, benchmark table.
- **Innovation (30%)** → reinforced-mistake hero, the living memory field, forgetting+supersession.
- **Problem value (25%)** → the hook (repeated bug your tools never learn).
- **Presentation (15%)** → this script, the Inspector visuals, the title card.
