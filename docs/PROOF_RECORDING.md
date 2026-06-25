# 30-second "backend running on Alibaba Cloud" proof recording

This is the separate proof clip the submission requires: evidence the backend
calls Alibaba Cloud services. One file — [`alibaba/proof.ts`](../alibaba/proof.ts)
— exercises **Qwen via DashScope** (reasoning + embeddings) and **Alibaba Cloud
OSS** (object round-trip). Record it running, ideally on an Alibaba Cloud ECS /
Function Compute instance so the shell prompt shows the cloud host.

## One-time setup (not recorded)
```bash
cp .env.example .env
# Fill in:
#   DASHSCOPE_API_KEY=...          (Model Studio key)
#   DASHSCOPE_BASE_URL=...         (mainland or -intl)
#   OSS_REGION / OSS_BUCKET / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET
npm install
```
If running on Alibaba Cloud ECS, SSH in first so the recorded prompt reads e.g.
`root@iZ...alibaba...:~/mneme$` — that framing *is* the proof.

## The 30s take (recorded)
1. **(0–4s)** Show the host: `hostname` / `curl -s http://100.100.100.200/latest/meta-data/region-id`
   (Alibaba Cloud instance metadata endpoint — prints the region, proving you're on ECS).
2. **(4–8s)** `cat .env | grep -E 'BASE_URL|OSS_BUCKET'` (show the endpoints, key redacted).
3. **(8–26s)** `npm run proof` — hold on the output:
   ```
   === Mneme · Proof of Alibaba Cloud deployment ===
   [1/2] Qwen/DashScope OK → "Qwen on Alibaba Cloud is reachable." · embed dims=1024
   [2/2] OSS round-trip OK → put+get "mneme/proof.txt" (NN bytes)
   ✅ Alibaba Cloud services reachable from this backend.
   ```
4. **(26–30s)** Optional: in the OSS console, show the `mneme/proof.txt` object that was just written.

## What to put in the "Proof of Alibaba Cloud Deployment" link field
The public GitHub URL to [`alibaba/proof.ts`](../alibaba/proof.ts) — the single
file that makes the calls — plus this recording.

## Notes
- `proof.ts` is guarded: with no `OSS_*` set it runs the Qwen half and clearly
  prints that OSS is pending — so it never silently "passes". Set the OSS vars
  for the full two-service proof.
- The same `MNEME_BACKEND=qwen npm run dev` then serves the *whole product* from
  that Alibaba Cloud host, if you want a longer "it's all live" shot.
