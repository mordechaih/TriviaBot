# Trivia Question Writing & LLM Generation — Technique Library

The annotated "why" behind the rules. Source attributions are preserved so a
human (or Claude) can trace each guideline. The condensed, machine-applied
subset lives in `scripts/lib/question-quality.js` (`QUALITY_SYSTEM_RULES` + the
`verifyGeneratedQuestions` detector). **Keep this doc and that module in sync**
when rules change.

Sources: Wise Owl; Runaway Games; Ben Swift (GenAI trivia-night case study);
arXiv 2601.14280 (Hallucination-Free Automatic Q&A Generation); Jeopardy!
Writers Room; NAQT/Berkeley quizbowl primer.

---

## 1. Audience & Difficulty Calibration
- Specify the audience demographically in the prompt (narrower = more relevant). (Wise Owl)
- Request an explicit easy/medium/hard spread per group. (Wise Owl)
- Target a hit-rate, not a vibe — state a desired correct-answer percentage (~50%). (Ben Swift)
- You cannot eyeball difficulty when you can see the answer; judge difficulty BLIND. (Ben Swift)
- Difficulty is tunable by one word — remove a word to harden, add a word to ease. (Jeopardy!)
- Adjust difficulty iteratively in small steps; expect overshoot. (Ben Swift, Runaway Games)
- The writer/verifier must know what is obscure vs. not. (NAQT/Berkeley)

## 2. Plausible, Fair Distractors (multiple-choice)
- Explicitly ask for plausible-but-wrong options. (Wise Owl)
- Bland distractors are a failure mode; make them convincing (humor can help). (Wise Owl)
- Layer distractors as a second pass after the correct answer. (Runaway Games)
- A distractor must NOT be a second correct answer (|valid answers| must = 1). (arXiv)
- Regenerate from a fresh context when distractors are weak. (Wise Owl)

## 3. Clue Construction & Uniqueness
- Pyramidal ordering: hardest clues first, easiest last. (NAQT, Jeopardy!)
- Unique identification is mandatory; ambiguous questions with multiple possible answers are "hoses." (NAQT)
- "Pinning": actively try to find alternative answers; if none, the clue is pinned (exactly one correct answer). Failing pinning → rewrite. (Jeopardy!)
- The giveaway (last clue) should be easiest and reward knowledge; never rely on wordplay/"sounds like"/"rhymes with." (NAQT)
- Lead-in must name the answer type immediately ("this book," "this author"). (NAQT)
- Clues must be substantial, not minutiae; genuine importance to the subject. (NAQT)
- Ban vague clues that fit many subjects. (NAQT)
- Screen for taste and repetition; dedupe overused subjects. (Jeopardy!)

## 4. Alternative-Correct-Answer Search
- Actively search for other defensible answers; trust the answer only once none is found. (Jeopardy!)
- Formal test: unsolvable unless the valid-answer set has size exactly 1. (arXiv)
- Re-mark to accept known alternates when multiple answers are genuinely valid, or disambiguate via added qualifiers. (Ben Swift, Jeopardy!)

## 5. Fact-Checking, Double-Sourcing & Hallucination Avoidance
- Separate writing from research — use a distinct verification pass/agent from the generator. (Jeopardy!, arXiv)
- Double-source every fact with reputable sources. (Jeopardy!)
- The LLM WILL assert false facts; independently verify every question. (Runaway Games, Wise Owl)
- Collect questions first, then request citations. (Wise Owl)
- Ground facts against a reference knowledge base, not the model's own confidence. (arXiv)
- Factual hallucination on trivia is modest but real — plan for the rare wrong answer. (Ben Swift)

