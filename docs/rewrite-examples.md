# J! Archive → pub question: rewrite examples

These 16 clues come from a random sample of the archive (2012–2015 games, 563k clues in total). Each one is either **rewritten** into a direct pub-style question or **rejected**. Every rewrite is re-rated for pub difficulty, because a clue's Jeopardy! dollar value doesn't track how hard it is in a pub.

I wrote these myself, following the rules the pipeline prompt would give the model. No API key was available, so the pipeline wasn't run.

## Rewrite rules
1. Write a direct question that ends in `?`. Nothing should depend on the category, so fold the category into the question when it matters.
2. Keep the original answer. Only clean it up: drop "a"/"the" and the parenthetical hints.
3. Add context only when it's widely known and the question needs it to stand alone.
4. **Reject** a clue if it is:
   - wordplay or a letter puzzle: "8-LETTER WORDS", quote-mark categories, rhymes
   - a pure vocabulary definition
   - dated news ("in July 2013 this CEO quit…")
   - too niche for a pub crowd
   - dependent on a picture or video the text can't replace

## Kept (11)

| # | J! clue (category, $) | Rewritten question | Answer | Diff. | Topic |
|---|---|---|---|---|---|
| 1 | '90s FILM QUOTES, $600 — "We're not worthy! We're not worthy!" | In what '90s comedy do two metalheads bow down chanting "We're not worthy! We're not worthy!"? | Wayne's World | Easy | Film |
| 2 | ALSO A ZODIAC SIGN, $200 — Ford has an SEL model of it | What Ford sedan shares its name with the zodiac sign of the bull? | Taurus | Easy | Cars |
| 3 | SOUNDS LIKE A CLASSIC ARCADE GAME, $200 — They can be near-earth, Trojan, or main-belt | Near-Earth, Trojan and main-belt are all types of what space rock, which also names a classic Atari arcade game? | Asteroid(s) | Easy | Science |
| 4 | IT'S ELEMENTAL!, $600 — This metal that's as strong as steel but 45% lighter is mentioned in a song by Sia & David Guetta | What metal, as strong as steel but about 45% lighter, is the title of a 2011 David Guetta hit featuring Sia? | Titanium | Easy | Science |
| 5 | IS THERE A TV DOCTOR IN THE HOUSE?, $400 — Sarah Chalke as Dr. Elliot Reid… | Sarah Chalke played Dr. Elliot Reid alongside J.D. and Turk on which 2000s hospital sitcom? | Scrubs | Easy | TV |
| 6 | EXPLORERS' NATIONALITIES, $400 — Vasco da Gama | What nationality was Vasco da Gama, the first European to reach India by sea? | Portuguese | Easy | History |
| 7 | TRAITORS & TURNCOATS, $1600 — In 1605 he filled a cellar below the House of Lords with explosives… | In 1605, who was caught in a cellar beneath the House of Lords guarding barrels of gunpowder meant to blow up Parliament? | Guy Fawkes | Medium | History |
| 8 | LAST IN THE NATIONAL LEAGUE, $1600 — In 2007 this team was dead last in the N.L. West, but in 2010 it won the World Series | Which MLB team finished dead last in the NL West in 2007, then won the World Series three years later? | San Francisco Giants | Medium | Sports |
| 9 | SECURITY, $2000 — …officially the Institute for Intelligence and Special Operations | What is the common name of Israel's national intelligence agency, officially the Institute for Intelligence and Special Operations? | Mossad | Medium | World |
| 10 | 1850s AMERICA, $1600 — *(Clue Crew map on screen)* …flatter land for the railroad was purchased from Mexico by this U.S. minister | The 1853 purchase of land from Mexico to build a southern railroad route is named after which U.S. minister? | (James) Gadsden | Hard | History |
| 11 | QUOTABLE PLAYS, $2000 — "Sir Thomas More, is there anything you wish to say to me concerning the king's marriage with Queen Anne?" | Which Robert Bolt play, later a Best Picture winner, dramatizes Sir Thomas More's refusal to bless Henry VIII's marriage to Anne Boleyn? | A Man for All Seasons | Hard | Theater (Final candidate) |

Notes:
- **#2 and #3** only worked in Jeopardy! because of their category. The rewrite moves the category into the question.
- **#10** was a video clue, but its text was enough to keep.
- **#7** was a $1600 clue but is easy-to-medium in a pub. Most of the archive's value is in clues like this one.

## Rejected (5)

| J! clue (category) | Answer | Why |
|---|---|---|
| INSTRUMENT-ATION — Sawyer Sawyer, Thumb Thumb or Brokaw Brokaw | a Tom Tom | Wordplay |
| 8-LETTER WORDS — A light-giving celestial body, or someone eminent in his or her field | luminary | Vocabulary |
| "A", BABY! — To refrain from boozing or voting | abstain | Vocabulary or letter puzzle |
| THE NEW YORK TIMES BUSINESS — An Oct. 3, 2011 TimesCast covered White House emails about this solar energy co.… | Solyndra | Dated news, too niche |
| RACHEL — This Aussie actress went American to play Sarah Walker on "Brothers and Sisters" | Rachel Griffiths | Too niche, and needs the category |

## Yield
I sorted the first 45 clues of the random sample by eye. About a third would be rejected, mostly as wordplay, vocabulary or dated news. Even at 10% yield, 563k clues gives far more than the ~20 standard questions a game uses, so the pipeline never has to process the whole archive:

1. Pre-filter cheaply in code: skip video clues, quote-mark categories, and "LETTER"/"RHYME" categories.
2. Rewrite a batch of about 50.
3. Send the rewrites to the review queue, where you approve or reject each one.
