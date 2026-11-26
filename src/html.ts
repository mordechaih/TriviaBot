/** Markup that is already safe to send. */
export class Html {
  constructor(readonly value: string) {}
  toString() {
    return this.value;
  }
}

type Value = Html | string | number | boolean | null | undefined | Value[];

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]!);

function render(v: Value): string {
  if (v instanceof Html) return v.value;
  if (Array.isArray(v)) return v.map(render).join("");
  if (v === null || v === undefined || v === false) return "";
  return escape(String(v));
}

/** Template tag that escapes every interpolated value unless it is already Html. */
export function html(strings: TemplateStringsArray, ...values: Value[]): Html {
  return new Html(strings.reduce((out, s, i) => out + s + (i < values.length ? render(values[i]!) : ""), ""));
}

export function page(body: Html, status = 200): Response {
  return new Response(`<!doctype html>${body}`, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
