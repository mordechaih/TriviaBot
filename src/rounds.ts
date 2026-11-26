import { FORMAT_LABELS, type Format, type Topic } from "./db.ts";

/** One way to fill a round. Rounds with several variants rotate between them. */
export type Variant = {
  label?: string;
  format: Format;
  count: number;
  difficulty?: number[];
  topic?: Topic;
  /** All the round's questions come from one theme, which the round announces. */
  themed?: boolean;
  /** What the host reads out before the round. */
  intro?: string;
};

export type RoundDef = {
  number: number;
  title: string;
  points: string;
  variants: Variant[];
};

/** The weekly game, from docs/round-guide.md. Round 9 is Final Trivia. */
export const ROUNDS: RoundDef[] = [
  {
    number: 1,
    title: "Get Your Feet Wet",
    points: "2 pts each",
    variants: [{ format: "standard", count: 3, difficulty: [1, 2], themed: true }],
  },
  {
    number: 2,
    title: "Over/Under",
    points: "3 pts each",
    variants: [{ format: "over_under", count: 3, intro: "Is the real number over or under the one I give you?" }],
  },
  {
    number: 3,
    title: "Trifecta Trivia",
    points: "3 pts each",
    variants: [{ format: "standard", count: 3, difficulty: [1, 2], themed: true }],
  },
  {
    number: 4,
    title: "The List Round",
    points: "1 pt per item",
    variants: [{ format: "list", count: 1, intro: "One question, many answers. A point for each one you get." }],
  },
  {
    number: 5,
    title: "Game Show Style",
    points: "4 pts each",
    variants: [
      { label: "To Tell the Truth", format: "true_false", count: 3, intro: "Three statements: true or false?" },
      { label: "Name That Tune", format: "name_that_tune", count: 3, intro: "Name the title and the artist." },
      { label: "Who Wants to Be a Millionaire", format: "multiple_choice", count: 3, intro: "Four options, one answer." },
      { label: "Family Feud", format: "feud", count: 1, intro: "We surveyed 100 people. Give me the #1 answer." },
    ],
  },
  {
    number: 6,
    title: "Entertainment Trivia",
    points: "4 pts each",
    variants: [{ format: "standard", count: 3, topic: "entertainment" }],
  },
  {
    number: 7,
    title: "Mixing Things Up",
    points: "5 pts each",
    variants: [
      { label: "Who Am I?", format: "who_am_i", count: 3, intro: "I'll describe a famous person. Tell me who they are." },
      { label: "Size Matters", format: "size_matters", count: 3, intro: "Which one is taller?" },
      { label: "Name That Brand", format: "name_the_brand", count: 3, intro: "I name two products. You name the brand." },
      { label: "Name That Sports Team", format: "name_the_team", count: 3, intro: "I name the place. You name the team." },
    ],
  },
  {
    number: 8,
    title: "Game Changer",
    points: "6 pts each",
    variants: [{ format: "standard", count: 3, difficulty: [2, 3], themed: true }],
  },
  {
    number: 9,
    title: "Final Trivia",
    points: "Bet any or all of your points",
    variants: [{ format: "standard", count: 1, difficulty: [3] }],
  },
];

export function roundDef(number: number): RoundDef {
  const def = ROUNDS.find((r) => r.number === number);
  if (!def) throw new Error(`No round ${number}`);
  return def;
}

export function describeVariant(v: Variant): string {
  if (v.label) return v.label;
  const parts: string[] = [FORMAT_LABELS[v.format]];
  if (v.themed) parts.push("themed");
  if (v.topic) parts.push(v.topic);
  if (v.difficulty) parts.push(v.difficulty.map((d) => ["", "easy", "medium", "hard"][d]).join("/"));
  return parts.join(" · ");
}
