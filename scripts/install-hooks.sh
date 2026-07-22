#!/usr/bin/env bash
# Installs git hooks for this repo. Run once after cloning.

REPO_ROOT=$(git rev-parse --show-toplevel)
HOOK="$REPO_ROOT/.git/hooks/post-commit"

cat > "$HOOK" << 'EOF'
#!/usr/bin/env bash
REPO_ROOT=$(git rev-parse --show-toplevel)
"$REPO_ROOT/scripts/update-codemap.sh"
EOF

chmod +x "$HOOK"
chmod +x "$REPO_ROOT/scripts/update-codemap.sh"
chmod +x "$REPO_ROOT/scripts/install-hooks.sh"

echo "Installed post-commit hook -> $HOOK"
