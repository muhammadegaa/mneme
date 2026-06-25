import type { QwenClient } from "./model/qwen-client.js";
import type { MemoryInput, MemoryKind } from "./types.js";

/**
 * WRITE-PATH step 1: extract atomic memories about how a developer codes, from a
 * single git commit diff (or a chat turn). Uses Qwen structured output (cheap
 * tier — runs per source). Returns 0..N atomic MemoryInputs; the engine handles
 * embed/dedupe/reinforce/supersede/store.
 */

const KINDS: MemoryKind[] = ["style", "tech", "mistake", "project"];

interface RawMemory {
  text?: unknown;
  kind?: unknown;
  subject?: unknown;
  predicate?: unknown;
  salience?: unknown;
}

function clamp01(n: number, fallback: number): number {
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback;
}

/** Validate + coerce the model's JSON into typed MemoryInputs. Throws on bad shape. */
export function parseExtraction(raw: unknown, source: string, defaultSubject: string): MemoryInput[] {
  const obj = raw as { memories?: unknown };
  const arr = obj?.memories;
  if (!Array.isArray(arr)) throw new Error("expected { memories: [...] }");
  const out: MemoryInput[] = [];
  for (const item of arr as RawMemory[]) {
    if (typeof item?.text !== "string" || item.text.trim() === "") continue;
    const kind = (KINDS as string[]).includes(item.kind as string) ? (item.kind as MemoryKind) : "style";
    const salience = clamp01(Number(item.salience), 0.5);
    // Durable preferences/decisions decay slowly; mistakes decay medium so a
    // habit you've broken fades — unless it keeps recurring and gets reinforced.
    const decayRate = kind === "mistake" ? 0.03 : 0.01;
    out.push({
      text: item.text.trim(),
      kind,
      subject: typeof item.subject === "string" && item.subject.trim() ? item.subject.trim() : defaultSubject,
      predicate: typeof item.predicate === "string" && item.predicate.trim() ? item.predicate.trim() : undefined,
      salience,
      decayRate,
      source,
    });
  }
  return out;
}

const SYSTEM = `You are the memory of a code-review mentor. From a single git commit (message + diff), extract durable, atomic facts about HOW THIS DEVELOPER codes — things worth recalling when reviewing their future diffs.
Rules:
- Each memory is ONE self-contained statement. Split compound observations.
- "kind" is one of:
  - "style": formatting/naming/paradigm preference (e.g. "prefers early-return over nested ifs").
  - "tech": a library/framework/tool choice (e.g. "uses Zustand for state"). These change over time.
  - "mistake": a recurring bug/anti-pattern the dev introduces (e.g. "forgets null checks on API responses"). Reinforced on repeat.
  - "project": an architecture decision/constraint/fact about THIS repo (e.g. "no ORM in the request hot path").
- "subject": "dev" for facts about the developer; a stable repo slug for project facts.
- "predicate": a normalized SLOT slug.
  - For "tech"/"style"/"project": the attribute a later commit could overwrite (e.g. "state_mgmt", "control_flow", "data_access").
  - For "mistake": a stable class slug so repeats match (e.g. "null_check", "unhandled_promise", "off_by_one").
- "salience": 0..1 long-term importance.
- Only extract durable signal. Ignore one-off mechanical changes, version bumps, and noise.
Return JSON: {"memories":[{"text","kind","subject","predicate","salience"}, ...]}. Empty list if the commit reveals nothing durable.`;

export async function extractFromCommit(
  qwen: QwenClient,
  commit: { sha: string; message: string; diff: string },
  ctx: { defaultSubject: string },
): Promise<MemoryInput[]> {
  const body = `commit ${commit.sha}\nmessage: ${commit.message}\n\ndiff:\n${commit.diff}`;
  return qwen.structured(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: body },
    ],
    (raw) => parseExtraction(raw, commit.sha, ctx.defaultSubject),
    { tier: "cheap" },
  );
}

/** Extract from a free-form chat turn (the dev telling the mentor something). */
export async function extractFromTurn(
  qwen: QwenClient,
  turn: { text: string },
  ctx: { source: string; defaultSubject: string },
): Promise<MemoryInput[]> {
  return qwen.structured(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: `developer said:\n${turn.text}` },
    ],
    (raw) => parseExtraction(raw, ctx.source, ctx.defaultSubject),
    { tier: "cheap" },
  );
}
