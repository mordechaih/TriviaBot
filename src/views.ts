import { authEnabled } from "./auth.ts";
import type { StockLine } from "./bank.ts";
import { DIFFICULTY_LABELS, FORMAT_LABELS, TOPICS, type Format, type Question } from "./db.ts";
import type { Game, GameRound, GameSummary } from "./games.ts";
import { Html, html } from "./html.ts";
import { icon } from "./icons.ts";
import type { RoundDef } from "./rounds.ts";

const shortDate = (sqlDate: string) =>
  new Date(`${sqlDate.replace(" ", "T")}Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** Index-card stock per round: two rounds share a colour, the Final gets its own. */
const STOCK: Record<number, string> = { 1: "ochre", 2: "ochre", 3: "sage", 4: "sage", 5: "slate", 6: "slate", 7: "rose", 8: "rust", 9: "brick" };
const tabLabel = (n: number) => (n === 9 ? "F" : String(n));
const roundName = (n: number) => (n === 9 ? "Final" : `Round ${n}`);

function layout(title: string, body: Html, opts: { flash?: string | null; page: string }): Html {
  return html`<html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <meta name="theme-color" content="#131416" />
      <title>${title}</title>
      <link rel="preload" href="/fonts/atkinson-hyperlegible-next-latin.woff2" as="font" type="font/woff2" crossorigin />
      <link rel="stylesheet" href="/styles.css" />
      <script>document.documentElement.classList.add("js")</script>
      <script src="/app.js" defer></script>
    </head>
    <body class="page-${opts.page}">
      ${opts.flash ? html`<p class="flash" role="alert">${opts.flash}</p>` : ""}
      ${body}
    </body>
  </html>`;
}

// ── Games list ──────────────────────────────────────────────────────────

export function homePage(games: GameSummary[], stock: StockLine[], pending: number, error: string | null): Html {
  const short = stock.filter((s) => s.available < s.perGame);
  return layout(
    "TriviaBot",
    html`<main class="sheet">
      <header class="topbar">
        <h1 class="wordmark">TriviaBot</h1>
        <a class="button quiet" href="/review">${icon("inbox")} Review${pending ? html`<span class="count">${pending}</span>` : ""}</a>
      </header>

      <form method="post" action="/games" class="new-game">
        <button class="button primary wide" ${short.length ? "disabled" : ""}>${icon("plus")} New game</button>
        ${short.length
          ? html`<p class="hint">Not enough approved questions for a full game. The question bank below shows what's short.</p>`
          : ""}
      </form>

      <section aria-labelledby="games-h">
        <h2 id="games-h">Games</h2>
        ${games.length
          ? html`<ul class="game-list">
              ${games.map(
                (g) => html`<li>
                  <a href="/games/${g.id}">
                    <span class="game-name">Game ${g.id}</span>
                    <span class="muted">${shortDate(g.created_at)}</span>
                    ${g.played_at ? html`<span class="status">${icon("check")} Played</span>` : html`<span class="status fresh">Not played</span>`}
                  </a>
                </li>`,
              )}
            </ul>`
          : html`<p class="empty-line">No games yet. Generate one when the bank has enough approved questions.</p>`}
      </section>

      <section aria-labelledby="bank-h">
        <h2 id="bank-h">Question bank</h2>
        <p class="muted">Approved questions not yet used in a game, next to how many one game needs. Themed rounds count themes with at least three questions left. Rotating rounds use one of their formats each week.</p>
        <table class="stock">
          <thead><tr><th scope="col">Slot</th><th scope="col" class="num">Ready</th><th scope="col" class="num">Per game</th></tr></thead>
          <tbody>
            ${stock.map(
              (s) => html`<tr class="${s.available < s.perGame ? "low" : ""}">
                <td>${s.label}${s.rotating ? html` <span class="muted">· rotates</span>` : ""}</td>
                <td class="num">${s.available}</td>
                <td class="num muted">${s.perGame}</td>
              </tr>`,
            )}
          </tbody>
        </table>
      </section>
    </main>`,
    { flash: error, page: "home" },
  );
}

// ── Live host view ──────────────────────────────────────────────────────

export function gamePage(game: Game, error: string | null): Html {
  return layout(
    `Game ${game.id}`,
    html`<div class="host" data-game="${game.id}">
      <header class="topbar">
        <a class="button quiet back-link" href="/" aria-label="Games">${icon("back")} <span class="narrow-hide">Games</span></a>
        <h1>Game ${game.id}</h1>
        <div class="topbar-actions">
          <a class="button quiet icon-only" href="/games/${game.id}/present" target="_blank" title="Open the screen for the room" aria-label="Open the screen for the room">${icon("screen")}</a>
          <form method="post" action="/games/${game.id}/played">
            <input type="hidden" name="played" value="${game.played_at ? "0" : "1"}" />
            <button class="button quiet ${game.played_at ? "on" : ""}" aria-pressed="${game.played_at ? "true" : "false"}">${icon(game.played_at ? "circleCheck" : "circle")} <span>${game.played_at ? "Played" : "Mark played"}</span></button>
          </form>
        </div>
      </header>

      <nav class="tabs" aria-label="Rounds">
        ${game.rounds.map(
          (r) => html`<a href="#r-${r.def.number}" data-stock="${STOCK[r.def.number]}" data-round="${r.def.number}" aria-label="${roundName(r.def.number)}: ${r.def.title}">${tabLabel(r.def.number)}</a>`,
        )}
      </nav>

      <main class="deck">
        ${game.rounds.map((r) => roundCards(game.id, r))}
      </main>

      <nav class="controls" aria-label="Cards">
        <button class="button quiet" data-go="prev">${icon("prev")} Prev</button>
        <button class="button primary" data-go="flip">${icon("flip")} Flip</button>
        <button class="button quiet" data-go="next">Next ${icon("next")}</button>
      </nav>

      <form class="delete-game" method="post" action="/games/${game.id}/delete" onsubmit="return confirm('Delete this game? Its questions go back into the bank.')">
        <button class="button danger">${icon("trash")} Delete game</button>
      </form>
    </div>`,
    { flash: error, page: "game" },
  );
}

function roundCards(gameId: number, round: GameRound): Html {
  const { def, variant, questions, theme } = round;
  const stock = STOCK[def.number];
  return html`<article class="card title-card" id="r-${def.number}" data-item="r-${def.number}" data-stock="${stock}">
      <div class="face">
        <div class="rule"><span>${roundName(def.number)}</span><span>${def.points}</span></div>
        <h2>${def.title}</h2>
        ${theme ? html`<p class="variant">Theme: ${theme}</p>` : ""}
        ${variant.label ? html`<p class="variant">${variant.label}</p>` : ""}
        ${variant.intro ? html`<p class="read-aloud">“${variant.intro}”</p>` : ""}
        <p class="muted">${questions.length === 1 ? "One question" : `${questions.length} questions`}</p>
      </div>
    </article>
    ${questions.map(({ position, question }) => questionCard(gameId, def, position, questions.length, question, theme))}`;
}

function questionCard(gameId: number, def: RoundDef, position: number, total: number, q: Question, theme: string | null): Html {
  const round = def.number;
  const id = `q-${round}-${position}`;
  // Every card says where the host is: the round, the question, and what it's worth.
  const where = total === 1 ? roundName(round) : `${roundName(round)} · Question ${position} of ${total}`;
  const worth = cornerNote(def, q, theme);
  return html`<article class="card question-card" id="${id}" data-item="${id}" data-stock="${STOCK[round]}">
    <div class="face front">
      <div class="rule"><span>${where}</span><span>${worth}</span></div>
      <p class="prompt">${q.prompt}</p>
      ${promptExtras(q)}
      <div class="card-actions front-actions">${replaceForm(gameId, round, position, id)}</div>
    </div>
    <div class="face back">
      <div class="rule"><span>Answer</span><span>${where}</span></div>
      ${answerBody(q)}
      ${q.notes ? html`<p class="notes">${q.notes}</p>` : ""}
      ${q.source_url ? html`<p><a class="source" href="${q.source_url}" target="_blank" rel="noreferrer">Source ${icon("external")}</a></p>` : ""}
      <div class="card-actions">
        <button class="button quiet" type="button" data-reveal="${id}">${icon("eye")} Reveal on screen</button>
        ${replaceForm(gameId, round, position, id)}
      </div>
    </div>
  </article>`;
}

/** The right side of a card's header: the Final's topic, a themed round's theme, otherwise the points. */
function cornerNote(def: RoundDef, q: Question, theme: string | null): string {
  if (def.number === 9 && (q.theme || q.topic)) return `Topic: ${q.theme ?? q.topic}`;
  return theme ?? def.points;
}

function replaceForm(gameId: number, round: number, position: number, id: string): Html {
  return html`<form method="post" action="/games/${gameId}/replace" data-inline="${id}">
    <input type="hidden" name="round" value="${round}" />
    <input type="hidden" name="position" value="${position}" />
    <button class="button quiet" name="ban" value="0" title="Swap for another question. This one goes back in the bank.">${icon("swap")} Swap</button>
    <button class="button quiet ban" name="ban" value="1" title="Never use this question again.">${icon("ban")} Ban</button>
  </form>`;
}

function promptExtras(q: Question): Html | "" {
  if (q.format === "over_under" && q.data.line !== undefined) {
    return html`<p class="line">Over or under <strong>${q.data.line.toLocaleString()}</strong>?</p>`;
  }
  if (q.format === "multiple_choice" && q.data.options) {
    return html`<ol class="options">${q.data.options.map((o, i) => html`<li><b>${"ABCD"[i]}</b> ${o}</li>`)}</ol>`;
  }
  return "";
}

function answerBody(q: Question): Html {
  if (q.format === "over_under" && q.data.line !== undefined) {
    const actual = Number(q.answer);
    const call = actual > q.data.line ? "Over" : actual < q.data.line ? "Under" : "Exactly";
    return html`<p class="answer">${call} <span class="answer-detail">${actual.toLocaleString()}</span></p>`;
  }
  if (q.format === "list" && q.data.items) {
    return html`<ol class="items">${q.data.items.map((i) => html`<li>${i}</li>`)}</ol>`;
  }
  if (q.format === "multiple_choice" && q.data.options) {
    const letter = "ABCD"[q.data.options.indexOf(q.answer)] ?? "";
    return html`<p class="answer">${letter ? html`<span class="answer-detail">${letter}</span> ` : ""}${q.answer}</p>`;
  }
  if (q.format === "feud" && q.data.answers) {
    return html`<ol class="feud">${q.data.answers.slice(0, 10).map((a) => html`<li><span>${a.text}</span><span class="pts">${a.points}</span></li>`)}</ol>`;
  }
  return html`<p class="answer">${q.answer}</p>`;
}

// ── Presenter screen (what the room sees) ───────────────────────────────

export function presenterPage(game: Game, joinUrl: string | null, qrSvg: string | null): Html {
  return layout(
    `Game ${game.id} · Screen`,
    html`<main class="stage" data-game="${game.id}" aria-live="polite">
      ${joinUrl && qrSvg
        ? html`<div class="stage-join">
            <div class="qr">${new Html(qrSvg)}</div>
            <div>
              <p class="join-title">Scan with your phone to host Game ${game.id}</p>
              <p class="join-url">${joinUrl}</p>
              <p class="join-note">Your phone needs to be on the same network as this laptop. This screen follows your cards once you start.</p>
            </div>
          </div>`
        : html`<p class="stage-wait">Waiting for the host…</p>`}
    </main>`,
    { page: "present" },
  );
}

/** What the room sees: plain text, no card. The answer is only in the markup once the host reveals it. */
export function screenCard(game: Game, item: string, reveal: boolean): Html {
  const [kind, r, p] = item.split("-");
  const round = game.rounds.find((x) => x.def.number === Number(r));
  if (!round) return html`<p class="stage-wait">Waiting for the host…</p>`;
  const stock = STOCK[round.def.number];
  if (kind === "r") {
    // On a themed round the theme is what the room needs to know, so it gets the big line.
    return html`<article class="screen screen-title" data-stock="${stock}">
      <div class="screen-body">
        ${round.theme
          ? html`<h2 class="screen-theme">${round.theme}</h2><p class="screen-variant">${round.def.title}</p>`
          : html`<h2>${round.def.title}</h2>${round.variant.label ? html`<p class="screen-variant">${round.variant.label}</p>` : ""}`}
      </div>
      <footer class="screen-foot"><span>${roundName(round.def.number)}</span><span>${round.def.points}</span></footer>
    </article>`;
  }
  const entry = round.questions.find((x) => x.position === Number(p));
  if (!entry) return html`<p class="stage-wait">Waiting for the host…</p>`;
  const q = entry.question;
  const total = round.questions.length;
  const where = total === 1 ? roundName(round.def.number) : `${roundName(round.def.number)} · Question ${entry.position} of ${total}`;
  return html`<article class="screen" data-stock="${stock}">
    <div class="screen-body">
      <p class="screen-prompt">${q.format === "feud" ? `“${q.prompt}”` : q.prompt}</p>
      ${promptExtras(q)}
      ${reveal ? html`<div class="screen-answer">${answerBody(q)}</div>` : ""}
    </div>
    <footer class="screen-foot"><span>${where}</span><span>${cornerNote(round.def, q, round.theme)}</span></footer>
  </article>`;
}

// ── Review queue ────────────────────────────────────────────────────────

export function reviewPage(q: Question | null, counts: { format: Format; n: number }[], filter: Format | null, error: string | null): Html {
  const total = counts.reduce((sum, c) => sum + c.n, 0);
  return layout(
    "Review",
    html`<main class="sheet">
      <header class="topbar">
        <a class="button quiet" href="/">${icon("back")} Games</a>
        <h1>Review</h1>
        <span class="muted">${total} waiting</span>
      </header>
      <nav class="filters" aria-label="Filter by format">
        <a href="/review" ${filter ? "" : html`aria-current="page"`}>All <span>${total}</span></a>
        ${counts.map(
          (c) => html`<a href="/review?format=${c.format}" ${filter === c.format ? html`aria-current="page"` : ""}>${FORMAT_LABELS[c.format]} <span>${c.n}</span></a>`,
        )}
      </nav>
      ${q ? reviewForm(q, filter) : emptyQueue()}
    </main>`,
    { flash: error, page: "review" },
  );
}

function emptyQueue(): Html {
  return html`<div class="card empty-card" data-stock="sage">
    <div class="face">
      <div class="rule"><span>All caught up</span><span></span></div>
      <p class="prompt">Nothing left to review.</p>
      <p class="muted">Ask Claude for more with <code>bun run stock standard 10 --difficulty 1</code>, then come back here.</p>
    </div>
  </div>`;
}

function reviewForm(q: Question, filter: Format | null): Html {
  const lines = (xs?: string[]) => (xs ?? []).join("\n");
  const source = q.source?.startsWith("jarchive") ? "J! Archive rewrite" : q.source === "claude" ? "Written by Claude" : q.source?.startsWith("protoqa") ? "ProtoQA survey" : "Old question pool";
  return html`<form class="review" method="post" action="/review/${q.id}${filter ? `?format=${filter}` : ""}">
    <div class="card review-card" data-stock="slate">
      <div class="face">
        <div class="rule"><span>${FORMAT_LABELS[q.format]}</span><span>${source}</span></div>
        <label class="field">Question <textarea name="prompt" rows="3" required>${q.prompt}</textarea></label>
        ${q.format === "over_under" ? html`<label class="field">Line <input name="line" type="number" step="any" inputmode="decimal" value="${q.data.line ?? ""}" /></label>` : ""}
        ${q.format === "multiple_choice" ? html`<label class="field">Options, one per line <textarea name="options" rows="4">${lines(q.data.options)}</textarea></label>` : ""}
        ${q.format === "list"
          ? html`<label class="field">Items, one per line <textarea name="items" rows="6">${lines(q.data.items)}</textarea></label>`
          : html`<label class="field">Answer <input name="answer" value="${q.answer}" required /></label>`}
        ${q.format === "name_the_team" ? html`<label class="field">League <input name="league" value="${q.data.league ?? ""}" /></label>` : ""}
        ${q.format === "standard"
          ? html`<div class="field-row">
              <label class="field">Topic
                <select name="topic">${TOPICS.map((t) => html`<option ${q.topic === t ? "selected" : ""}>${t}</option>`)}</select>
              </label>
              <label class="field">Difficulty
                <select name="difficulty">${[1, 2, 3].map((d) => html`<option value="${d}" ${q.difficulty === d ? "selected" : ""}>${DIFFICULTY_LABELS[d]}</option>`)}</select>
              </label>
            </div>
            <label class="field">Theme <input name="theme" value="${q.theme ?? ""}" placeholder="Leave empty if it stands alone" /></label>`
          : ""}
        <label class="field">Notes for you <textarea name="notes" rows="2">${q.notes ?? ""}</textarea></label>
        <label class="field">Source link <input name="source_url" type="url" inputmode="url" value="${q.source_url ?? ""}" /></label>
        ${q.source_url ? html`<p><a class="source" href="${q.source_url}" target="_blank" rel="noreferrer">Check the source ${icon("external")}</a></p>` : ""}
      </div>
    </div>
    <div class="decide">
      <button class="button danger" name="action" value="reject" data-key="r">${icon("ban")} Reject <kbd>R</kbd></button>
      <button class="button quiet" name="action" value="skip" data-key="s">Skip <kbd>S</kbd></button>
      <button class="button primary" name="action" value="approve" data-key="a">${icon("check")} Approve <kbd>A</kbd></button>
    </div>
  </form>`;
}

// ── Sign in ─────────────────────────────────────────────────────────────

export function loginPage(error: boolean): Html {
  return layout(
    "Sign in",
    html`<main class="sheet narrow">
      <form class="card login-card" data-stock="ochre" method="post" action="/login">
        <div class="face">
          <div class="rule"><span>TriviaBot</span><span>Host only</span></div>
          <h1>Sign in</h1>
          <label class="field">Password <input name="password" type="password" autocomplete="current-password" autofocus required /></label>
          <button class="button primary wide">Sign in</button>
        </div>
      </form>
    </main>`,
    { flash: error ? "That password didn't match. Try again." : authEnabled ? null : "No APP_PASSWORD is set, so every page is open.", page: "login" },
  );
}
