#!/usr/bin/env bash
set -e

# Resolve project root (script dir -> parent)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Persistent parser dir so download can resume (parser skips existing files)
PARSER_DIR="$PROJECT_ROOT/data/jeopardy-parser"

# Detect Python: try python3 then python
PYTHON=""
if command -v python3 &>/dev/null; then
  PYTHON="python3"
elif command -v python &>/dev/null; then
  PYTHON="python"
fi
if [[ -z "$PYTHON" ]]; then
  echo "Error: Python 3 and pip are required. Install from python.org." >&2
  exit 1
fi

# Ensure data dir exists
mkdir -p data

# Warn before overwriting archive-backup.json
if [[ -f data/archive-backup.json ]]; then
  echo "Warning: data/archive-backup.json exists and will be overwritten." >&2
fi

# Clone parser only if not present (enables resume on re-run)
if [[ ! -d "$PARSER_DIR/.git" ]]; then
  echo "Cloning iamsix/jeopardy-parser into data/jeopardy-parser..."
  rm -rf "$PARSER_DIR"
  git clone --depth 1 https://github.com/iamsix/jeopardy-parser.git "$PARSER_DIR"
else
  echo "Using existing parser at data/jeopardy-parser (download will resume skipping existing files)."
fi
cd "$PARSER_DIR"

# Create venv only if not present
if [[ ! -f .venv/bin/python ]]; then
  echo "Creating Python virtual environment..."
  if ! $PYTHON -m venv .venv; then
    echo "Error: Failed to create virtual environment." >&2
    exit 1
  fi
  echo "Installing Python requirements..."
  if ! .venv/bin/python -m pip install -r requirements.txt; then
    echo "Error: pip install failed. Check lxml/BeautifulSoup dependencies." >&2
    exit 1
  fi
fi
VENV_PYTHON="$PARSER_DIR/.venv/bin/python"

# Run parallel download (skips existing j-archive/*.html), then parser
echo "Running parallel download (resumes from last file)..."
"$VENV_PYTHON" "$PROJECT_ROOT/scripts/download-archive-parallel.py" -d "$PARSER_DIR"

# Use our patched parser with checkpoint memory so you can stop after ~2000 games,
# copy clues.db and run db-to-archive, then resume later (it skips already-parsed games).
echo "Running parser (with checkpoint; use --no-checkpoint to parse from start)..."
"$VENV_PYTHON" "$PROJECT_ROOT/scripts/parser-with-memory.py" -d j-archive -f clues.db

# Copy clues.db to project data dir
if [[ ! -f clues.db ]]; then
  echo "Error: clues.db was not created by parser.py." >&2
  exit 1
fi
cp clues.db "$PROJECT_ROOT/data/clues.db"
echo "Copied clues.db to data/clues.db"

# Run db-to-archive at project root
cd "$PROJECT_ROOT"
npm run db-to-archive
