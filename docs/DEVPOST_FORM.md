# Devpost form: field-by-field paste sheet

Every field on the submission form, in order. Long story text lives in
[`../DEVPOST.md`](../DEVPOST.md). Copy it from the `**Track:**` line down.

House style for anything we submit: no em dashes. Use a period, a comma, a colon,
or parentheses instead.

---

## Project name *(60 char limit)*

```
Engram: the code reviewer that remembers you
```
*(43 chars.)*

## Elevator pitch *(200 char limit)*

```
A code reviewer with a memory of YOU. It mines your git history for the mistakes you keep shipping and catches them on your next diff, including repeats no regex could find. Built on Qwen.
```
*(186 chars.)*

## About the project

Paste **all of `DEVPOST.md` starting at the `**Track:** Track 1, MemoryAgent` line**
(skip the first 5 lines, which are the title and the paste-ready note). It is already
Markdown with the required sections in Devpost's expected order:
Inspiration · What it does · How we built it · Challenges · Accomplishments ·
What we learned · What's next · Built with.

**Track ID must be visible.** It is, in the first pasted line.

## Built with *(max 25 tags, 20 below)*

```
typescript, node.js, qwen, alibaba-cloud, dashscope, qwen-plus, qwen-turbo,
qwen-max, text-embedding-v3, model-context-protocol, mcp, hono, ecs, apsaradb,
postgresql, pgvector, function-compute, oss, vitest, git
```

## "Try it out" links

| # | URL | Label it as |
|---|---|---|
| 1 | `https://github.com/muhammadegaa/mneme` | GitHub repo (MIT) |
| 2 | `http://47.84.61.162` | Live on Alibaba Cloud ECS (Singapore): Memory Inspector, `backend=qwen` |
| 3 | `https://github.com/muhammadegaa/mneme/blob/main/packages/memory-engine/src/model/qwen-client.ts` | **Proof of Alibaba Cloud deployment** (required). Calls DashScope. |

Link 3 is the requirement-satisfying one. Add
`.../blob/main/alibaba/proof.ts` as a 4th if the form allows it.

## Image gallery *(3:2, up to 15)*

1. `docs/architecture.png`, the **required architecture diagram**. Upload it first.
2. A screenshot of the Memory Inspector mid-review (packing panel visible).
3. A terminal frame of the memory-tier catch with `qwen usage: {...}` on screen.

## Video demo link

YouTube, **public**, roughly 3 minutes:
`videos/engram-launch/renders/demo.mp4` (3:17).

---

## Before you hit submit

- [ ] GitHub **About** panel shows the MIT license (repo Settings, license detection)
- [ ] Repo is public
- [ ] Video is public on YouTube and plays in an incognito window
- [ ] Architecture diagram uploaded to the gallery
- [ ] Track 1 named in the description
- [ ] *(bonus)* blog post published, paste the URL for the Blog Post Award
