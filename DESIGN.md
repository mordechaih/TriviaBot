---
name: TriviaBot
description: Host cue cards in a dim bar. Muted dark stock, faint ruling, a red header rule.
colors:
  ground: "#131416"
  ground-raised: "#1b1c1f"
  line: "#2b2d32"
  text: "#ededef"
  text-2: "#a7a9b0"
  header-rule: "#a9474a"
  focus: "#e3cf86"
  danger: "#e58b84"
  card-default: "#26272b"
  ochre-card: "#2c2819"
  ochre-ink: "#e3cf86"
  sage-card: "#1d2a22"
  sage-ink: "#a8d6b3"
  slate-card: "#1c2532"
  slate-ink: "#a3c6e8"
  rose-card: "#2d1f28"
  rose-ink: "#e8abc4"
  rust-card: "#31231a"
  rust-ink: "#ebb68c"
  brick-card: "#331c1c"
  brick-ink: "#f0a197"
  on-ink: "#141310"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: "2rem"
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.9rem"
    fontWeight: 600
    lineHeight: "2.5rem"
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 400
    lineHeight: "2rem"
  label:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.88rem"
    fontWeight: 600
    lineHeight: 1.5
rounded:
  card: "10px"
  field: "8px"
  tab: "6px"
  pill: "999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  card-pad: "1.25rem"
  header: "3.25rem"
  foot: "4rem"
components:
  button:
    backgroundColor: "{colors.ground-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "0 1rem"
    height: "2.75rem"
  button-primary:
    backgroundColor: "{colors.focus}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.pill}"
    padding: "0 1rem"
    height: "2.75rem"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.text-2}"
    rounded: "{rounded.pill}"
    height: "2.75rem"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.danger}"
    rounded: "{rounded.pill}"
    height: "2.75rem"
  card:
    backgroundColor: "{colors.card-default}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "3.25rem 1.25rem 1.25rem"
  card-tab:
    backgroundColor: "{colors.ochre-card}"
    textColor: "{colors.ochre-ink}"
    rounded: "{rounded.tab}"
    height: "2.75rem"
  card-tab-current:
    backgroundColor: "{colors.ochre-ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.tab}"
    height: "2.75rem"
  field:
    backgroundColor: "rgb(0 0 0 / 0.28)"
    textColor: "{colors.text}"
    rounded: "{rounded.field}"
    padding: "0.6rem 0.75rem"
---

# Design System: TriviaBot

## Overview

**Creative North Star: "Host Cue Cards"**

Every question is the index card in the host's hand: question on the front, answer on the back. The product is a single host's tool for a dim bar, so the interface is a near-black bar top with cards laid on it, and nothing else competes with the card. It refuses the category default of a scrolling list of rows with disclosure arrows: on the host view one card fills the deck, and the next two cards of the hand wait behind it.

The material is muted dark stock. Six card tints (ochre, sage, slate, dusk rose, rust, and brick red for the Final) each pair a dark card colour with a light ink in the same hue. Each deck card carries faint blue ruling that every line of text sits on, and a muted red header rule. Type is one family, Atkinson Hyperlegible Next, chosen for legibility at arm's length in low light. The presenter screen is not a card: it is plain text on the ground, because the room needs words, not furniture.

**Key Characteristics:**
- One near-black ground; colour lives on the cards, never on the page.
- Stock colour is the wayfinding: round tabs, card ink, the Flip button and primary actions all take the current round's stock.
- The header rule is on every card. Ruling is only on the deck's cards, where text can sit on it; form cards (review, sign-in) are unruled.
- One typeface, one icon set (Lucide, inlined), pill buttons, 10px cards.
- The answer is physically on the back of the card, and on the presenter screen it does not exist in the markup until the host reveals it.

## Colors

A dark neutral ground, two greys of text, and six stock pairs; the only saturated notes are a yellow focus colour, a coral danger colour and the muted red header rule.

