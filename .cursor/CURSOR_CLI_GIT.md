# Cursor CLI + Git: "Resource deadlock avoided"

## What's going on

When Cursor CLI runs `git commit` or `git pull` in this repo, git can fail with:

- `cannot open '.git/COMMIT_EDITMSG': Resource deadlock avoided`
- `unable to append to '.git/logs/refs/heads/main': Resource deadlock avoided`

**Cause:** This repo lives under **Documents**, which macOS often keeps in **iCloud Drive**. macOS can mark files as **dataless** (content offloaded). When the Cursor CLI runs git in its own process, access to those dataless `.git` files (reflog, etc.) can trigger macOS "Resource deadlock avoided" (EDEADLK).

So the problem is **location + dataless files**, not Cursor's sandbox.

## Fixes (pick one)

### 1. Move the repo out of iCloud Documents (recommended)

Clone or move the repo to a directory that is **not** in iCloud, e.g.:

- `~/Developer/triviabot`
- `~/Code/triviabot`

Then open that path in Cursor CLI. Git should work there without this error.

```bash
# Example: clone fresh into ~/Developer
mkdir -p ~/Developer
git clone <your-triviabot-repo-url> ~/Developer/triviabot
cd ~/Developer/triviabot
# Then use this path with Cursor CLI
```

### 2. Keep repo in Documents and "pin" it

Force the folder (and its `.git` contents) to be fully on disk so they're not dataless:

1. In **Finder**, go to your **Documents** folder and find **TriviaBot** (or **triviabot**).
2. **Right‑click** the folder → **Download Now** (or **Always Keep on This Mac** if you see it).
3. Wait until the cloud icon is gone and the folder is fully local.
4. Try `git commit` / `git pull` again from Cursor CLI.

If the error persists, use **Option 1** (move the repo out of Documents).

## Already configured

- **Permissions:** `Shell(git)` is in `~/.cursor/cli-config.json` so the agent can run any git command.
- **Sandbox:** This project has `.cursor/sandbox.json` with `"type": "insecure_none"` so the agent can write to `.git` when the repo is on a normal (non-dataless) volume.
