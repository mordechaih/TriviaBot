# Patched iamsix/jeopardy-parser parser with checkpoint (memory) support.
# Use this in place of the upstream parser.py so you can:
# - Stop after ~2000 games, copy clues.db and run db-to-archive to work with partial data.
# - Run again later; the parser will skip the first N games (from .parser_checkpoint) and append.
#
# Checkpoint file: .parser_checkpoint in the same directory as clues.db (one integer per line = number of games already parsed).
# Override with --skip N or --no-checkpoint to ignore the checkpoint.

from glob import glob
import argparse
import re
import os
import sys
import sqlite3
from bs4 import BeautifulSoup

CHECKPOINT_FILENAME = ".parser_checkpoint"


def get_checkpoint_path(args):
    """Path to the checkpoint file (next to the database)."""
    db_dir = os.path.dirname(os.path.abspath(args.database))
    return os.path.join(db_dir, CHECKPOINT_FILENAME) if db_dir else CHECKPOINT_FILENAME


def read_checkpoint(args):
    """Read skip count from checkpoint file if present and not disabled.
    If no checkpoint file exists but the database exists and has airdates,
    use the max game id as skip so we don't re-parse (e.g. after switching from upstream parser).
    """
    if getattr(args, "no_checkpoint", False):
        return 0
    path = get_checkpoint_path(args)
    if os.path.isfile(path):
        try:
            with open(path, "r") as f:
                line = f.readline().strip()
                return max(0, int(line)) if line else 0
        except (ValueError, OSError):
            pass
    # No checkpoint file: if DB exists and has airdates, use max game id so we append
    if not getattr(args, "stdout", False) and os.path.isfile(args.database):
        try:
            conn = sqlite3.connect(args.database)
            row = conn.execute("SELECT MAX(game) FROM airdates").fetchone()
            conn.close()
            if row and row[0] is not None:
                return max(0, int(row[0]))
        except (sqlite3.Error, OSError):
            pass
    return 0


