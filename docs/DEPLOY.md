# Deploying Engram to Alibaba Cloud

The backend is one Node process (Hono API + Memory Inspector UI). It goes live
on Alibaba Cloud with **config only** — no code change — because every external
dependency sits behind an interface: model (`MentorModel`), store
(`MemoryStore`), blobs (OSS in `proof.ts`).

## Services used
| Service | Role | Wired in |
|---|---|---|
| **Model Studio / DashScope** | Qwen reasoning + embeddings | `qwen-client.ts` (OpenAI-compatible) |
| **ApsaraDB for PostgreSQL** (pgvector) | memory vectors + metadata | `pg-store.ts`, `db/schema.sql` |
| **OSS** | blob round-trip for the proof | `alibaba/proof.ts` |
| **ECS** or **Function Compute** | runs the container | `Dockerfile` |

## 1. Qwen (Model Studio)
Create an API key in Model Studio. Note the endpoint:
- mainland: `https://dashscope.aliyuncs.com/compatible-mode/v1`
- international (Singapore): `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

## 2. ApsaraDB for PostgreSQL (pgvector)
1. Create an ApsaraDB for PostgreSQL instance (PG 14+).
2. Enable the `vector` extension and apply the schema:
   ```bash
   psql "$DATABASE_URL" -f db/schema.sql
   ```
3. Set `MEMORY_STORE=postgres`, `DATABASE_URL=postgres://…`, `PGSSL=true`.

## 3. OSS
Create a bucket; set `OSS_REGION/OSS_BUCKET/OSS_ACCESS_KEY_ID/OSS_ACCESS_KEY_SECRET`.
`npm run proof` then does a put+get round-trip (the deployment proof).

## 4. Run the backend

### Option A — ECS (simplest)
```bash
# on the ECS instance
git clone <repo> && cd engram
cp .env.example .env   # fill in all the values above; ENGRAM_BACKEND=qwen
npm install
npm run start          # → :5273, reachable via the instance public IP / SLB
```

### Option B — Function Compute (recommended, serverless) via Serverless Devs
The repo ships an [`s.yaml`](../s.yaml) (FC 3.0, custom-container from the Dockerfile).
```bash
npm i -g @serverless-devs/s
s config add                       # paste your AccessKey ID + Secret (alias: default)

# secrets come from your shell env (s.yaml reads ${env.X}); never committed:
export DASHSCOPE_API_KEY=...        DASHSCOPE_BASE_URL=https://ws-...maas.aliyuncs.com/compatible-mode/v1
export OSS_REGION=oss-ap-southeast-1 OSS_BUCKET=...  OSS_ACCESS_KEY_ID=...  OSS_ACCESS_KEY_SECRET=...

s deploy                           # builds the image, pushes to ACR, creates the FC function + HTTP trigger
# → prints the public HTTP trigger URL. Open it = the live Memory Inspector on Alibaba Cloud.
```
The function listens on port 9000 (`FC_SERVER_PORT`, set in `s.yaml`); the server
honors it automatically. For cross-session persistence in the cloud, set
`MEMORY_STORE=postgres` + `DATABASE_URL` (ApsaraDB) in `s.yaml`.

### Option C — local container (smoke test before FC)
```bash
docker build -t engram .
docker run -p 5273:5273 --env-file .env engram   # → http://localhost:5273
```

## 5. Verify it's live on Alibaba Cloud
```bash
npm run hello      # Qwen round-trip
npm run proof      # Qwen + OSS round-trip  → record this (see docs/PROOF_RECORDING.md)
curl http://<host>:5273/api/health   # {"ok":true,"backend":"qwen"}
```

## Cross-session proof
With `MEMORY_STORE=postgres`, the server restores memories from ApsaraDB on
boot instead of re-learning (see `seed()` in `apps/api/server.ts`). Restart the
process — the memories, salience, reinforcements, and audit trail survive. That
is the cross-session requirement, demonstrably on Alibaba Cloud.

## Graceful degradation
If the pgvector ANN query fails (index rebuilding, extension hiccup), the store
falls back to a recency-ordered candidate set and the engine still reranks —
the API stays up. Surfaced as `degraded:true` on `/api/review`.
