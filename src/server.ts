import { networkInterfaces } from "node:os";
import QRCode from "qrcode";
import { authEnabled, checkPassword, isSignedIn, sessionCookie } from "./auth.ts";
import { getQuestion, nextPending, pendingCounts, saveReview, stockLevels } from "./bank.ts";
import { FORMATS, TOPICS, openDb, type Format, type Status, type Topic } from "./db.ts";
import { ShortageError, deleteGame, generateGame, getGame, listGames, replaceQuestion, setPlayed } from "./games.ts";
import { page } from "./html.ts";
import { gamePage, homePage, loginPage, presenterPage, reviewPage, screenCard } from "./views.ts";

const db = openDb();

type Handler = (req: Request & { params: Record<string, string> }) => Response | Promise<Response>;

/** Every page except /login needs the session cookie when APP_PASSWORD is set. */
const guard =
  (handler: Handler): Handler =>
  (req) =>
    isSignedIn(req) ? handler(req) : redirect("/login");

const redirect = (to: string) => new Response(null, { status: 303, headers: { Location: to } });
const withError = (path: string, error: unknown, hash = "") =>
  redirect(`${path}?error=${encodeURIComponent(error instanceof Error ? error.message : String(error))}${hash}`);
const errorParam = (req: Request) => new URL(req.url).searchParams.get("error");

/**
 * What the room's screen shows for each game: the host's current card, and whether its answer is revealed.
 * Kept in memory; after a restart the screen waits until the host moves to a card.
 */
const screens = new Map<number, { item: string; reveal: boolean; version: number }>();
let screenVersion = 0;

const asset = (file: string, type: string) => () =>
  new Response(Bun.file(new URL(`../public/${file}`, import.meta.url)), {
    headers: { "Content-Type": type, "Cache-Control": "no-cache" },
  });

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  routes: {
    "/styles.css": asset("styles.css", "text/css; charset=utf-8"),
    "/app.js": asset("app.js", "text/javascript; charset=utf-8"),
    "/fonts/:file": (req) => {
      const file = req.params.file;
      if (!/^[a-z0-9-]+\.woff2$/.test(file)) return new Response("Not found", { status: 404 });
      return new Response(Bun.file(new URL(`../public/fonts/${file}`, import.meta.url)), {
        headers: { "Content-Type": "font/woff2", "Cache-Control": "public, max-age=31536000, immutable" },
      });
    },

    "/login": {
      GET: () => page(loginPage(false)),
      POST: async (req) => {
        const form = await req.formData();
        if (!checkPassword(String(form.get("password") ?? ""))) return page(loginPage(true), 401);
        return new Response(null, { status: 303, headers: { Location: "/", "Set-Cookie": sessionCookie(req) } });
      },
    },

    "/": guard((req) => {
      const pending = pendingCounts(db).reduce((sum, c) => sum + c.n, 0);
      return page(homePage(listGames(db), stockLevels(db), pending, errorParam(req)));
    }),

    "/games": {
      POST: guard(() => {
        try {
          return redirect(`/games/${generateGame(db)}`);
        } catch (e) {
          if (e instanceof ShortageError) return withError("/", e);
          throw e;
        }
      }),
    },

    "/games/:id": guard((req) => {
      const game = getGame(db, Number(req.params.id));
      return game ? page(gamePage(game, errorParam(req))) : new Response("Not found", { status: 404 });
    }),

    "/games/:id/present": guard(async (req): Promise<Response> => {
      const game = getGame(db, Number(req.params.id));
      if (!game) return new Response("Not found", { status: 404 });
      // Until the host opens a card, the room screen shows a code the host's phone can scan to open this game.
      const ip = lanAddresses()[0];
      const joinUrl: string | null = ip ? `http://${ip}:${server.port}/games/${game.id}` : null;
      const qr = joinUrl ? await QRCode.toString(joinUrl, { type: "svg", margin: 2, color: { dark: "#131416", light: "#ededef" } }) : null;
      return page(presenterPage(game, joinUrl, qr));
    }),

    "/games/:id/screen": {
      // The presenter polls with ?v=<last version>; 204 means nothing changed.
      GET: guard((req) => {
        const id = Number(req.params.id);
        const state = screens.get(id);
        const seen = Number(new URL(req.url).searchParams.get("v") ?? -1);
        if (!state || state.version === seen) return new Response(null, { status: 204 });
        const game = getGame(db, id);
        if (!game) return new Response("Not found", { status: 404 });
        return new Response(screenCard(game, state.item, state.reveal).value, {
          headers: { "Content-Type": "text/html; charset=utf-8", "X-Screen-Version": String(state.version) },
        });
      }),
      POST: guard(async (req) => {
        const { item, reveal } = (await req.json()) as { item?: string; reveal?: boolean };
        if (!item || !/^(r-\d|q-\d-\d+)$/.test(item)) return new Response("Bad item", { status: 400 });
        const current = screens.get(Number(req.params.id));
        // Moving to another card always hides the answer again.
        const nextReveal = Boolean(reveal) || (current?.item === item && current.reveal && reveal === undefined);
        screens.set(Number(req.params.id), { item, reveal: nextReveal, version: ++screenVersion });
        return Response.json({ item, reveal: nextReveal });
      }),
    },

    "/games/:id/played": {
      POST: guard(async (req) => {
        const form = await req.formData();
        setPlayed(db, Number(req.params.id), form.get("played") === "1");
        return redirect(`/games/${req.params.id}`);
      }),
    },

    "/games/:id/delete": {
      POST: guard((req) => {
        deleteGame(db, Number(req.params.id));
        return redirect("/");
      }),
    },

    "/games/:id/replace": {
      POST: guard(async (req) => {
        const form = await req.formData();
        const [round, position] = [Number(form.get("round")), Number(form.get("position"))];
        const path = `/games/${req.params.id}`;
        const hash = `#q-${round}-${position}`;
        try {
          replaceQuestion(db, Number(req.params.id), round, position, form.get("ban") === "1");
          return redirect(path + hash);
        } catch (e) {
          return withError(path, e, hash);
        }
      }),
    },

    "/review": guard((req) => {
      const filter = formatParam(req);
      const afterId = Number(new URL(req.url).searchParams.get("after") ?? 0);
      return page(reviewPage(nextPending(db, { format: filter ?? undefined, afterId }), pendingCounts(db), filter, null));
    }),

    "/review/:id": {
      POST: guard(async (req) => {
        const id = Number(req.params.id);
        const filter = formatParam(req);
        const back = (after: number) => `/review?${new URLSearchParams({ ...(filter && { format: filter }), after: String(after) })}`;
        const question = getQuestion(db, id);
        if (!question) return redirect(back(id));

        const form = await req.formData();
        const action = String(form.get("action"));
        if (action === "skip") return redirect(back(id));

        const text = (name: string) => String(form.get(name) ?? "").trim();
        const lines = (name: string) => text(name).split("\n").map((l) => l.trim()).filter(Boolean);
        const data = { ...question.data };
        if (form.has("line")) data.line = Number(text("line"));
        if (form.has("options")) data.options = lines("options");
        if (form.has("items")) data.items = lines("items");
        if (form.has("league")) data.league = text("league");
        const answer = form.has("items") ? lines("items").join("; ") : text("answer");

        const topic = text("topic");
        const edit = {
          prompt: text("prompt") || question.prompt,
          answer,
          notes: text("notes") || null,
          topic: (TOPICS as readonly string[]).includes(topic) ? (topic as Topic) : question.topic,
          theme: form.has("theme") ? text("theme") || null : question.theme,
          difficulty: form.has("difficulty") ? Number(text("difficulty")) : question.difficulty,
          source_url: text("source_url") || null,
          data,
        };
        const status: Status = action === "approve" ? "approved" : "rejected";
        const problem = status === "approved" && reviewProblem(question.format, answer, data);
        if (problem) {
          // Show the same question again with the edits kept.
          return page(reviewPage({ ...question, ...edit }, pendingCounts(db), filter, problem), 422);
        }
        saveReview(db, id, edit, status);
        return redirect(back(id));
      }),
    },

    "/backup": guard(async () => {
      // A consistent copy of the database, for safekeeping.
      const file = `${process.env.TMPDIR ?? "/tmp"}/trivia-backup-${Date.now()}.db`;
      db.run(`VACUUM INTO '${file}'`);
      const bytes = await Bun.file(file).bytes();
      await Bun.file(file).delete();
      return new Response(bytes, {
        headers: { "Content-Disposition": `attachment; filename="trivia-${new Date().toISOString().slice(0, 10)}.db"` },
      });
    }),
  },
  fetch: () => new Response("Not found", { status: 404 }),
  error: (e) => {
    console.error(e);
    return new Response("Something went wrong.", { status: 500 });
  },
});

