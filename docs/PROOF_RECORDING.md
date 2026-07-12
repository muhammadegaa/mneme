# 30-second "backend running on Alibaba Cloud" proof recording

The submission needs evidence the backend runs on and calls Alibaba Cloud. You
have two, and either is sufficient on its own:

1. **The live box** — Engram is already serving on an Alibaba Cloud ECS instance
   (Singapore) on `backend=qwen`. `curl http://47.84.61.162/api/health` →
   `{"ok":true,"backend":"qwen"}`, from the cloud host.
2. **The direct call** — [`alibaba/proof.ts`](../alibaba/proof.ts) makes a live
   **Qwen / DashScope** call (reasoning + 1024-dim embeddings) and prints the result.

The Qwen call IS the required proof — all reasoning runs on Qwen on Alibaba Cloud.
OSS is an optional extra object round-trip, not required (and the redeploy runbook
strips OSS keys for security, so the recommended take is Qwen-only).

## One-time setup (not recorded)
```bash
cp .env.example .env
#   DASHSCOPE_API_KEY=...      (Model Studio key)
#   DASHSCOPE_BASE_URL=...     (mainland or -intl Singapore)
npm install
```
Run it on the ECS box (SSH in) so the recorded prompt reads e.g.
`root@iZ...:~/engram$` — that framing *is* the proof.

## The 30s take (recorded)
1. **(0–5s)** Show the host + the live service:
   `curl -s http://47.84.61.162/api/health` → `{"ok":true,"backend":"qwen"}`.
   (Or on the box: `curl -s http://100.100.100.200/latest/meta-data/region-id` —
   the Alibaba Cloud instance-metadata endpoint prints the region, proving ECS.)
2. **(5–10s)** `cat .env | grep BASE_URL` (show the DashScope endpoint, key redacted).
3. **(10–28s)** `npm run proof` — hold on the output:
   ```
   === Engram · Proof of Alibaba Cloud deployment ===
   [1/2] Qwen/DashScope OK → "Qwen on Alibaba Cloud is reachable." · embed dims=1024
   [2/2] OSS skipped (set OSS_* in .env to enable) — wired in Phase 5.
   ✅ Alibaba Cloud services reachable from this backend.
   ```
4. **(28–30s)** Optional: hit the live Inspector at `http://47.84.61.162` on camera.

## "Proof of Alibaba Cloud Deployment" link field
The public GitHub URL to [`alibaba/proof.ts`](../alibaba/proof.ts) + the live
`http://47.84.61.162` URL + this recording.

## Notes
- `proof.ts` is guarded: with no `OSS_*` set it runs the Qwen half and prints that
  OSS is pending — it never silently "passes". Set the OSS vars only if you want
  the optional two-service round-trip (not required, not recommended on the public box).
- `ENGRAM_BACKEND=qwen npm run start` serves the whole product from the ECS host —
  a longer "it's all live" shot if you want one.
