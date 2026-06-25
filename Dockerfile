# Mneme — single-process backend (API + Memory Inspector UI).
# Deploys to Alibaba Cloud ECS or Function Compute (custom container runtime).
FROM node:20-slim

WORKDIR /app

# Install deps first for layer caching.
COPY package.json package-lock.json* ./
COPY packages/memory-engine/package.json packages/memory-engine/
COPY apps/api/package.json apps/api/
RUN npm install --omit=dev=false

# App source.
COPY . .

ENV NODE_ENV=production
ENV PORT=5273
# Set at deploy time:
#   DASHSCOPE_API_KEY, DASHSCOPE_BASE_URL, MNEME_BACKEND=qwen
#   MEMORY_STORE=postgres, DATABASE_URL, PGSSL=true
#   OSS_REGION/OSS_BUCKET/OSS_ACCESS_KEY_ID/OSS_ACCESS_KEY_SECRET
EXPOSE 5273

CMD ["npm", "run", "start"]
