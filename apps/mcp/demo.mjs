/**
 * engram MCP demo — spins up the Engram MCP server and drives it as a client,
 * exactly how a coding agent (Claude Desktop / Cursor) would: it inspects the
 * developer's memory, then reviews a fresh diff and shows the grounded catch.
 *
 *   node apps/mcp/demo.mjs                      # deterministic mock (free)
 *   ENGRAM_BACKEND=qwen MEMORY_STORE=json node apps/mcp/demo.mjs   # live Qwen
 *
 * The env is passed through to the spawned server so ENGRAM_BACKEND=qwen takes
 * effect (the MCP SDK uses a minimal env by default). Used in docs/DEMO_SCRIPT.md.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", resolve(here, "server.ts")],
  cwd: resolve(here, "../.."),
  env: { ...process.env },
});
const client = new Client({ name: "engram-demo", version: "0" });
await client.connect(transport);

const insp = await client.callTool({ name: "engram_inspect", arguments: {} });
const inspJson = JSON.parse(insp.content[0].text);
console.log(`\n▸ engram_inspect  (backend: ${inspJson.backend} · ${inspJson.count} memories)`);
console.log(insp.content[0].text);

// A fresh diff: fetch a user, parse JSON, return it — no res.ok guard.
const diff = `export async function getUser(id) {\n  const res = await fetch('/api/users/' + id)\n  const user = await res.json()\n  return user.profile\n}`;
console.log(`\n▸ engram_review  (a fresh diff — the agent asks Engram to review it)`);
const rev = await client.callTool({ name: "engram_review", arguments: { diff, file: "src/api/users.ts" } });
console.log(rev.content[0].text);

await client.close();