def write_checkpoint(args, count):
    """Write number of games parsed so far to checkpoint file."""
    if getattr(args, "no_checkpoint", False):
        return
    path = get_checkpoint_path(args)
    db_dir = os.path.dirname(path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    try:
        with open(path, "w") as f:
            f.write("%d\n" % count)
    except OSError:
        pass


def main(args):
    """Loop thru all the games and parse them."""
    if not os.path.isdir(args.dir):
        print("The specified folder is not a directory.")
        sys.exit(1)

    files = sorted(glob(os.path.join(args.dir, "*.html")))
    total_files = len(files)
    if args.num_of_files:
        total_files = min(total_files, args.num_of_files)

    skip = getattr(args, "skip", None)
    if skip is None:
        skip = read_checkpoint(args)
    else:
        skip = max(0, skip)

    if skip > 0:
        print("Resuming: skipping first %d games (from checkpoint or --skip)." % skip)
    to_parse = total_files - skip
    print("Parsing %d files (games %d through %d)." % (to_parse, skip + 1, total_files))

    sql = None
    if not args.stdout:
        db_exists = os.path.isfile(args.database)
        sql = sqlite3.connect(args.database)
        sql.execute("PRAGMA foreign_keys = ON;")
        if db_exists:
            sql.execute("""CREATE TABLE IF NOT EXISTS airdates(
                game INTEGER PRIMARY KEY,
                airdate TEXT
            );""")
            sql.execute("""CREATE TABLE IF NOT EXISTS documents(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                clue TEXT,
                answer TEXT,
                links TEXT DEFAULT ''
            );""")
            sql.execute("""CREATE TABLE IF NOT EXISTS categories(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT UNIQUE
            );""")
            sql.execute("""CREATE TABLE IF NOT EXISTS clues(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game INTEGER,
                round INTEGER,
                value INTEGER,
                FOREIGN KEY(id) REFERENCES documents(id),
                FOREIGN KEY(game) REFERENCES airdates(game)
            );""")
            sql.execute("""CREATE TABLE IF NOT EXISTS classifications(
                clue_id INTEGER,
                category_id INTEGER,
                FOREIGN KEY(clue_id) REFERENCES clues(id),
                FOREIGN KEY(category_id) REFERENCES categories(id)
            );""")
        else:
            sql.execute("""CREATE TABLE airdates(
                game INTEGER PRIMARY KEY,
                airdate TEXT
            );""")
            sql.execute("""CREATE TABLE documents(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                clue TEXT,
                answer TEXT,
                links TEXT DEFAULT ''
            );""")
            sql.execute("""CREATE TABLE categories(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT UNIQUE
            );""")
            sql.execute("""CREATE TABLE clues(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game INTEGER,
                round INTEGER,
                value INTEGER,
                FOREIGN KEY(id) REFERENCES documents(id),
                FOREIGN KEY(game) REFERENCES airdates(game)
            );""")
            sql.execute("""CREATE TABLE classifications(
                clue_id INTEGER,
                category_id INTEGER,
                FOREIGN KEY(clue_id) REFERENCES clues(id),
                FOREIGN KEY(category_id) REFERENCES categories(id)
            );""")

    parsed_count = skip
    for i, file_name in enumerate(files):
        gid = i + 1
        if gid > total_files:
            break
        if gid <= skip:
            continue
        with open(os.path.abspath(file_name), "rb") as f:
            parse_game(f.read().decode("UTF-8", errors="replace"), sql, gid)
        parsed_count = gid
        write_checkpoint(args, parsed_count)

    if not args.stdout:
        sql.commit()
    print("All done (parsed through game %d)." % parsed_count)


def parse_game(f, sql, gid):
    """Parses an entire Jeopardy! game and extract individual clues."""
    bsoup = BeautifulSoup(f, "lxml")
    airdate = bsoup.title.get_text().split()[-1]
    if not parse_round(bsoup, sql, 1, gid, airdate) or not parse_round(bsoup, sql, 2, gid, airdate):
        pass
    r = bsoup.find("table", class_="final_round")
    if not r:
        return
    category = r.find("td", class_="category_name").get_text()
    text = r.find("td", class_="clue_text").get_text()
    answer = BeautifulSoup(
        r.find("div", onmouseover=True).get("onmouseover"), "lxml"
    )
    oldanswer = answer.find("em")
    if oldanswer:
        answer = oldanswer.get_text()
    else:
        answer = r.find("td", class_="clue_text", style="display:none;")
        answer = answer.find("em", class_="correct_response")
        answer = answer.get_text()
    insert(sql, [gid, airdate, 3, category, False, text, answer, ""])


def parse_round(bsoup, sql, rnd, gid, airdate):
    """Parses and inserts the list of clues from a whole round."""
    round_id = "jeopardy_round" if rnd == 1 else "double_jeopardy_round"
    r = bsoup.find(id=round_id)
    if not r:
        return False
    categories = [c.get_text() for c in r.find_all("td", class_="category_name")]
    x = 0
    for a in r.find_all("td", class_="clue"):
        if not a.get_text().strip():
            x = 0 if x == 5 else x + 1
            continue
        value = a.find("td", class_=re.compile("clue_value")).get_text().lstrip("D: $")
        clue = a.find("td", class_="clue_text")
        lst = clue.find_all("a")
        links = []
        for lnk in lst:
            try:
                links.append(lnk["href"])
            except Exception:
                pass
        links = " | ".join(links)
        text = clue.get_text()
        answer = BeautifulSoup(
            a.find("div", onmouseover=True).get("onmouseover"), "lxml"
        )
        oldanswer = answer.find("em", class_="correct_response")
        if oldanswer:
            answer = oldanswer.get_text()
        else:
            answer = a.find("td", class_="clue_text", style="display:none;")
            answer = answer.find("em", class_="correct_response")
            answer = answer.get_text()
        insert(sql, [gid, airdate, rnd, categories[x], value, text, answer, links])
        x = 0 if x == 5 else x + 1
    return True


def insert(sql, clue):
    """Inserts the given clue into the database."""
    if clue[6] == "=":
        return
    if "\\'" in clue[6]:
        clue[6] = clue[6].replace("\\'", "'")
    if '\\"' in clue[6]:
        clue[6] = clue[6].replace('\\"', '"')
    if not sql:
        print(clue)
        return
    sql.execute("INSERT OR IGNORE INTO airdates VALUES(?, ?);", (clue[0], clue[1]))
    sql.execute("INSERT OR IGNORE INTO categories(category) VALUES(?);", (clue[3],))
    category_id = sql.execute(
        "SELECT id FROM categories WHERE category = ?;", (clue[3],)
    ).fetchone()[0]
    clue_id = sql.execute(
        "INSERT INTO documents(clue, answer, links) VALUES(?, ?, ?);",
        (clue[5], clue[6], clue[7]),
    ).lastrowid
    sql.execute("INSERT INTO clues(game, round, value) VALUES(?, ?, ?);", (clue[0], clue[2], clue[4]))
    sql.execute("INSERT INTO classifications VALUES(?, ?)", (clue_id, category_id))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Parse games from the J! Archive website.",
        add_help=False,
        usage="%(prog)s [options]",
    )
    parser.add_argument(
        "-d",
        "--dir",
        dest="dir",
        metavar="<folder>",
        help="the directory containing the game files",
        default="j-archive",
    )
    parser.add_argument(
        "-n",
        "--number-of-files",
        dest="num_of_files",
        metavar="<number>",
        help="the number of files to parse",
        type=int,
    )
    parser.add_argument(
        "-f",
        "--filename",
        dest="database",
        metavar="<filename>",
        help="the filename for the SQLite database",
        default="clues.db",
    )
    parser.add_argument(
        "-s",
        "--skip",
        dest="skip",
        metavar="<number>",
        help="skip the first N game files (default: use .parser_checkpoint if present)",
        type=int,
        default=None,
    )
    parser.add_argument(
        "--no-checkpoint",
        dest="no_checkpoint",
        action="store_true",
        help="ignore checkpoint file and parse from the beginning (creates new DB if -f exists, use with care)",
    )
    parser.add_argument(
        "--stdout",
        help="output the clues to stdout and not a database",
        action="store_true",
    )
    parser.add_argument("--help", action="help", help="show this help message and exit")
    parser.add_argument("--version", action="version", version="2025.03.02+checkpoint")
    main(parser.parse_args())
