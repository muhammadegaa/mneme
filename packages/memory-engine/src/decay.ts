/**
 * Forgetting: time-based decay + contradiction resolution. Pure functions.
 *
 * Two distinct mechanisms, deliberately separated:
 *  - DECAY: a memory's effective salience falls below a floor -> it ages out
 *    (status `forgotten`). Gradual, time-driven, reversible by reinforcement.
 *  - CONTRADICTION: a newer memory fills the same (subject, predicate) slot ->
 *    the older one is `superseded`. Sharp, event-driven, audit-trailed.
 *
 * Most teams ship retrieval and stop. Forgetting is the differentiator, so it
 * is a first-class, observable component with its own pure, tested logic.
 */

import type { Memory, MemoryInput } from "./types.js";
import { effectiveSalience } from "./scoring.js";

/** True if the memory has decayed below the retention floor at time `now`. */
export function isForgotten(memory: Memory, now: number, floor: number): boolean {
  if (memory.status !== "active") return false;
  return effectiveSalience(memory.salience, memory.decayRate, now - memory.createdAt) < floor;
}

export interface DecayPlan {
  forget: string[]; // memory ids to mark `forgotten`
}

/** Compute which active memories should be forgotten. Does not mutate. */
export function planDecay(memories: Memory[], now: number, floor: number): DecayPlan {
  const forget: string[] = [];
  for (const m of memories) {
    if (isForgotten(m, now, floor)) forget.push(m.id);
  }
  return { forget };
}

/** Two memories occupy the same slot iff same subject and same (defined) predicate. */
export function sameSlot(a: { subject: string; predicate?: string }, b: { subject: string; predicate?: string }): boolean {
  if (!a.predicate || !b.predicate) return false;
  return a.subject === b.subject && a.predicate === b.predicate;
}

/**
 * Given existing memories and an incoming one, decide which existing *active*
 * memories the incoming supersedes. Newer fact wins its slot; the loser is kept
 * (status `superseded`, `supersededBy` set) so the audit trail survives.
 *
 * Only memories whose text actually differs are superseded — an identical
 * restatement is a dedup case, handled separately on the write path.
 */
export function planContradictionResolution(
  existing: Memory[],
  incoming: MemoryInput,
): { supersede: string[] } {
  const supersede: string[] = [];
  for (const m of existing) {
    if (m.status !== "active") continue;
    if (sameSlot(m, incoming) && m.text.trim() !== incoming.text.trim()) {
      supersede.push(m.id);
    }
  }
  return { supersede };
}
