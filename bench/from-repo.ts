/**
 * from-repo — turn a REAL repo's git history into the history.json that
 * `engram learn` ingests. Zero credits: this only shells out to `git`. It exists
 * so the benchmark can run against a repo Engram has never seen (not the planted
 * demo history), which is the honest test of "does it catch real repeat mistakes".
 *
 *   tsx bench/from-repo.ts <repoPath> <maxCommits> > bench/data/real.json
 *
 * Each record matches CommitSource: { sha, daysAgo, message, diff }. We skip
 * merges and cap per-commit diff size so extraction cost stays bounded.
 */
import { execFileSync } from "node:child_process";

const MAX_DIFF_CHARS = 4000; // bound extraction token cost per commit
const DAY = 86_400_000;

export interface RepoCommit {
  sha: string;
  daysAgo: number;
  message: string;
  diff: string;
}

export function commitsFromRepo(repo: string, max = 30, now = Date.now()): RepoCommit[] {
  const git = (args: string[]) =>
    execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const log = git(["log", "--no-merges", `-n${max}`, "--pretty=%H%x09%ct%x09%s"]).trim().split("\n");
  return log.map((line) => {
    const [sha, ct, ...rest] = line.split("\t");
    const message = rest.join("\t");
    let diff = git(["show", sha!, "--no-color", "--unified=1", "--format="]).trim();
    if (diff.length > MAX_DIFF_CHARS) diff = diff.slice(0, MAX_DIFF_CHARS) + "\n… (truncated)";
    const daysAgo = Math.max(0, Math.round((now - Number(ct) * 1000) / DAY));
    return { sha: sha!.slice(0, 8), daysAgo, message, diff };
  });
}

// CLI: emit history.json to stdout.
const isMain = process.argv[1]?.endsWith("from-repo.ts");
if (isMain) {
  const repo = process.argv[2];
  const max = Number(process.argv[3] ?? 30);
  if (!repo) {
    console.error("usage: tsx bench/from-repo.ts <repoPath> [maxCommits]");
    process.exit(1);
  }
  const commits = commitsFromRepo(repo, max);
  process.stdout.write(JSON.stringify(commits, null, 1) + "\n");
  console.error(`→ ${commits.length} commits from ${repo} (oldest ${commits.at(-1)?.daysAgo}d, newest ${commits[0]?.daysAgo}d)`);
}
