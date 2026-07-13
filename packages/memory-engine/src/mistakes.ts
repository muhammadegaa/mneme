/**
 * The single source of truth for the mistake classes Engram can detect RELIABLY.
 *
 * Each signature is a code pattern with a deterministic regex. Everything that
 * touches "is this a real mistake" — the mock model, extraction grounding, and
 * the review guard — reads THIS list, so detection, learning, and catching can
 * never disagree. A mistake memory that no signature backs is treated as
 * ungrounded: we would rather say nothing than assert a mistake that isn't in
 * the code (the ravenote hallucination failure mode).
 *
 * The registry is deliberately small and high-precision. Breadth is a non-goal:
 * the product's novelty is the MEMORY dynamics over mistakes (reinforce / forget
 * / supersede / pack / ground), not open-ended LLM bug-finding. Add a class here
 * only when its regex is precise enough to trust unattended.
 */
export interface MistakeSignature {
  /** Stable slot slug — repeats reinforce the same memory. */
  predicate: string;
  /** Canonical text; verified mistakes are normalized to this so phrasing drift
   * (e.g. Qwen paraphrasing) never splits one recurring mistake into many. */
  text: string;
  /** Salience a first, un-repeated occurrence assigns. */
  salience: number;
  /** review severity when this appears in a fresh diff. */
  severity: "warn";
  /** the message surfaced when flagged in review. */
  flag: string;
  /** a concrete default fix (the mock uses this; live Qwen writes a context-specific one). */
  fix: string;
  /** The deterministic signature. A match in the code under review is the proof
   * the mistake is real — used to both detect it and to reject a mislabeled quote. */
  re: RegExp;
  /**
   * Optional guard: if this matches the code, the mistake is NOT fired even when
   * `re` matches. Used for omission mistakes where `re` only finds the shape and
   * `absent` proves the guard is actually missing — e.g. a `fetch().json()` that
   * already checks `res.ok` is not a null-check mistake.
   */
  absent?: RegExp;
}

export const MISTAKE_SIGNATURES: MistakeSignature[] = [
  {
    predicate: "null_check",
    text: "forgets null/ok checks on API responses",
    salience: 0.45,
    severity: "warn",
    flag: "No `res.ok`/null guard before reading the body — a 404 throws or yields null and the next access crashes.",
    fix: "Guard the response: `if (!res.ok) throw new Error(res.status); const data = await res.json();`",
    re: /fetch\s*\([^)]*\)[\s\S]{0,80}?\.json\s*\(\s*\)/i,
    // If the code already guards the response, it's NOT the mistake.
    absent: /\.ok\b|\.status\b|\?\./i,
  },
  {
    predicate: "error_handling",
    text: "swallows errors in empty catch blocks",
    salience: 0.45,
    severity: "warn",
    flag: "Empty catch swallows the error — at least log or rethrow.",
    fix: "Log or rethrow: `catch (e) { logger.error(e); throw e; }` — don't swallow it silently.",
    // Optional catch binding (`catch {}`, ES2019) has no parens.
    re: /catch\s*(?:\([^)]*\))?\s*\{\s*\}/,
  },
  {
    predicate: "var_usage",
    text: "uses var instead of const/let",
    salience: 0.35,
    severity: "warn",
    flag: "Prefer const/let over var.",
    fix: "Use `const` (or `let` if reassigned) instead of `var` to scope it to the block.",
    // A real declaration: `var name =` or `var name;` — not the word "var" in prose.
    re: /\bvar\s+[\w$]+\s*[=;]/,
  },
];

const BY_PREDICATE = new Map(MISTAKE_SIGNATURES.map((s) => [s.predicate, s]));

/** The signature for a predicate, if it's a known mistake class. */
export function mistakeSignature(predicate: string | undefined): MistakeSignature | undefined {
  return predicate ? BY_PREDICATE.get(predicate) : undefined;
}

/**
 * Whether a signature genuinely fires in the code: its pattern matches AND its
 * guard (if any) is absent. This is the single truth for "is this mistake really
 * here", shared by detection and the review guard.
 */
export function signatureFires(sig: MistakeSignature, code: string): boolean {
  return sig.re.test(code) && !(sig.absent && sig.absent.test(code));
}

/** Every signature that fires in the given code, with the exact matched span. */
export function detectMistakes(code: string): Array<{ signature: MistakeSignature; evidence: string }> {
  const out: Array<{ signature: MistakeSignature; evidence: string }> = [];
  for (const s of MISTAKE_SIGNATURES) {
    if (!signatureFires(s, code)) continue;
    out.push({ signature: s, evidence: s.re.exec(code)![0] });
  }
  return out;
}
