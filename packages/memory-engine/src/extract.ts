import type { QwenClient } from "./model/qwen-client.js";
import type { MemoryInput, MemoryKind } from "./types.js";
import { mistakeSignature } from "./mistakes.js";
import { diffAddedText } from "./grounding.js";

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

/**
 * Validate + coerce the model's JSON into typed MemoryInputs. Throws on bad shape.
 *
 * EXTRACTION GROUNDING: when `groundCode` is given (commit path), a `mistake` is
 * kept only if it names a known mistake class AND that class's signature is
 * actually present in the added code. The model likes to confabulate plausible
 * developer mistakes to fill the schema (observed: it "found" async/await null
 * bugs in a repo with no async at all) — this rejects every mistake it can't
 * back with real code, and normalizes the survivors to canonical text so a
 * repeat mistake reinforces one memory instead of splitting on phrasing. Turns
 * (no code) skip the gate: there, a mistake is the dev's own self-report.
 */
export function parseExtraction(raw: unknown, source: string, defaultSubject: string, groundCode?: string): MemoryInput[] {
  const obj = raw as { memories?: unknown };
  const arr = obj?.memories;
  if (!Array.isArray(arr)) throw new Error("expected { memories: [...] }");
  const out: MemoryInput[] = [];
  for (const item of arr as RawMemory[]) {
    if (typeof item?.text !== "string" || item.text.trim() === "") continue;
    const kind = (KINDS as string[]).includes(item.kind as string) ? (item.kind as MemoryKind) : "style";
    const predicate = typeof item.predicate === "string" && item.predicate.trim() ? item.predicate.trim() : undefined;
    const oneOff = predicate === "runtime_experiment";

    // The grounding gate: a code-derived mistake must match a known signature in
    // the actual added code, or it's dropped as unverifiable.
    if (kind === "mistake" && groundCode !== undefined) {
      const sig = mistakeSignature(predicate);
      if (!sig || !sig.re.test(groundCode)) continue;
      out.push({ text: sig.text, kind, subject: "dev", predicate: sig.predicate, salience: sig.salience, decayRate: 0.03, source });
      continue;
    }

    // NORMALIZE SUBJECT: the model is inconsistent (it returns commit shas /
    // filenames). A memory is about the DEVELOPER (style/tech/mistake) or the
    // REPO (project) — force that so slot-based supersede/reinforce is reliable.
    const subject = kind === "project" ? "repo" : "dev";

    // A one-off tool experiment is transient regardless of what the model scored:
    // cap salience low + decay fast so it ages out (the forgetting demo). Durable
    // facts decay slowly; mistakes decay medium unless reinforced.
    const salience = oneOff ? Math.min(clamp01(Number(item.salience), 0.2), 0.2) : clamp01(Number(item.salience), 0.5);
    const decayRate = oneOff ? 0.06 : kind === "mistake" ? 0.03 : 0.01;

    out.push({ text: item.text.trim(), kind, subject, predicate, salience, decayRate, source });
  }
  return out;
}

const SYSTEM = `You are the memory of a code-review mentor. From a single git commit (message + diff), extract durable, atomic facts about HOW THIS DEVELOPER codes — things worth recalling when reviewing their future diffs.

Each memory is ONE self-contained statement with: text, kind, subject ("dev", or a repo slug for project facts), predicate (a stable SLOT slug — repeats and overrides MUST share the same slug), salience (0..1).

kind = one of style | tech | mistake | project.

DETECT THESE ANTI-PATTERNS as kind="mistake" whenever the ADDED code matches — use the EXACT predicate and text given (identical wording is required so repeat occurrences reinforce the same memory):
- Added code reads an HTTP/fetch response body (e.g. \`await res.json()\`, \`response.data\`) WITHOUT first checking \`res.ok\`/status or null-guarding the parsed value before using it → predicate="null_check", text="forgets null/ok checks on API responses".
- An empty catch block that swallows the error → predicate="error_handling", text="swallows errors in empty catch blocks".
- Uses \`var\` for a declaration → predicate="var_usage", text="uses var instead of const/let".
Only report a mistake when the offending code is ACTUALLY PRESENT in the added lines — quote it to yourself first. Do NOT infer a mistake from the commit message, a filename, or a feature description. If the pattern isn't in the diff, do not emit it.

For tech / style / project, use these CANONICAL slot predicates when applicable, so a newer choice supersedes the older one in the same slot:
- state management library → predicate="state_mgmt" (e.g. "uses Redux for state management" / "uses Zustand for state management").
- React component paradigm → predicate="component_style" ("writes class components" / "writes functional components with hooks").
- data-access / ORM decision about the repo → kind="project", predicate="data_access".
- runtime/tool experiments (a one-off tool) → predicate="runtime_experiment", lower salience.

Rules: split compound observations; ignore pure mechanical noise (version bumps, doc-only edits); only durable signal.
Return JSON: {"memories":[{"text","kind","subject","predicate","salience"}, ...]}. Empty list if nothing durable.`;

export async function extractFromCommit(
  qwen: QwenClient,
  commit: { sha: string; message: string; diff: string },
  ctx: { defaultSubject: string },
): Promise<MemoryInput[]> {
  const body = `commit ${commit.sha}\nmessage: ${commit.message}\n\ndiff:\n${commit.diff}`;
  const added = diffAddedText(commit.diff);
  return qwen.structured(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: body },
    ],
    (raw) => parseExtraction(raw, commit.sha, ctx.defaultSubject, added),
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
