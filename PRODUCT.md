# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One person: the owner, who hosts a weekly pub trivia night. They run the game themselves; no other hosts are planned, so there are no accounts or roles beyond a single password.

- **Live, at the bar:** the host holds a phone, reads each question aloud, reveals answers, and swaps or bans a question that isn't working. Dim light, often one hand free, attention split with the room.
- **On the big screen:** sometimes a laptop drives a projector or TV that the players see. That screen shows questions to the room. Answers stay on the host's phone until the host chooses to reveal them.
- **Between weeks:** short sessions reviewing new questions (approve, edit, reject) and generating the next game.

## Product Purpose

Make a complete, good game every week with almost no prep. One tap builds a game (8 rounds plus a Final) from a bank of questions the host has already approved. The host runs it live from the phone and keeps the bank stocked: Claude writes new questions and checks each against a web source, and nothing reaches a game until the host approves it.

Success: the host opens the app on game night, taps "New game", and runs the whole night without editing anything by hand.

## Positioning

Built around the host's own round guide (`docs/round-guide.md`), not generic quiz rounds: Get Your Feet Wet, Over/Under, Trifecta, The List Round, Game Show Style (rotating True/False, Name That Tune, Millionaire, Family Feud), Entertainment, Mixing Things Up (rotating Who Am I?, Size Matters, Name That Brand, Name That Sports Team), Game Changer, and a Final with a bet. Every question is approved by a person, so nothing unreviewed goes live.

## Operating Context

- Game night happens weekly, in a bar, with teams at tables. The host reads questions aloud and the teams write answers. Points per question rise by round (2 up to 6) and the Final is a bet.
- Game Show and Mixing Things Up rotate formats week to week. Name That Tune means the host plays the song from their own device.
- The question bank is filled in batches (`bun run stock <format> <count>`) and reviewed in the app.
- The app runs as one Bun server with a SQLite file, behind a single password.

## Capabilities and Constraints

- **Games:** generate, list, open, mark played, delete (which returns its questions to the bank).
- **Live host view:** questions grouped by round, answers hidden until tapped. Swap a question (it goes back to the bank) or ban it (never used again), in place, without losing your spot.
- **Presenter view (decided, not yet built):** a screen for the room that shows the current round and question large. The host's phone chooses which question is on screen and when its answer is revealed. Answers must never appear on the presenter screen before the host reveals them.
- **Review queue:** one pending question at a time, editable, with approve, reject and skip and keyboard shortcuts. Stock levels show when the bank can't fill a full game.
- **Formats:** each has its own answer shape: standard, over/under (a line and an actual number), list (many items), true/false, multiple choice (four options), Family Feud (top-10 survey answers), Who Am I?, Size Matters, Name That Brand, Name That Sports Team (one league per round), Name That Tune.
- **Constraints:** server-rendered HTML with a little vanilla JS, no frontend build step. It must work one-handed on a phone and still read well on a laptop or projector.
- **Decided:** it always runs from the host's laptop at the bar (the same laptop drives the projector), with the phone on the laptop's network; no hosting. Rounds 1, 3 and 8 are themed, fed by Jeopardy! categories rewritten as spoken questions.

## Brand Commitments

- Name: TriviaBot (the repository). The app title currently reads "Trivia".
- Carried over loosely from the earlier version, as spirit rather than rules: minimal, polished, content first. The questions are the hero and the interface supports them without competing. The old dark-only theme and orange-red accent are not binding.
- The voice follows the round guide: conversational and clear, like a host talking to the room.

## Evidence on Hand

- `docs/round-guide.md`: the host's round-by-round format, with example questions in their voice.
- `docs/rewrite-examples.md`: 16 J! Archive clues rewritten or rejected.
- `seed/`: legacy question pools (pending review), 16 rewritten J! Archive questions, and 980 ProtoQA Family Feud surveys.
- There are no users, testimonials, metrics or press, and none should be invented.

## Product Principles

1. **Game night needs zero prep.** Anything that has to happen on game night is one tap, and failure states say exactly what to stock.
2. **A person approves every question.** Automation proposes; the host decides.
3. **The room never sees an answer early.** What appears on a shared screen is always the host's explicit choice.
4. **Readable in a dark bar at arm's length.** Glanceable hierarchy, big targets, no precision taps mid-game.
5. **The round guide is the spec.** Formats, points and voice come from the host's own guide, not quiz-app conventions.

## Accessibility & Inclusion

- WCAG AA contrast in low light. Text the room reads on a projector must work from the back of a bar.
- Every action works by touch and keyboard (the review queue has shortcuts). Respect reduced-motion preferences.