function formatParam(req: Request): Format | null {
  const f = new URL(req.url).searchParams.get("format");
  return (FORMATS as readonly string[]).includes(f ?? "") ? (f as Format) : null;
}

function reviewProblem(format: Format, answer: string, data: { line?: number; options?: string[] }): string | null {
  if (!answer) return "An answer is required.";
  if (format === "over_under" && (Number.isNaN(Number(answer)) || !Number.isFinite(data.line))) return "Over/Under needs a numeric answer and line.";
  if (format === "multiple_choice" && !data.options?.includes(answer)) return "The answer must match one of the options exactly.";
  if (format === "true_false" && !["True", "False"].includes(answer)) return 'The answer must be "True" or "False".';
  return null;
}

console.log(`Trivia running at ${server.url}${authEnabled ? "" : " (no APP_PASSWORD set, so it's open)"}`);
// Running on the laptop at the bar: these are the addresses a phone on the same Wi-Fi or hotspot can open.
for (const ip of lanAddresses()) console.log(`  On your phone: http://${ip}:${server.port}`);

/** IPv4 addresses a phone could reach, an iPhone hotspot's (172.20.10.x) first, then home-style networks. */
function lanAddresses(): string[] {
  function rank(ip: string): number {
    if (ip.startsWith("172.20.10.")) return 0;
    if (ip.startsWith("192.168.")) return 1;
    return 2;
  }
  return Object.values(networkInterfaces())
    .flat()
    .filter((a) => a && a.family === "IPv4" && !a.internal)
    .map((a) => a!.address)
    .sort((a, b) => rank(a) - rank(b));
}
