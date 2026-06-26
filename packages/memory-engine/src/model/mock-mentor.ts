import type { Memory, MemoryInput, MemoryKind } from "../types.js";
import type { CommitSource, MentorModel, ReviewComment, ReviewResult } from "./mentor.js";
import type { QwenUsage } from "./qwen-client.js";

/**
 * Deterministic, zero-credit stand-in for Qwen. Same interface as the real
 * model, so the entire learn→review→forget pipeline + the benchmark run offline
 * and reproducibly. Inference is keyword/pattern-driven: realistic enough to
 * demo and to plant facts in the benchmark, and trivially swapped for Qwen.
 *
 * Both "extract" and "review" share one `scan()` over code text, so a pattern
 * the mentor learns from history is the same pattern it flags in a new diff.
 */

interface Pattern {
  re: RegExp;
  kind: MemoryKind;
  predicate: string;
  text: string;
  salience: number;
  /** review severity when this pattern appears in a fresh diff. */
  severity: ReviewComment["severity"];
  /** message used when flagged in review. */
  flag?: string;
}

const PATTERNS: Pattern[] = [
  {
    re: /fetch\s*\([^)]*\)[\s\S]{0,80}?\.json\s*\(\s*\)/i,
    kind: "mistake",
    predicate: "null_check",
    text: "forgets null/ok checks on API responses",
    salience: 0.45,
    severity: "warn",
    flag: "No `res.ok`/null guard before reading the body — a 404 throws or yields null and the next access crashes.",
  },
  {
    re: /catch\s*\([^)]*\)\s*\{\s*\}/,
    kind: "mistake",
    predicate: "error_handling",
    text: "swallows errors in empty catch blocks",
    salience: 0.45,
    severity: "warn",
    flag: "Empty catch swallows the error — at least log or rethrow.",
  },
  {
    re: /\bvar\s+\w+/,
    kind: "mistake",
    predicate: "var_usage",
    text: "uses var instead of const/let",
    salience: 0.35,
    severity: "warn",
    flag: "Prefer const/let over var.",
  },
  { re: /from\s+['"]zustand['"]/i, kind: "tech", predicate: "state_mgmt", text: "uses Zustand for state management", salience: 0.7, severity: "info" },
  { re: /from\s+['"]react-redux['"]|createStore\s*\(/i, kind: "tech", predicate: "state_mgmt", text: "uses Redux for state management", salience: 0.7, severity: "info" },
  { re: /\bclass\s+\w+\s+extends\s+(React\.)?Component/, kind: "style", predicate: "component_style", text: "writes class components (OOP style)", salience: 0.5, severity: "info" },
  { re: /export\s+(default\s+)?function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*return\s*\(/, kind: "style", predicate: "component_style", text: "writes functional components with hooks", salience: 0.5, severity: "info" },
  { re: /if\s*\([^)]*\)\s*return|^\s*return\s+\w/m, kind: "style", predicate: "control_flow", text: "prefers early-return over nested conditionals", salience: 0.5, severity: "info" },
  { re: /\/\/\s*no\s+orm|raw\s+sql|db\.query\s*\(/i, kind: "project", predicate: "data_access", text: "no ORM in the request hot path", salience: 0.55, severity: "info" },
  { re: /from\s+['"]bun|bun\s+run|#!.*bun/i, kind: "tech", predicate: "runtime_experiment", text: "tried Bun for a one-off script", salience: 0.18, severity: "info" },
];

const DIM = 256;

/** Deterministic hashed bag-of-words embedding. Identical text -> identical vector. */
export function hashEmbed(text: string, dim = DIM): number[] {
  const v = new Array<number>(dim).fill(0);
  for (const tok of text.toLowerCase().split(/[^a-z0-9_]+/).filter(Boolean)) {
    let h = 2166136261;
    for (let i = 0; i < tok.length; i++) {
      h ^= tok.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    v[h % dim]! += 1;
  }
  return v;
}

/**
 * Lines to judge. For a unified diff: the added (`+`) lines only. For a raw code
 * snippet (no `+` markers — e.g. the live "review this" box), the whole text.
 */
function addedLines(diff: string): string {
  const added = diff
    .split("\n")
    .filter((l) => l.startsWith("+") && !l.startsWith("+++"))
    .map((l) => l.slice(1));
  if (added.length) return added.join("\n");
  return diff.replace(/^@@.*$/gm, "").replace(/^[-+]{3}.*$/gm, "");
}

export class MockMentorModel implements MentorModel {
  readonly backend = "mock" as const;

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => hashEmbed(t));
  }

  private scan(text: string): MemoryInput[] {
    const out: MemoryInput[] = [];
    const seen = new Set<string>();
    for (const p of PATTERNS) {
      if (p.re.test(text) && !seen.has(p.predicate)) {
        seen.add(p.predicate);
        out.push({
          text: p.text,
          kind: p.kind,
          subject: p.kind === "project" ? "repo" : "dev",
          predicate: p.predicate,
          salience: p.salience,
          // mistakes decay medium; one-off experiments fade fast; the rest are durable.
          decayRate: p.kind === "mistake" ? 0.03 : p.predicate === "runtime_experiment" ? 0.06 : 0.01,
          source: "",
        });
      }
    }
    return out;
  }

  async extractFromCommit(commit: CommitSource, ctx: { defaultSubject: string }): Promise<MemoryInput[]> {
    const found = this.scan(`${commit.message}\n${addedLines(commit.diff)}`);
    return found.map((m) => ({ ...m, source: commit.sha, subject: m.subject || ctx.defaultSubject }));
  }

  async extractFromTurn(turn: { text: string }, ctx: { source: string; defaultSubject: string }): Promise<MemoryInput[]> {
    const found = this.scan(turn.text);
    return found.map((m) => ({ ...m, source: ctx.source, subject: m.subject || ctx.defaultSubject }));
  }

  async review(req: { diff: string; file?: string; memories: Memory[] }): Promise<ReviewResult> {
    const added = addedLines(req.diff);
    const comments: ReviewComment[] = [];
    // Index packed memories by slot so a detected issue can cite the memory.
    const byPredicate = new Map<string, Memory>();
    for (const m of req.memories) if (m.predicate) byPredicate.set(m.predicate, m);

    for (const p of PATTERNS) {
      if (!p.re.test(added)) continue;
      const cited = byPredicate.get(p.predicate);
      // Only surface what memory tells us is worth surfacing: a flagged pattern
      // we have a memory for, or a notable mistake even if unseen before.
      if (p.severity === "warn") {
        const seenN = cited ? cited.reinforcements : 0;
        const tail = cited
          ? ` You've shipped this ${seenN + 1}× — memory ${cited.id}, salience ${cited.salience.toFixed(2)}.`
          : "";
        comments.push({
          file: req.file,
          severity: "warn",
          message: (p.flag ?? p.text) + tail,
          citedMemoryId: cited?.id,
        });
      } else if (cited) {
        comments.push({
          file: req.file,
          severity: "info",
          message: `Consistent with your tracked preference: ${cited.text} (memory ${cited.id}).`,
          citedMemoryId: cited.id,
        });
      }
    }
    return { comments };
  }

  usage(): QwenUsage {
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0, calls: 0 };
  }
}
