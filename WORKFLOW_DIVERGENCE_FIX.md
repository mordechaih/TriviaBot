# Workflow Divergence Fix

## The Problem

When the GitHub Actions workflow generates a game, it commits and pushes. If you have local commits that haven't been pushed, this creates divergence:

```
Local:  [A] -> [B] -> [C] (your commits)
Remote: [A] -> [D] (workflow commit)
```

## The Solution

### Updated Workflow Strategy

The workflow now uses `git reset --hard origin/main` before committing. This ensures:

1. **Workflow always starts from latest remote** - No divergence possible
2. **Workflow commits are always on top** - Clean linear history
3. **Your local commits are preserved** - They just need to be rebased

### Why This Works

- The workflow **resets to origin/main** before making changes
- This means it always works from the absolute latest remote state
- Your local commits remain intact, you just need to rebase them on top

### What You Need to Do

**Before pushing your local changes:**
```bash
# Always pull with rebase first
git pull --rebase origin main
git push origin main
```

**If you get divergence:**
```bash
# Rebase your commits on top of remote
git pull --rebase origin main
git push origin main
```

## Best Practice

**Always pull before pushing:**
```bash
git pull --rebase origin main && git push origin main
```

Or use the alias:
```bash
git safe-push  # If you set up the alias
```

## Why This is Better

### Old Approach (Pull + Rebase)
- Could still diverge if timing is bad
- More complex error handling needed
- Could create merge commits

### New Approach (Reset to Origin)
- **Guaranteed** no divergence from workflow side
- Workflow always works from latest
- Simpler and more reliable
- Your local commits just need rebasing (which you should do anyway)

## Important Notes

1. **The workflow will overwrite any local game files** - This is intentional, the workflow is the source of truth for games
2. **Your code changes are safe** - They're in different files, so no conflicts
3. **Always pull before pushing** - This prevents you from creating divergence

## Summary

- ✅ Workflow now resets to origin/main (no divergence possible)
- ✅ You should always pull before pushing
- ✅ Use `git pull --rebase origin main` to keep history clean
- ✅ Your commits are preserved, just rebase them on top

