---
version: 1
slug: "src-views-ts"
primary_target: "src/views.ts"
related_targets: ["public/styles.css","public/app.js"]
---

## Scope

All of the app's screens: the live host view of a game (phone first), the presenter screen the room sees on a laptop or projector, the games list, the review queue and sign-in. Mode: Operate. The presenter screen is a display the room reads, held to the same world.

## Audience and task

One host on game night in a dim bar, phone in one hand, reading questions aloud, checking answers, and swapping or banning a bad question without losing their place. The room reads the presenter screen from across the bar. Between weeks the same host reviews new questions quickly.

## Constraints

Server-rendered HTML with a little vanilla JS and no build step. It must work one-handed in low light. The presenter screen never shows an answer until the host reveals it.

## Direction contract

THESIS: Each question is the card in the host's hand, question on the front and answer on the back. It refuses the category default of a scrolling list of rows with disclosure arrows.

OWN-WORLD: Muted dark. A near-black bar-top ground, and index cards in subdued dark stock tints: ochre, sage, slate, dusk rose, rust, with a muted brick red for the Final. Each card carries faint blue ruling and a muted red header rule. Type is Atkinson Hyperlegible Next throughout. Round tabs are small index-card tabs in each round's stock colour.

STORY: The host sees which round they're in, reads the card aloud, flips it to check the answer, swaps or bans it if it fails, and moves to the next card. The room sees the same card on the big screen, answer hidden until the host reveals it.

FIRST VIEWPORT: A top bar with Games (back), the game title, and Mark played. Below it, nine round tabs in their stock colours with the current one lit, then the round title and its points. The current card takes most of the height: its header rule reads "Question 1 of 3", the points sit at the right, and the question is at reading size. Prev, Flip and Next sit at the bottom within thumb reach.

FORM: Host Cue Cards, position 1 on my ordered list (the pick card). seed: 3e67a959f24a8646. Signature move: the card turns over on its vertical axis to its answer side, and the presenter screen mirrors the host's current card.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
