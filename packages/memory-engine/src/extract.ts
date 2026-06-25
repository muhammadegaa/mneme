import type { QwenClient } from "./model/qwen-client.js";
import type { MemoryInput, MemoryKind } from "./types.js";

/**
 * WRITE-PATH step 1: extract atomic memories from a raw conversation turn and
 * classify them. Uses Qwen structured output (cheap tier — this runs on every
 * turn). Returns 0..N atomic MemoryInputs; the engine handles embed/dedupe/store.
 */

const KINDS: MemoryKind[] = ["preference", "fact", "event", "episodic"];

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
    const kind = (KINDS as string[]).includes(item.kind as string) ? (item.kind as MemoryKind) : "fact";
    const salience = clamp01(Number(item.salience), 0.5);
    // Preferences and facts decay slowly; events/episodic decay faster.
    const decayRate = kind === "preference" || kind === "fact" ? 0.01 : 0.05;
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

const SYSTEM = `You extract durable, atomic memories from a single conversation turn for a B2B account-management assistant.
Rules:
- Each memory is ONE self-contained fact. Split compound statements.
- Only extract things worth remembering across future sessions (preferences, commitments, facts about the account/people, decisions, events). Ignore pleasantries and transient chit-chat.
- "subject": a stable slug for who/what the memory is about (e.g. "acme-corp", "jane-doe").
- "predicate": a normalized attribute slug when the memory fills a single slot that a later fact could overwrite (e.g. "contact_channel", "renewal_date", "budget"). Omit when not slot-like.
- "kind": one of preference | fact | event | episodic.
- "salience": 0..1 importance for long-term recall (a renewal date >> a passing comment).
Return JSON: {"memories":[{"text","kind","subject","predicate","salience"}, ...]}. Empty list if nothing durable.`;

export async function extractMemories(
  qwen: QwenClient,
  turn: { role: "user" | "agent"; text: string },
  ctx: { source: string; defaultSubject: string },
): Promise<MemoryInput[]> {
  return qwen.structured(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Speaker: ${turn.role}\nTurn:\n${turn.text}` },
    ],
    (raw) => parseExtraction(raw, ctx.source, ctx.defaultSubject),
    { tier: "cheap" },
  );
}
