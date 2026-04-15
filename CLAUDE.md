# Claude instructions for the ZxAI site repo

## Path rules

**This (`~/zxai-site`) is the live, deployed ZxAI site.** All site work happens here. Pushing to `main` triggers the Cloudflare deploy. `publish.sh` is the standard commit + push + sitemap-ping flow.

**Never use `~/ZxAI`.** That directory is a scratch/local build with no git history and is NOT deployed. Do not edit it, do not reference it, do not copy from it.

**Be careful with worktrees under `~/Claude ZxAI/.claude/worktrees/*`.** They may be based on stale snapshots and drift from this repo. Before editing any shared file in a worktree, diff against `~/zxai-site` or confirm with Anthony.

## Style

- **No em dashes.** Hard ban in all ZxAI output.
