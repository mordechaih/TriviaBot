# TriviaBot – Project context for AI

> **Cursor**: This design context is also in `.cursor/rules/design-context.mdc` so Cursor Agent applies it when working on `css/`, `js/`, and `*.html`. Cursor does not read CLAUDE.md.

## Design Context

### Users
- **Primary**: Solo use (you) for weekly trivia games from J! Archive.
- **Future**: May generalize to paid pub hosts who run trivia nights.
- **Job to be done**: Browse games, play through rounds (reveal answers), track what's played; optionally trigger new game generation. Experience should feel minimal and refined, not cluttered or "AI slop."

### Brand Personality
- **Three words**: Minimal, beautiful, polished.
- **Feel**: Like Apple or OpenAI product design—restrained, high craft, clear hierarchy. Reference vibes: Codex, Craft Docs. Explicitly **not** like Claude's UI (avoid that look and feel).
- **Voice**: Calm, confident, unobtrusive. The content (questions, rounds) leads; the UI supports.

### Aesthetic Direction
- **Visual tone**: Minimal, spacious, refined. Generous whitespace, clear typography, subtle depth. Dark-only theme.
- **References**: Codex, Craft Docs—clean layouts, thoughtful typography, restrained color, purposeful motion.
- **Anti-references**: Claude's interface (don't mimic that style).
- **Theme**: Dark mode only. Current orange/red accent palette can stay as a signature but should feel intentional and polished, not noisy.

### Design Principles
1. **Minimal first** – Remove before adding. Every element should earn its place. No decorative clutter.
2. **Beautiful and polished** – Typography, spacing, and motion should feel considered and high-quality (Apple/OpenAI/Codex/Craft level).
3. **Content leads** – Trivia content is the hero; UI frames and supports it without competing.
4. **Accessible by default** – WCAG AA and solid screen reader support so the product is future-proof and inclusive as you open to more users (e.g. pub hosts).
5. **Restrained motion** – Animations and transitions should feel purposeful and smooth, not flashy or distracting.
