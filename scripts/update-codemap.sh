#!/usr/bin/env bash
# Post-commit hook: reviews Mermaid diagrams against the latest commit
# and updates them if the commit affects documented architecture.
# Runs in the background — does not block the terminal.

# Skip if called from within the codemap update itself
[ "$SKIP_CODEMAP_UPDATE" = "1" ] && exit 0

# Skip if the latest commit is already a codemap update
LAST_MSG=$(git log -1 --pretty=%s)
[[ "$LAST_MSG" == "[codemap]"* ]] && exit 0

REPO_ROOT=$(git rev-parse --show-toplevel)
DIFF=$(git diff HEAD~1 HEAD 2>/dev/null || git show HEAD)

PROMPT="You are reviewing a git commit to the TriviaBot project.

Here is the diff from the latest commit:
\`\`\`
$DIFF
\`\`\`

Your job:
1. Find all Markdown files in this repo that contain \`\`\`mermaid blocks (search with grep or glob).
2. For each diagram, assess whether this commit changes anything that makes the diagram inaccurate — e.g., new files added, data flows changed, components renamed, new API routes or scripts, removed features.
3. If any diagram needs updating, edit the file(s) with the corrected diagram(s).
4. If you made any edits, commit them: SKIP_CODEMAP_UPDATE=1 git add -A && SKIP_CODEMAP_UPDATE=1 git commit -m '[codemap] Update diagrams'
5. If nothing needed updating, exit without making any commits or file changes.

Be conservative: only update diagrams when the commit clearly affects documented architecture. Skip trivial changes (typos, CSS tweaks, data file updates, test fixtures)."

LOG="$REPO_ROOT/.git/codemap-update.log"

nohup claude -p "$PROMPT" \
  --model claude-sonnet-4-6 \
  --dangerously-skip-permissions \
  > "$LOG" 2>&1 &

echo "[codemap] Diagram update running in background (log: .git/codemap-update.log)"
