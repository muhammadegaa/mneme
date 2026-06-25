/**
 * Context packing as 0/1 knapsack.
 *
 * Given scored memory candidates and a fixed token budget, select the subset
 * that maximizes total ranking value without exceeding the budget. This is
 * strictly better than greedy top-k: a high-value 400-token memory may be worth
 * dropping in favor of three 120-token memories that sum to more value.
 *
 * Exact DP over the (integer) token budget: O(n * budget). Deterministic, so
 * the packing decision is unit-testable and explainable in the Inspector.
 */

import type { ScoredMemory, PackResult } from "./types.js";

export function packMemories(
  candidates: ScoredMemory[],
  budget: number,
): PackResult {
  const n = candidates.length;
  const B = Math.max(0, Math.floor(budget));

  // dp[w] = best achievable value using a token budget of exactly <= w.
  // keep[i][w] = whether item i was taken at capacity w (for reconstruction).
  const dp = new Array<number>(B + 1).fill(0);
  const keep: boolean[][] = Array.from({ length: n }, () => new Array<boolean>(B + 1).fill(false));

  for (let i = 0; i < n; i++) {
    const cost = candidates[i]!.tokens;
    const value = Math.max(0, candidates[i]!.score);
    // iterate capacity descending for 0/1 (each item used once)
    for (let w = B; w >= 0; w--) {
      if (cost <= w) {
        const take = dp[w - cost]! + value;
        if (take > dp[w]!) {
          dp[w] = take;
          keep[i]![w] = true;
        }
      }
    }
  }

  // Reconstruct chosen set walking items backward.
  const chosen = new Set<number>();
  let w = B;
  for (let i = n - 1; i >= 0; i--) {
    if (keep[i]![w]) {
      chosen.add(i);
      w -= candidates[i]!.tokens;
    }
  }

  const packed: ScoredMemory[] = [];
  const dropped: Array<ScoredMemory & { reason: string }> = [];
  let usedTokens = 0;

  for (let i = 0; i < n; i++) {
    const c = candidates[i]!;
    if (chosen.has(i)) {
      packed.push(c);
      usedTokens += c.tokens;
    } else {
      const reason =
        c.tokens > B
          ? "too_large_for_budget"
          : c.score <= 0
            ? "zero_or_negative_value"
            : "displaced_by_higher_value_set";
      dropped.push({ ...c, reason });
    }
  }

  // Preserve score order within each bucket for stable, readable output.
  packed.sort((a, b) => b.score - a.score);
  dropped.sort((a, b) => b.score - a.score);

  return { packed, dropped, usedTokens, budget: B };
}
