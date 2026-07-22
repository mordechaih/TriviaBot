#!/usr/bin/env python3
"""
Faster J! Archive downloader: parallel requests + gzip + connection reuse.
Writes to <parser_dir>/j-archive/<game_id>.html so the parser can use the same paths.

Usage (from project root):
  data/jeopardy-parser/.venv/bin/python scripts/download-archive-parallel.py -d data/jeopardy-parser
  # or from populate-archive.sh we invoke with -d "$PARSER_DIR"

Options:
  -d, --dir   Parser directory (default: cwd). j-archive/ will be created inside it.
  -w, --workers  Concurrent requests (default: 3). Keep low to avoid rate limits or blocks.
  --delay   Seconds to wait between starting each request (default: 1.5). Higher = gentler on j-archive.com.
"""
import argparse
import gzip
import os
import ssl
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import Request, urlopen
from urllib.error import HTTPError

try:
    import certifi
except ImportError:
    certifi = None

ERROR_MSG = b"ERROR: No game"
BASE_URL = "https://j-archive.com/showgame.php?game_id=%s"
# Conservative defaults to avoid rate limiting or IP blocks; increase -w/--delay only if the site is clearly fine with it
DEFAULT_DELAY = 1.5
DEFAULT_WORKERS = 3
REQUEST_TIMEOUT = 15  # shorter so we don't hang; 30s was still blocking on some systems


def _ssl_context():
    if certifi is not None:
        return ssl.create_default_context(cafile=certifi.where())
    return ssl.create_default_context()


SSL_CONTEXT = _ssl_context()


def _fetch_one(game_id, timeout=REQUEST_TIMEOUT):
    """Fetch one game page; return (raw_bytes or None, 'ok'|'end'|'error', error_msg or None). Decompresses gzip."""
    url = BASE_URL % game_id
    req = Request(url, headers={"Accept-Encoding": "gzip"})
    try:
        with urlopen(req, timeout=timeout, context=SSL_CONTEXT) as resp:
            if resp.status != 200:
                return None, "error", "HTTP %s" % resp.status
            raw = resp.read()
    except HTTPError as e:
        if e.code == 404:
            return None, "end", None
        return None, "error", "HTTP %s" % e.code
    except Exception as e:
        return None, "error", "%s: %s" % (type(e).__name__, str(e)[:80])
    # Decompress before checking content (j-archive often sends gzip; "ERROR: No game" is only in decompressed body)
    if len(raw) >= 3 and raw[:3] == b"\x1f\x8b\x08":
        try:
            raw = gzip.decompress(raw)
        except Exception:
            pass
    if ERROR_MSG in raw:
        return raw, "end", None
    return raw, "ok", None


def download_one(game_id, archive_dir, delay_between_requests, log_lock=None):
    path = os.path.join(archive_dir, "%s.html" % game_id)
    if os.path.exists(path):
        return game_id, "skip", None
    if delay_between_requests > 0:
        time.sleep(delay_between_requests)
    if log_lock:
        with log_lock:
            print("Requesting game_id %s ..." % game_id, flush=True)
    raw, status, err_msg = _fetch_one(game_id)
    if log_lock:
        with log_lock:
            if status == "error" and err_msg:
                print("  game_id %s -> error: %s" % (game_id, err_msg), flush=True)
            else:
                print("  game_id %s -> %s" % (game_id, status), flush=True)
    if status == "end":
        return game_id, "end", None
    if status == "error" or raw is None:
        return game_id, "error", None
    try:
        with open(path, "wb") as f:
            f.write(raw)
    except OSError:
        return game_id, "error", None
    return game_id, "ok", None


def main():
    ap = argparse.ArgumentParser(description="Parallel J! Archive game downloader")
    ap.add_argument("-d", "--dir", default=os.getcwd(), help="Parser directory (j-archive/ created here)")
    ap.add_argument("-w", "--workers", type=int, default=DEFAULT_WORKERS, help="Concurrent downloads (default %s)" % DEFAULT_WORKERS)
    ap.add_argument("--delay", type=float, default=DEFAULT_DELAY, help="Delay between starting requests in sec (default %s)" % DEFAULT_DELAY)
    args = ap.parse_args()
    archive_dir = os.path.join(os.path.abspath(args.dir), "j-archive")
    os.makedirs(archive_dir, exist_ok=True)
    workers = max(1, min(args.workers, 12))
    delay = max(0.0, args.delay)
    next_id = [1]  # mutable so worker can advance
    lock = threading.Lock()
    log_lock = threading.Lock()
    end_seen = [False]  # mutable
    last_printed = [0]

    # Startup probe: find highest existing game id and probe the next one so we don't hang if already at end
    existing = []
    for name in os.listdir(archive_dir):
        if name.endswith(".html") and name[:-5].isdigit():
            existing.append(int(name[:-5]))
    max_existing = max(existing) if existing else 0
    probe_id = max_existing + 1
    print("Probing game_id %s (max existing %s) ..." % (probe_id, max_existing), flush=True)
    raw_probe, probe_status, _ = _fetch_one(probe_id)
    if probe_status == "end":
        print("Already have all games (through %s). Nothing to download." % max_existing, flush=True)
        try:
            import subprocess
            if sys.platform == "darwin":
                subprocess.run(
                    ["osascript", "-e", 'display notification "J! Archive: already complete (through game %s)." with title "TriviaBot"' % max_existing],
                    check=False, capture_output=True, timeout=2
                )
        except Exception:
            pass
        return
    if probe_status == "ok" and raw_probe and ERROR_MSG not in raw_probe:
        try:
            path = os.path.join(archive_dir, "%s.html" % probe_id)
            with open(path, "wb") as f:
                f.write(raw_probe)
            next_id[0] = probe_id + 1
        except OSError:
            next_id[0] = probe_id
    else:
        next_id[0] = probe_id

    print("Downloading to %s (workers=%s, delay=%.2fs, timeout=%ss)" % (archive_dir, workers, delay, REQUEST_TIMEOUT))

    def next_game_id():
        with lock:
            if end_seen[0]:
                return None
            n = next_id[0]
            next_id[0] += 1
            return n

    def worker(_):
        while True:
            gid = next_game_id()
            if gid is None:
                return
            _, status, _ = download_one(gid, archive_dir, delay, log_lock)
            if status == "end":
                with lock:
                    end_seen[0] = True
                print("Got end at game_id %s" % gid, flush=True)
                return
            # progress
            with lock:
                if status == "ok" and gid - last_printed[0] >= 50:
                    print("Downloaded through game %s" % gid, flush=True)
                    last_printed[0] = gid

    print("Starting workers ...")
    with ThreadPoolExecutor(max_workers=workers) as ex:
        list(ex.map(worker, range(workers)))
    print("Finished downloading. Now parse.")
    # Try to show a system notification so you know when it's done
    try:
        import subprocess
        if sys.platform == "darwin":
            subprocess.run(
                ["osascript", "-e", 'display notification "J! Archive download finished. Run parser or npm run populate-archive." with title "TriviaBot"'],
                check=False, capture_output=True, timeout=2
            )
        elif sys.platform == "linux":
            subprocess.run(
                ["notify-send", "TriviaBot", "J! Archive download finished. Run parser or npm run populate-archive."],
                check=False, capture_output=True, timeout=2
            )
    except Exception:
        pass


if __name__ == "__main__":
    main()