### Primary
- **Cue Yellow** (#e3cf86): focus ring, selection tint, count badge, accent for primary actions when no stock is active, and the ochre stock's ink. It is the one interactive accent.

### Secondary (the six stocks)
Each stock is a card colour with its ink. Ink is for text and highlights on that card (answer, tab fill, Flip button); the secondary ink on a card is `--ink-2`, the ink mixed 62% toward the grey text colour.
- **Ochre** card (#2c2819), ink (#e3cf86): Rounds 1 and 2; also sign-in.
- **Sage** card (#1d2a22), ink (#a8d6b3): Rounds 3 and 4; also the empty review card and the "Played" and Approve accent.
- **Slate** card (#1c2532), ink (#a3c6e8): Rounds 5 and 6; also the review form card.
- **Dusk Rose** card (#2d1f28), ink (#e8abc4): Round 7.
- **Rust** card (#31231a), ink (#ebb68c): Round 8.
- **Muted Brick** card (#331c1c), ink (#f0a197): the Final only.

### Tertiary
- **Header Red** (#a9474a): the 2px rule under every card header. Nothing else is this red.
- **Warning Coral** (#e58b84): danger buttons, low-stock rows. Alert panels use a dark red panel (#2a1918 with a #5b2d2a border).

### Neutral
- **Bar Top** (#131416): page ground.
- **Raised Ground** (#1b1c1f): default button fill, hover rows.
- **Hairline** (#2b2d32): list and table dividers, button borders.
- **Chalk** (#ededef): primary text.
- **Smoke** (#a7a9b0): secondary text, quiet buttons.
- **Card Default** (#26272b): a card with no stock set.
- **Ruling** (rgb(130 160 210 / 0.11)): the faint blue lines on deck cards. Family Feud rows sit on them; they need no dividers of their own.
- **Ink Black** (#141310): text on any filled ink surface (primary button, current tab, count badge).

### Named Rules
**The Stock Is the Round Rule.** A round's colour is its stock, and the same stock tints its tabs, its cards, and the primary button while its card is showing. Do not introduce a colour for state; use stock ink, or Warning Coral for danger.

**The Colour Lives on Cards Rule.** The ground and chrome stay neutral. Colour appears on cards and on things that belong to a card.

## Typography

**Display, Body, Label Font:** Atkinson Hyperlegible Next (with system-ui, sans-serif), self-hosted, latin and latin-ext, variable weight 200 to 800.

**Character:** One legible humanist sans doing everything, with weight carrying hierarchy rather than a second face. Numerals are tabular throughout so points and counts line up.

### Hierarchy
- **Display** (600, 2rem, card line pitch): round titles on the title card (3.6em on the presenter screen).
- **Headline** (600, 1.55rem, 2rem line; 1.9rem on a 2.5rem line from 48rem up): the question prompt. On the presenter screen 2.2em of the screen size.
- **Title** (700, 1.35rem, 1.15): page headings and game name (1.1rem in the host bar); wordmark is 1.6rem.
- **Body** (400, 1.1rem to 1.3rem, card line pitch): option lists, "Over or under" line, notes. List items and answers raise to 600 or 700 (answer 1.7rem, 2.3rem from 48rem up).
- **Label** (600, 0.88rem): the header-rule text "Round N · Question p of n" and field labels. Buttons use 0.95rem at 600.

Base size is 17px, 19px from 1000px wide.

### Named Rules
**The Ruled Line Rule.** Every baseline on a deck card sits on a rule. Card line pitch (`--lh`) is 2rem, 2.5rem on the host deck at 48rem and up; every text block takes that line-height and spaces itself in whole lines. The rule is drawn at the baseline of a 1rem line, `--lh / 2 + 0.335rem` from the top of each line (0.335em is this face's baseline offset from the middle of a line box), and each text block of another size nudges itself onto it with `top: calc(0.335 * (1rem - 1em))`. Inline text larger than its line (the over/under number) takes `line-height: 1` so it cannot stretch the line. Measured: every line on every card within 0.35px of its rule, phone and desktop.

**The One Voice Rule.** One family. Hierarchy comes from size, weight and ink, not a second typeface.

## Layout

The page is a single centred column, 42rem wide (26rem for sign-in), with 1rem gutters and safe-area padding. The host view is a full-height flex column when JavaScript is present: top bar, a row of nine round tabs, the deck, then Prev, Flip and Next within thumb reach. Without JavaScript the same markup lists every card with its answer beneath.

Every card in the deck is the same size, stacked in one spot and centred: portrait on phones (120cqi of the deck width, capped at the deck height), a 5:3 index card on wide screens (60cqi). Content longer than the card scrolls inside it. Inside the card, the header rule sits at the top (3.25rem header), the ruling runs from there, and it stops 4rem above the foot so action rows sit on an unruled foot.

On phones (26rem and below) the Games back link collapses to its chevron and other secondary labels to icons; "Mark played" keeps its words. The nine tabs share one row on any width; tab hit areas extend across the gaps (40 by 52px each at 390px, since nine tabs cannot reach 44px width, accepted explicitly).

The presenter screen is plain text, up to 90rem wide with type scaled by `clamp(1.1rem, 2vw, 2.6rem)`: the question (or round title) vertically centred at left, up to 30em wide, and a footer line with where we are at left and the points at right. Spacing is rem multiples of 0.25 (0.25, 0.5, 1, 1.25 and 2.75 for section gaps).

## Elevation & Depth

Hybrid: tonal layering for the page, a physical shadow only for cards. The ground and raised ground differ by a few percent; borders are 1px hairlines. Cards carry a 1px top inner highlight (`inset 0 1px 0 rgb(255 255 255 / 0.04)`) and a long soft drop (`0 12px 28px -12px rgb(0 0 0 / 0.7)`, `0 18px 36px -16px rgb(0 0 0 / 0.75)` on the deck face). On the deck, the next two cards wait behind the current one: pushed back in depth (-28px and -56px), offset and turned (+1.3deg and -1.7deg), darkened 20% toward the ground, their writing hidden until they come forward. Whatever comes next in the game is what's behind, so a round change shows the next round's stock waiting. Toasts take a stronger shadow (`0 12px 28px -8px rgb(0 0 0 / 0.7)`).

### Named Rules
**The Real Hand Rule.** Depth on the deck is the actual next cards, not a drawn edge or a bigger shadow. Never more than two behind.

## Shapes

Cards are 10px rounded; fields 8px; round tabs 6px on top and 3px on the bottom, like an index-card tab; buttons are full pills; the count badge is a pill. Borders are 1px hairlines, and the only thick line is the 2px header rule. Ruling is horizontal and edge to edge on the card. The deck card is rectangular and portrait or 5:3, never square.

## Components

### Buttons
- **Shape:** pill (999px), 2.75rem minimum height, 3.25rem for card controls and wide.
- **Default:** raised ground fill, hairline border, Chalk text at 600. Hover lightens to #24262a.
- **Primary:** fill is the current stock ink (Cue Yellow by default), Ink Black text; hover brightens 8%.
- **Quiet:** transparent, Smoke text; on a card it takes the card's ink-2 and a 5% white wash on hover. A "on" state takes the ink colour.
- **Danger:** transparent, Warning Coral text, coral wash on hover.
- **Icon-only:** 2.75rem square pill. Keyboard hints (`kbd`) appear only on hover-capable devices.
- **Focus:** 2px Cue Yellow outline, 3px offset, on every focusable element.

### Round tabs
Small index-card tabs, one per round, in the round's stock fill with ink-2 text at 700. The current tab is lit with a solid stock-ink fill and Ink Black text; the others keep the muted fill. Hit areas reach across the gaps.

### Question card
- **Header rule:** "Round N · Question p of n" left, points right (Final: "Topic: ..." right), above a 2px Header Red line. On the back face the left reads "Answer" and the right the position.
- **Front:** prompt at headline size, on the ruling; format body below it. Swap and Ban live on the front foot too.
- **Back:** the answer in stock ink at 1.7rem, bold; notes and a source link beneath; the foot carries Reveal on screen, Swap and Ban.
- **Swap / Ban:** both faces. Swap returns the question to the bank; Ban is permanent, sits apart from Swap with a 1.25rem gap, and asks for confirmation.
- **Flip:** a tap, the Flip button, Space or F turn the card over on its vertical axis; a vertical swipe (or the up/down arrows) turns it end over end in the swipe's direction. 460ms `cubic-bezier(0.3, 0.7, 0.2, 1)`, and the card lifts 40px toward you mid-turn so its corners clear the hand.
- **Moving on:** Next (or a swipe left) throws the top card off to the left: it rises toward you (translateZ 90px) and turns (-11deg in plane, -14deg in depth) as it goes, so it always passes in front of the card coming forward and never cuts through it; the card behind comes forward and its writing fades in. Prev (or a swipe right) brings the last card back in over the top the same way. Dragging sideways moves the card with your finger, and letting go past 80px (or a quick flick) throws it; short of that it settles back. 420ms `cubic-bezier(0.25, 0.75, 0.2, 1)`.
- **Reduced motion:** no throws, turns or lifts; faces and cards crossfade.

### Title card
Same card with the round name and points in the header rule, round title at display size in stock ink, "Theme: …" on themed rounds, optional variant label and an italic read-aloud intro, and a question count. On a themed round's question cards the header's right side carries the theme instead of the points.

### Presenter screen
Not a card. Plain Chalk text on the ground: prompt at 2.2em/600, round titles at 3.6em (on a themed round the theme takes that line, in the round's ink, with the round title beneath in Smoke); the answer, in the round's ink at 2.6em/700, appears beneath only after the host reveals it, with a 420ms rise and fade; before that it is not in the markup. The footer line (Smoke, 600) says where we are and what it's worth.

### Fields
Dark translucent fill (rgb(0 0 0 / 0.28)), 1px hairline border at 10% white, 8px radius, 1.05rem text, Cue Yellow caret. Labels are 0.88rem at 600 in ink-2 on the card.

### Navigation
A top bar of quiet buttons: back link at left, title (truncated), actions at right (screen, Mark played). Played is a sage circle-check; unplayed is an empty circle. The games list is divider rows with a status at the right, not a card list.

### Toast
Fixed, centred above the controls, dark red panel with coral-tinted text, used for inline swap and ban errors.

## Do's and Don'ts

### Do:
- **Do** set every card header as a ruled line: label left, points or context right, 2px Header Red beneath.
- **Do** colour by stock: use the round's stock for tabs, card ink and the primary action on that card.
- **Do** keep every baseline on a rule: line-height `--lh`, spacing in whole lines, and the baseline nudge for any new text size.
- **Do** keep action rows on the unruled foot of the card.
- **Do** confirm permanent actions (Ban) and keep them apart from reversible ones (Swap).
- **Do** keep the answer out of the presenter markup until the host reveals it.
- **Do** give every flip and deal a reduced-motion crossfade alternative.
- **Do** use Lucide icons from `src/icons.ts` and the single typeface.

### Don't:
- **Don't** replace the card with a row, a disclosure arrow, or a scrolling list on the host view.
- **Don't** put an eyebrow or small label above a heading; the header rule carries that information.
- **Don't** colour the ground or the page chrome with stock colours; they belong to cards.
- **Don't** use Header Red for anything but the card header rule.
- **Don't** dress the presenter screen as a card; it is words on the ground.
- **Don't** add a second typeface or a glyph or emoji in place of an icon.
- **Don't** draw fake card edges; the cards behind are the real next cards.
- **Don't** shrink tab hit areas to the visible tab; they extend across the gaps.
