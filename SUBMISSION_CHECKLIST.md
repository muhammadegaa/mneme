# Engram — Submission Checklist (Track 1: MemoryAgent)

Mapped to the **actual** Devpost requirements (Global AI Hackathon with Qwen Cloud).
Deadline: **Jul 20, 2026, 2:00pm PDT**. 🟢 done · 🟡 needs you · 🔴 missing.

## Submission requirements (verbatim from the rules)

| # | Requirement (as written) | Status | Artifact / where |
|---|---|---|---|
| 1 | Public code repo with all source + instructions; **open-source LICENSE detectable in the About section** | 🟡 | Repo public + MIT [`LICENSE`](./LICENSE) present. **YOU: confirm the license shows in the GitHub *About* panel** (set it in repo settings). |
| 2 | **Proof of Alibaba Cloud Deployment = a link to a code file** that demonstrates use of Alibaba Cloud services/APIs | 🟢 | Link **[`packages/memory-engine/src/model/qwen-client.ts`](./packages/memory-engine/src/model/qwen-client.ts)** (calls `dashscope.aliyuncs.com` — Alibaba Cloud) and **[`alibaba/proof.ts`](./alibaba/proof.ts)**. *(A live URL is NOT required — a code file is.)* |
| 3 | Architecture diagram (Qwen Cloud ↔ backend/db/frontend) | 🟢 | [`docs/architecture.png`](./docs/architecture.png) (source [`.html`](./docs/architecture.html)) |
| 4 | Video **~3 min** demonstrating it functioning; public on **YouTube/Vimeo/Facebook** | 🟡 | `videos/engram-launch/renders/demo.mp4` (3:17 — "about 3 minutes" ✓). **YOU: upload to YouTube, set public, paste the link.** |
| 5 | Text description of features/functionality | 🟢 | [`DEVPOST.md`](./DEVPOST.md) — paste-ready |
| 6 | Identify the Track | 🟢 | **Track 1: MemoryAgent** |
| 7 | *Optional:* blog/social post → Blog Post Award ($500 × 10) | 🟢 | [`docs/BLOG.md`](./docs/BLOG.md) — **YOU: publish it (Medium/Dev.to/X) + paste the link** for the extra prize |

## Judging criteria → our evidence

| Criterion (weight) | Evidence |
|---|---|
| **Technical Depth & Engineering (30%)** — sophisticated Qwen use, MCP, custom components, perf | MCP server (4 tools); Qwen model routing (turbo/plus/max + text-embedding-v3); **Qwen judgment+fix** on grounded catches; 0/1-knapsack packer; salience decay. `npm run demo:mcp`, `npm run bench:scale` |
| **Innovation & AI Creativity (30%)** — architecture quality, modularity, error handling, clean code | Standalone `@engram/memory-engine` package · **47 tests** · atomic store + per-commit resilience · grounding gate. `npm test` |
| **Problem Value & Impact (25%)** — real pain, productization potential | Recurring-mistake pain (everyone ships the same bug); **the memory compounds** (a data moat, not a model patch); grounded on real unseen repos. `npm run demo:catch` |
| **Presentation & Documentation (15%)** — clear demo, visualized logic, architecture docs | The demo video + [`docs/architecture.png`](./docs/architecture.png) + this README |

## Track-1 spec mapping (say these words in the submission)

*"efficient memory storage & retrieval"* → hybrid rank · *"timely forgetting of outdated
information"* → decay + supersession · *"recalling critical memories within a limited context
window"* → 0/1-knapsack packer · *"increasingly accurate across sessions"* → reinforcement +
`npm run demo:persist`.

## What's left — all yours (I can't do these)
1. **GitHub *About*:** set the MIT license so it's detectable; add a one-line description + the live URL.
2. **Upload the video** to YouTube (public) and paste the link into the Devpost submission.
3. **Publish the blog** (`docs/BLOG.md`) and paste its URL for the Blog Post Award.
4. *(Optional, not required for proof)* redeploy the ECS box (`docs/DEPLOY.md`) so the live URL shows the latest code.
5. **Submit on Devpost**, Track 1, before Jul 20 2:00pm PDT: repo link · proof code-file link · architecture diagram · video link · `DEVPOST.md` description.