## 6. Multi-Stage Generation, Verification & Solvability (arXiv 2601.14280)
- Reframes MCQ generation as optimization minimizing hallucination while maximizing validity/answerability/cost-efficiency.
- Four hallucination types: (1) inconsistency (explanation contradicts answer); (2) impossible/insolvable; (3) factual error; (4) mathematical error. Score each; minimize independently.
- MCQ = (question, choices, answer, explanation). Per-component checks: explanation must entail answer; exactly one valid answer; no fact absent from the reference KB; every terminal reasoning step equals the final answer.
- Iterative dual-agent (GAN-inspired) loop: a Generator produces the MCQ; a low-temperature Detector evaluates against the hallucination typology, identifies probable error types + sources, returns targeted feedback; Generator revises. Loop until all criteria pass.
- Why split roles: the Detector hallucinates less than the Generator (evaluation is lower-entropy than generation) — use a lower-temperature evaluation-only pass.
- Specialized detectors + dynamic routing + escalation to a stronger model for stubborn items.
- Termination: stop when hallucination falls below threshold OR improvement between iterations is negligible. Cap iterations (~3-7).
- Reported results: on a cheap model, hallucination drops ~50% after 1 iteration and >90% after 7, preserving educational value and style.
- Caveats: evaluated only on AP-STEM MCQs; math-oriented checks map imperfectly to non-STEM trivia; cross-domain generalization is future work (it is a preprint).
- Smaller-pipeline approximation: Generator → Detector → revise loop with a low-temperature checker; per-item checks for (a) explanation-entails-answer, (b) exactly-one-valid-answer, (c) each fact confirmed externally; cap iterations with early stopping; escalate stubborn items. **This repo implements this approximation in `verifyGeneratedQuestions`.**

## 7. Iterative Refinement & Prompting Patterns
- Treat it as a conversation, not one-shot; refine gradually. (Wise Owl)
- Push past obvious output ("less obvious questions, more interesting answers"). (Wise Owl)
- Beware over-tweaking ("iterating until you revert"); know when to stop or restart fresh. (Wise Owl)
- Name and reuse a preferred output format. (Runaway Games)
- Layer requirements incrementally (base → MC options → difficulty). (Runaway Games)
- A fresh conversation can beat continued edits. (Wise Owl)
- Self-critique via a detector prompt: identify probable error types + sources, feed back a targeted rewrite. (arXiv)

## 8. Ambiguity & Real-World Pitfalls (Ben Swift case study)
- Multiple-valid-answer questions are the recurring live failure — run the alternative-answer search before publishing. (Ben Swift)
- Difficulty misjudgment is the biggest observed problem; a single answer-visible estimate is unreliable. (Ben Swift)
- Build a challenge/fallback mechanism for residual errors (teams flag; verified after; correct challenge +1, false −1). Automation analogue: keep an audit/override path. (Ben Swift)
- Images/media can leak the answer — vet accompanying media. (Wise Owl)
- Vague/decorative clues frustrate solvers; reject outright. (NAQT)

---

## 9. Distilled Checklist

Apply to each generated question before accepting it:

1. Audience + difficulty stated (defined audience, target correct-rate ~50%).
2. Exactly one correct answer — search for alternates; reject if not "pinned."
3. Answer double-sourced / verifiable.
4. Explanation entails the answer (rationale supports, doesn't contradict).
5. Math/logic checks out.
6. Question is solvable (no missing info).
7. Distractors all verifiably wrong (none a second valid answer).
8. Distractors plausible, not filler.
9. No giveaways (clue/media doesn't reveal answer; reward knowledge not wordplay).
10. Clues uniquely identifying, not vague.
11. Pyramidal ordering where multi-clue (hardest first).
12. Clue substance (matters to the subject; no irrelevant minutiae).
13. Difficulty judged blind (without seeing the answer).
14. Not too obvious (interesting answers).
15. Not a repeat (subject not overused).
16. Answer accepts known alternates (list all acceptable if variants exist).
17. Verified by a separate low-temperature pass distinct from the generator.
18. Iterated with early stopping (cap ~3-7 cycles); escalate stubborn items.
