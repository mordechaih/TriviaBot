/**
 * Canonical round config plus a reviewable description of the real weekly
 * generation pipeline. Generation metadata is descriptive only; ROUND_TEMPLATES
 * remains the config consumed by the generator and game display.
 */
import { SUBTYPES, SUBTYPE_LABELS } from './round-subtypes.js';

/**
 * @typedef {Object} GenerationStep
 * @property {string} label
 * @property {string} text
 */

/**
 * @typedef {Object} CodeTouchpoint
 * @property {string} path
 * @property {string[]} symbols
 */

/**
 * @typedef {Object} GenerationReview
 * @property {string} summary
 * @property {GenerationStep[]} flow
 * @property {string} source
 * @property {string} selection
 * @property {string} difficulty
 * @property {string} grouping
 * @property {string} llm
 * @property {string} filtering
 * @property {string} output
 * @property {string[]} risks
 * @property {CodeTouchpoint[]} touchpoints
 */

/**
 * @typedef {Object} RoundDefinition
 * @property {string} id
 * @property {number|null} number
 * @property {string} type
 * @property {string} roundType
 * @property {string} title
 * @property {number|string} points
 * @property {string} [difficulty]
 * @property {boolean} useLLM
 * @property {string[]} [subTypes]
 * @property {string} instructions
 * @property {GenerationReview} generation
 */

const MAIN_ARCHIVE_SOURCE = [
  '`data/archive-backup.json` supplies J! Archive clues.',
  'Used IDs are merged from `data/used-questions.json` and `data/used-questions-ui.json`;',
  'bans are merged from `data/banned-questions.json` and `data/banned-questions-ui.json`.',
].join(' ');

const MAIN_ARCHIVE_FILTERING = [
  '`selectQuestions()` removes used and banned clues, Final Jeopardy, incomplete clues,',
  'and Before & After categories. With OpenAI, it stratifies at most 200 clues',
  '(100 with `FAST_GENERATION=1`) before suitability checks and caches decisions in',
  '`data/disqualify-cache.json`. Reuse is determined by the merged used-question ledgers.',
].join(' ');

const MAIN_ARCHIVE_LLM = [
  '`gpt-4o-mini` is used only to disqualify context-dependent clues and rewrite some accepted clues;',
  'it does not create the archive questions. Without an API key, basic pattern checks run instead.',
  'A suitability API error fails open and preserves the clue.',
].join(' ');

const STANDARD_TOUCHPOINTS = Object.freeze([
  Object.freeze({
    path: 'scripts/generate-game.js',
    symbols: Object.freeze([
      'selectQuestions()',
      'calculateDifficulty()',
      'getDifficultyLevel()',
      'filterQuestionsWithLLM()',
      'generateGame()',
    ]),
  }),
  Object.freeze({
    path: 'data/archive-backup.json',
    symbols: Object.freeze(['archive clue records']),
  }),
  Object.freeze({
    path: 'data/disqualify-cache.json',
    symbols: Object.freeze(['cached suitability decisions']),
  }),
]);

function freezeGeneration(generation) {
  return Object.freeze({
    ...generation,
    flow: Object.freeze(
      generation.flow.map((step) => Object.freeze({ ...step })),
    ),
    risks: Object.freeze([...generation.risks]),
    touchpoints: Object.freeze(
      generation.touchpoints.map((touchpoint) => Object.freeze({
        path: touchpoint.path,
        symbols: Object.freeze([...touchpoint.symbols]),
      })),
    ),
  });
}

function freezeOverviewStep(step) {
  return Object.freeze({
    ...step,
    files: Object.freeze([...(step.files || [])]),
  });
}

function freezeOverviewLane(lane) {
  return Object.freeze({
    ...lane,
    steps: Object.freeze(lane.steps.map(freezeOverviewStep)),
  });
}

/**
 * Shared, descriptive data for the overall generation-flow diagram.
 * Runtime behavior remains in scripts/generate-game.js.
 */
export const GENERATION_FLOW_DEFINITION = Object.freeze({
  id: 'generation-overview',
  title: 'Overall generation flow',
  description: [
    '`generateGame()` prepares one shared archive selection, builds specialized replacements through separate lanes,',
    'then converges them into the game and tracking artifacts.',
  ].join(' '),
  intake: freezeOverviewStep({
    label: 'Shared intake',
    title: 'Load source data and reuse ledgers',
    text: [
      'Read `data/archive-backup.json` and merge used IDs from the main and UI used-question files.',
      'Archive and curated selectors exclude IDs found in either used-question ledger;',
      'themed LLM paths use matching prefixed IDs as prompt-level exclusions.',
      'The selectors that follow also load merged bans, recent game history, the disqualification cache,',
      'and specialized pools when needed.',
    ].join(' '),
    files: [
      'data/archive-backup.json',
      'data/used-questions.json + used-questions-ui.json',
      'data/banned-questions.json + banned-questions-ui.json',
      'data/disqualify-cache.json',
    ],
  }),
  lanes: Object.freeze([
    freezeOverviewLane({
      id: 'archive-lane',
      label: 'Archive lane',
      scope: 'Rounds 1, 3, 6, 8 + Final Trivia',
      steps: [
        {
          title: 'Filter main and Final candidates',
          text: [
            'The main pool removes used and banned clues, Final Jeopardy, incomplete clues, and Before & After categories.',
            'With OpenAI, the main and Final pools are sampled to configured caps before both run the cached suitability/rewrite pass in parallel;',
            'the Final pool starts without the ban check.',
          ].join(' '),
          files: ['selectQuestions()', 'filterQuestionsWithLLM()'],
        },
        {
          title: 'Reserve 24 archive slots + one Final',
          text: [
            'Select 24 generic clues using difficulty and game/category preferences.',
            'Rounds 1, 3, and 8 keep slots 0–2, 6–8, and 21–23;',
            'one accepted Final Jeopardy clue is selected separately.',
          ].join(' '),
          files: ['R1 · easy', 'R3 · medium', 'R8 · hard', 'Final Jeopardy'],
        },
        {
          title: 'Build Round 6 from a second scan',
          text: [
            '`ENTERTAINMENT_KEYWORDS` scans the raw archive again, removes used and banned matches,',
            'shuffles, takes three, and replaces reserved slots 15–17.',
          ].join(' '),
          files: ['filterEntertainment()', 'selectEntertainmentQuestions()'],
        },
      ],
    }),
    freezeOverviewLane({
      id: 'list-lane',
      label: 'Curated list lane',
      scope: 'Round 4',
      steps: [
        {
          title: 'Load the special list source',
          text: [
            'Read `data/list-round-questions.json` and keep records with a clue and at least two answers.',
          ].join(' '),
          files: ['data/list-round-questions.json'],
        },
        {
          title: 'Choose the Round 4 replacement',
          text: [
            'Exclude used `list:<clue>` IDs and matching banned records, then choose one record at random.',
            'Its reserved archive slots 9–11 are removed from used tracking.',
          ].join(' '),
          files: ['selectListRoundQuestion()'],
        },
      ],
    }),
    freezeOverviewLane({
      id: 'themed-lane',
      label: 'Themed generation lane',
      scope: 'Rounds 2, 5, 7',
      steps: [
        {
          title: 'Choose subtype history where relevant',
          text: [
            'Rounds 5 and 7 scan up to eight recent game files and prefer a subtype not seen in that window.',
            'Round 2 has no subtype.',
          ].join(' '),
          files: ['getRecentlyUsedSubTypes()', 'data/games/game-*.json'],
        },
        {
          title: 'Generate Rounds 2, 5, and 7 in parallel',
          text: [
            'When OpenAI is configured, `Promise.all()` starts all three paths together.',
            'Missing or failed themed output cannot fall back to the reserved generic archive clues.',
          ].join(' '),
          files: ['generateLLMRound()', 'gpt-4o-mini'],
        },
        {
          title: 'Route LLM and pool sources',
          text: [
            'Round 2 uses its numeric prompt and round-2 few-shot examples.',
            'Round 5 uses the Family Feud pool or a subtype prompt with round-5 examples;',
            'an empty Family Feud pool switches to To Tell the Truth.',
            'Round 7 uses subtype prompts and round-7 few-shot examples.',
            'Other themed pool files are append destinations, not generation fallbacks.',
          ].join(' '),
          files: [
            'data/llm-train/round{2,5,7}.jsonl',
            'data/family-feud-questions.json',
          ],
        },
      ],
    }),
  ]),
  assembly: freezeOverviewStep({
    label: 'Converge',
    title: 'Assemble 8 rounds + Final Trivia',
    text: [
      'Keep archive selections for rounds 1, 3, and 8; insert the generated or curated results for rounds 2, 4, 5, 6, and 7;',
      'then attach the selected Final Trivia record.',
    ].join(' '),
    files: ['generateGame()', 'ROUND_TEMPLATES'],
  }),
  output: freezeOverviewStep({
    label: 'Persist',
    title: 'Write the game and reserve question IDs',
    text: [
      'Write `data/games/game-YYYY-MM-DD.json`, then immediately reserve every emitted archive, curated, and generated question ID',
      'in the updated `data/used-questions.json`,',
      'then append newly generated Round 2, non-Family-Feud Round 5, and Round 7 content to themed pool JSON files.',
      'The games index is updated by a separate script outside `generate-game.js`.',
    ].join(' '),
    files: [
      'data/games/game-YYYY-MM-DD.json',
      'data/used-questions.json',
      'appendThemedPools()',
    ],
  }),
});

function standardArchiveGeneration({
  roundNumber,
  slice,
  targetDifficulty,
  difficultyNote,
}) {
  return freezeGeneration({
    summary: `Uses positions ${slice} from the shared 24-clue archive selection without a later themed-round replacement.`,
    flow: [
      { label: 'Load', text: 'Archive + used and banned tracking files' },
      { label: 'Filter', text: 'Static exclusions, then cached suitability review' },
      { label: 'Select', text: `${targetDifficulty} target; prefer one game and category` },
      { label: 'Emit', text: 'Three clue / answer / category objects' },
    ],
    source: MAIN_ARCHIVE_SOURCE,
    selection: [
      '`selectQuestions()` creates all 24 generic slots before any themed rounds are replaced.',
      `Round ${roundNumber} receives selected archive positions ${slice}.`,
      'Candidates prefer a category containing three target-difficulty clues, a category not already used, and a game not already used.',
    ].join(' '),
    difficulty: difficultyNote,
    grouping: [
      'The normal path selects three clues from the same game and category.',
      'Adjacent difficulty levels may fill a short category; the global-pool fallback can mix games and categories.',
    ].join(' '),
    llm: MAIN_ARCHIVE_LLM,
    filtering: MAIN_ARCHIVE_FILTERING,
    output: [
      'Exactly three objects with `clue`, `answer`, `category`, and `isBanned: false`',
      `are written to \`rounds[${roundNumber - 1}].questions\`.`,
      'Their `clue|answer` IDs are reserved in used-question tracking during generation.',
    ].join(' '),
    risks: [
      'Generation stops when the filtered main pool has fewer than 24 clues.',
      'A category shortage can weaken the requested difficulty or same-category grouping through fallback selection.',
      'Cached or fail-open suitability decisions can preserve a clue that should have been rejected.',
    ],
    touchpoints: STANDARD_TOUCHPOINTS,
  });
}

/** @type {RoundDefinition[]} */
export const ROUND_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'round-1',
    number: 1,
    type: 'standard',
    roundType: 'get-your-feet-wet',
    title: 'Get Your Feet Wet',
    points: 2,
    difficulty: 'easy',
    useLLM: false,
    instructions: 'Generally VERY easy questions to ease into the game.',
    generation: standardArchiveGeneration({
      roundNumber: 1,
      slice: '0–2',
      targetDifficulty: 'easy',
      difficultyNote: [
        'The actual selector target is easy. `calculateDifficulty()` maps J! round and dollar value',
        'to a 0–100 score; `getDifficultyLevel()` treats scores below 12 as easy',
        '(normally Jeopardy $200–$600 clues).',
      ].join(' '),
    }),
  }),
  Object.freeze({
    id: 'round-2',
    number: 2,
    type: 'over-under',
    roundType: 'over-under',
    title: 'Over/Under',
    points: 3,
    useLLM: true,
    instructions: 'Numeric guessing questions. Pick a number close to the actual answer.',
    generation: freezeGeneration({
      summary: 'Generates three numeric questions live with OpenAI and replaces a previously reserved archive slice.',
      flow: [
        { label: 'Examples', text: 'Load numeric examples from round2 JSONL' },
        { label: 'Prompt', text: 'Add used-clue avoidance + difficulty guidance' },
        { label: 'Generate', text: 'Request JSON from gpt-4o-mini' },
        { label: 'Normalize', text: 'Validate count, derive Over/Under, emit three' },
      ],
      source: [
        'The live source is the OpenAI prompt in `generateOverUnderRound()`.',
        '`data/llm-train/round2.jsonl` supplies up to three random numeric few-shot examples through `buildFewShotBlock()`.',
        '`data/over-under-questions.json` is appended after success but is not read as an initial-generation fallback.',
      ].join(' '),
      selection: [
        'Used IDs beginning `over-under:` are converted into a do-not-repeat prompt section.',
        'The model must return at least three records; the generator keeps the first three.',
        'The shared archive selector still reserves positions 3–5 before this replacement.',
      ].join(' '),
      difficulty: [
        'Difficulty is prompt-calibrated rather than archive-value-calibrated.',
        'The shared system prompt targets facts known by roughly 30–50% of a bar crowd;',
        'the round prompt asks for debatable, estimable numbers and a target within 10–20% of the actual value.',
        'Those constraints are not validated after generation.',
      ].join(' '),
      grouping: 'No category grouping or subtype selection applies; the three generated topics may be unrelated.',
      llm: [
        '`gpt-4o-mini` receives the shared trivia-generator system role plus the Over/Under user prompt,',
        'few-shot examples, JSON-object response mode, and temperature 0.7.',
        'Missing examples degrade to an empty few-shot block. Missing OpenAI, API/JSON errors, or fewer than three items return null.',
      ].join(' '),
      filtering: [
        'Used generated clues are prompt-level exclusions only.',
        'Banned-question files and the disqualification cache are not applied to model output.',
        'On success, IDs are stored as `over-under:<clue>|<answer>`.',
      ].join(' '),
      output: [
        'Exactly three objects: `clue`, string `answer`, numeric `actualNumber`, numeric `targetNumber`,',
        'derived `overOrUnder`, and `isBanned: false`; round `subType` is null.',
      ].join(' '),
      risks: [
        'There is no generic archive or pool fallback: missing/failed LLM output makes `generateGame()` reject the themed round.',
        'Target distance, numeric validity, topic variety, and duplicate similarity are trusted to the model.',
        'The three replaced archive IDs remain marked used even though those archive clues are not emitted.',
      ],
      touchpoints: [
        {
          path: 'scripts/generate-game.js',
          symbols: ['generateOverUnderRound()', 'generateLLMRound()', 'generateGame()'],
        },
        {
          path: 'scripts/lib/few-shot-examples.js',
          symbols: ['buildFewShotBlock()', 'selectExamples()'],
        },
        {
          path: 'data/llm-train/round2.jsonl',
          symbols: ['round 2 few-shot records'],
        },
        {
          path: 'data/over-under-questions.json',
          symbols: ['append-only generated-question pool'],
        },
      ],
    }),
  }),
  Object.freeze({
    id: 'round-3',
    number: 3,
    type: 'standard',
    roundType: 'trifecta-trivia',
    title: 'Trifecta Trivia',
    points: 3,
    difficulty: 'easy',
    useLLM: false,
    instructions: 'First "trivia in earnest" round. Still easy questions.',
    generation: standardArchiveGeneration({
      roundNumber: 3,
      slice: '6–8',
      targetDifficulty: 'medium',
      difficultyNote: [
        'The actual selector target is medium (scores from 12 up to but not including 45),',
        'even though `ROUND_TEMPLATES[3].difficulty` and its instructions say easy.',
        'The emitted round receives the selector-produced `medium` difficulty value.',
      ].join(' '),
    }),
  }),
  Object.freeze({
    id: 'round-4',
    number: 4,
    type: 'list',
    roundType: 'list-round',
    title: 'The List Round',
    points: 'variable',
    useLLM: false,
    instructions: 'One question with multiple answers. 1 point per correct answer.',
    generation: freezeGeneration({
      summary: 'Selects one curated multi-answer record and replaces the fourth generic archive slice.',
      flow: [
        { label: 'Load', text: 'Read and validate the list-round JSON pool' },
        { label: 'Exclude', text: 'Remove used list IDs and matching bans' },
        { label: 'Select', text: 'Choose one remaining record at random' },
        { label: 'Emit', text: 'Write one clue with answers + pointsAvailable' },
      ],
      source: [
        '`data/list-round-questions.json` is the real content source.',
        'Only records with a clue and at least two entries in `answers` survive `loadListRoundQuestions()`.',
      ].join(' '),
      selection: [
        '`selectListRoundQuestion()` removes `list:<clue>` IDs already in used tracking and list-specific matches from merged ban files,',
        'then chooses one available record with `Math.random()`.',
        'The generic archive positions 9–11 were selected first but their IDs are explicitly removed from the used set after replacement.',
      ].join(' '),
      difficulty: [
        'The list content is not difficulty-scored or calibrated.',
        'The round still receives `medium` from the discarded generic round-4 archive slot.',
      ].join(' '),
      grouping: 'One pool record defines the complete round; archive category and same-category logic do not apply to its answers.',
      llm: 'No LLM is used to create, filter, rewrite, or fall back from the list-round record.',
      filtering: [
        'List records use `list:<clue>` for reuse tracking and check the merged main/UI ban files.',
        'The archive disqualification cache and suitability prompt are not applied.',
      ].join(' '),
      output: 'One question object with `clue`, `answers`, `pointsAvailable: answers.length`, and `isBanned: false`.',
      risks: [
        'Generation stops when every valid list record is used or banned.',
        'The full 24-clue archive selection must still succeed before this one-record replacement is attempted.',
        'No automated difficulty or answer-quality validation exists for the curated pool.',
      ],
      touchpoints: [
        {
          path: 'scripts/generate-game.js',
          symbols: ['loadListRoundQuestions()', 'selectListRoundQuestion()', 'generateGame()'],
        },
        {
          path: 'data/list-round-questions.json',
          symbols: ['questions[].clue', 'questions[].answers'],
        },
      ],
    }),
  }),
  Object.freeze({
    id: 'round-5',
    number: 5,
    type: 'game-show-style',
    roundType: 'game-show-style',
    title: 'Game Show Style',
    points: 4,
    useLLM: true,
    subTypes: SUBTYPES[5],
    instructions: 'Varies weekly: True/False, Name That Tune, Multiple Choice, or Family Feud.',
    generation: freezeGeneration({
      summary: 'Avoids recently used formats, then uses either the Family Feud pool or a subtype-specific OpenAI prompt.',
      flow: [
        { label: 'Choose subtype', text: 'Avoid formats found in recent generated games' },
        { label: 'Load context', text: 'Family Feud pool or matching round5 examples' },
        { label: 'Produce', text: 'Pool selection or gpt-4o-mini JSON response' },
        { label: 'Emit', text: 'One Family Feud item or model-returned questions' },
      ],
      source: [
        '`scripts/lib/round-subtypes.js` defines four subtypes.',
        '`data/games/game-*.json` provides recent subtype history.',
        'Family Feud reads `data/family-feud-questions.json`; other subtypes are generated from prompts plus matching records in',
        '`data/llm-train/round5.jsonl`. Non-Family-Feud JSON pools receive appended output but are not initial-generation sources.',
      ].join(' '),
      selection: [
        'Recent subtype avoidance scans up to eight prior games, excluding the game being regenerated.',
        'A random subtype not present in that history is preferred; when all are recent, all four become eligible.',
        'Family Feud randomly selects an entry whose `ff:<id>` is not used; an empty pool changes the subtype to To Tell the Truth.',
      ].join(' '),
      difficulty: [
        'LLM formats use the shared 30–50% familiarity target plus subtype-specific guidance;',
        'Millionaire explicitly requests hard late-show questions, while Family Feud has no difficulty calibration.',
        'The round-level `difficulty` field remains `medium` from its discarded generic archive slot.',
      ].join(' '),
      grouping: [
        'All questions share one chosen subtype. No archive category grouping applies.',
        'The Name That Sports Team same-league rule belongs to round 7, not this round.',
      ].join(' '),
      llm: [
        'Family Feud uses the JSON pool without an LLM when an entry is available.',
        'To Tell the Truth, Name That Tune, and Millionaire use `gpt-4o-mini`, JSON-object mode, temperature 0.8,',
        'the shared system role, subtype prompt, used-clue avoidance, and up to three exact-subtype few-shot examples.',
        'Family Feud exhaustion falls back to the To Tell the Truth LLM path.',
        'However, `generateGame()` gates all round 2/5/7 pre-generation on an available OpenAI client, including the pool-backed Family Feud path.',
      ].join(' '),
      filtering: [
        'Generated-clue reuse is sent to the prompt using `game-show:<subtype>:` IDs.',
        'Model output is not checked against bans or the disqualification cache.',
        'Family Feud lookup expects `ff:<id>` IDs, but emitted questions drop that ID and `generateGame()` records a game-show-prefixed ID instead.',
      ].join(' '),
      output: [
        'Family Feud emits one question with `clue`, top-answer `answer`, `topAnswers`, and `isBanned: false`.',
        'Other subtypes request three questions but the returned array length is not validated;',
        'fields vary by subtype (`explanation`, `options`, or `correctAnswer`).',
      ].join(' '),
      risks: [
        'Without OpenAI, initial game generation stops at round 2; the pool-backed Family Feud function is never reached by `generateGame()`.',
        'The Family Feud ID-prefix mismatch can allow the same pool record to be selected again.',
        'The three replaced generic archive IDs remain marked used although they are not emitted.',
        'Malformed or short model arrays can produce fewer than three questions because no count validation runs.',
      ],
      touchpoints: [
        {
          path: 'scripts/generate-game.js',
          symbols: [
            'getRecentlyUsedSubTypes()',
            'generateLLMRound()',
            'generateGameShowStyleRound()',
            'selectFamilyFeudQuestion()',
            'appendThemedPools()',
            'generateGame()',
          ],
        },
        {
          path: 'scripts/lib/round-subtypes.js',
          symbols: ['SUBTYPES[5]', 'SUBTYPE_LABELS'],
        },
        {
          path: 'scripts/lib/few-shot-examples.js',
          symbols: ['buildFewShotBlock(5)', 'selectExamples()'],
        },
        {
          path: 'data/llm-train/round5.jsonl',
          symbols: ['sub_type-filtered few-shot records'],
        },
        {
          path: 'data/family-feud-questions.json',
          symbols: ['questions[].id', 'questions[].topAnswers'],
        },
      ],
    }),
  }),
  Object.freeze({
    id: 'round-6',
    number: 6,
    type: 'entertainment',
    roundType: 'entertainment-trivia',
    title: 'Entertainment Trivia',
    points: 4,
    difficulty: 'medium',
    useLLM: false,
    instructions: 'Movies, music, and TV from 1980s onward. Books can be older (early 1900s).',
    generation: freezeGeneration({
      summary: 'Runs a second, direct keyword selection over the raw archive and replaces the sixth generic archive slice.',
      flow: [
        { label: 'Scan archive', text: 'Match entertainment terms in category or clue' },
        { label: 'Exclude', text: 'Remove used and banned matches' },
        { label: 'Shuffle', text: 'Randomize the complete matching pool' },
        { label: 'Emit', text: 'Take the first three matches' },
      ],
      source: [
        '`data/archive-backup.json` is scanned again by `filterEntertainment()`.',
        '`ENTERTAINMENT_KEYWORDS` covers movies, television, music, performers, awards, streaming, Broadway, and related terms;',
        'the documented books/date guidance is not represented in the keyword list.',
      ].join(' '),
      selection: [
        '`selectEntertainmentQuestions()` matches a keyword in lowercase category or clue, excludes merged used IDs and bans,',
        'Fisher–Yates shuffles with `Math.random()`, and takes three.',
        'Generic archive positions 15–17 are explicitly removed from used tracking after replacement.',
      ].join(' '),
      difficulty: [
        'Selected entertainment clues are not scored or calibrated.',
        'The round receives `medium` from the discarded generic archive slot regardless of the chosen clues.',
      ].join(' '),
      grouping: 'This direct selector does not enforce a same-category or same-game group; all three questions may come from different sources.',
      llm: [
        'No LLM creates or reviews the entertainment selection.',
        'Unlike the common archive path, this second raw-archive pass does not call `filterQuestionsWithLLM()`.',
      ].join(' '),
      filtering: [
        '`ENTERTAINMENT_KEYWORDS`, merged used IDs, and merged ban files are the only filters.',
        'Incomplete-clue, Before & After, disqualification-cache, and rewrite checks from the common archive pipeline are not repeated here.',
      ].join(' '),
      output: 'Exactly three objects with `clue`, `answer`, `category`, and `isBanned: false`.',
      risks: [
        'Generation stops when fewer than three unused, non-banned keyword matches remain.',
        'Broad substring matching can admit false positives, while missing book terms contradict the documented scope.',
        'Bypassing common suitability and grouping logic can emit broken/context-dependent clues or an uneven difficulty mix.',
      ],
      touchpoints: [
        {
          path: 'scripts/generate-game.js',
          symbols: ['ENTERTAINMENT_KEYWORDS', 'filterEntertainment()', 'selectEntertainmentQuestions()', 'generateGame()'],
        },
        {
          path: 'data/archive-backup.json',
          symbols: ['category', 'clue', 'answer'],
        },
      ],
    }),
  }),
  Object.freeze({
    id: 'round-7',
    number: 7,
    type: 'mixing-things-up',
    roundType: 'mixing-things-up',
    title: 'Mixing Things Up',
    points: 5,
    useLLM: true,
    subTypes: SUBTYPES[7],
    instructions: 'Varies weekly: Who Am I, Size Matters, Name That Brand, or Sports Team.',
    generation: freezeGeneration({
      summary: 'Avoids recently used formats and generates a subtype-specific question set live with OpenAI.',
      flow: [
        { label: 'Choose subtype', text: 'Avoid formats found in recent generated games' },
        { label: 'Load examples', text: 'Filter round7 JSONL to that exact subtype' },
        { label: 'Generate', text: 'Request subtype-shaped JSON from gpt-4o-mini' },
        { label: 'Emit', text: 'Preserve subtype-specific fields from the response' },
      ],
      source: [
        '`scripts/lib/round-subtypes.js` defines four subtypes and `data/games/game-*.json` supplies recent history.',
        'The live source is the matching user prompt plus up to three records of that subtype from `data/llm-train/round7.jsonl`.',
        'Subtype JSON pool files are append destinations and browser replacement sources, not initial weekly-generation fallbacks.',
      ].join(' '),
      selection: [
        'Recent subtype avoidance scans up to eight prior games and prefers a random subtype absent from that history;',
        'if every subtype appears, the full subtype list is reused.',
        'Used `mixing:<subtype>:` clues become a do-not-repeat prompt section.',
      ].join(' '),
      difficulty: [
        'Difficulty is controlled by the shared 30–50% familiarity system prompt and subtype-specific examples, not archive values.',
        'No response-level difficulty check runs. The round-level field is `medium` from its discarded generic slot.',
      ].join(' '),
      grouping: [
        'All output shares one subtype.',
        'Name That Sports Team asks the model to keep all three in one league;',
        'other subtypes request their own internal shape, but none of these grouping rules are validated.',
      ].join(' '),
      llm: [
        '`gpt-4o-mini` receives JSON-object mode, temperature 0.8, the shared system role,',
        'one of four subtype prompts, used-clue avoidance, and exact-subtype few-shot examples.',
        'Missing examples are allowed; missing OpenAI or API/JSON errors return null with no pool fallback.',
      ].join(' '),
      filtering: [
        'Reuse protection is prompt-only and keyed by `mixing:<subtype>:<clue>|<answer>`.',
        'Banned-question files and disqualification-cache checks are not applied to generated output.',
      ].join(' '),
      output: [
        'The prompt requests three objects with `clue` and `answer`; Size Matters may include `details`,',
        'and Sports Team may include `league`. The returned array length is not validated.',
      ].join(' '),
      risks: [
        'Missing or failed OpenAI output stops game generation; specialized pool files are not used as fallback.',
        'The three replaced generic archive IDs remain marked used although they are not emitted.',
        'Subtype grouping, count, factual accuracy, and near-duplicate avoidance rely on model compliance.',
      ],
      touchpoints: [
        {
          path: 'scripts/generate-game.js',
          symbols: [
            'getRecentlyUsedSubTypes()',
            'generateLLMRound()',
            'generateMixingThingsUpRound()',
            'appendThemedPools()',
            'generateGame()',
          ],
        },
        {
          path: 'scripts/lib/round-subtypes.js',
          symbols: ['SUBTYPES[7]', 'SUBTYPE_LABELS'],
        },
        {
          path: 'scripts/lib/few-shot-examples.js',
          symbols: ['buildFewShotBlock(7)', 'selectExamples()'],
        },
        {
          path: 'data/llm-train/round7.jsonl',
          symbols: ['sub_type-filtered few-shot records'],
        },
      ],
    }),
  }),
  Object.freeze({
    id: 'round-8',
    number: 8,
    type: 'standard',
    roundType: 'game-changer',
    title: 'Game Changer Round',
    points: 6,
    difficulty: 'medium',
    useLLM: false,
    instructions: 'Medium difficulty standard questions. No shared theme.',
    generation: standardArchiveGeneration({
      roundNumber: 8,
      slice: '21–23',
      targetDifficulty: 'hard',
      difficultyNote: [
        'The actual selector target is hard (scores from 45 up to but not including 60),',
        'even though `ROUND_TEMPLATES[8].difficulty` and its instructions say medium.',
        'The emitted round receives the selector-produced `hard` difficulty value.',
      ].join(' '),
    }),
  }),
]);

/** @type {RoundDefinition & { id: 'final-trivia', number: null }} */
export const FINAL_TRIVIA_DEFINITION = Object.freeze({
  id: 'final-trivia',
  number: null,
  type: 'final',
  roundType: 'final-trivia',
  title: 'Final Trivia',
  points: 'wager',
  useLLM: false,
  instructions: 'One Final Jeopardy-style closing question. Teams may wager points.',
  generation: freezeGeneration({
    summary: 'Selects one unused Final Jeopardy archive clue after a separate cached suitability pass.',
    flow: [
      { label: 'Load', text: 'Take Final Jeopardy records from the archive' },
      { label: 'Sample', text: 'Cap at 50 candidates when OpenAI is active' },
      { label: 'Review', text: 'Run cached suitability and optional rewrite' },
      { label: 'Emit', text: 'Choose one accepted final at random' },
    ],
    source: [
      '`data/archive-backup.json` records whose `round` equals `Final Jeopardy`.',
      'Used IDs come from merged main/UI used-question files; suitability decisions share `data/disqualify-cache.json`.',
    ].join(' '),
    selection: [
      '`selectQuestions()` creates the Final Jeopardy pool separately from the 24 main clues,',
      'excludes used IDs, optionally random-samples 50 candidates (25 with `FAST_GENERATION=1`) when OpenAI is active,',
      'then randomly chooses one accepted record.',
    ].join(' '),
    difficulty: [
      'No difficulty score or calibration is used for final selection.',
      '`calculateDifficulty()` defines Final Jeopardy as score 80, but that function is not called on the final pool.',
    ].join(' '),
    grouping: 'One archive record supplies category, clue, and answer; no category grouping or cross-round category check applies.',
    llm: [
      '`gpt-4o-mini` may disqualify or rewrite the archive clue using the same suitability prompt as the main pool;',
      'it does not generate the final. Without OpenAI, basic pattern checks run.',
      'Suitability API errors fail open.',
    ].join(' '),
    filtering: [
      'Used-question IDs and cached suitability are checked.',
      'The banned-question files are not checked when building the Final Jeopardy pool;',
      'incomplete and Before & After checks occur only through the suitability pass, not the initial filter.',
    ].join(' '),
    output: '`finalTrivia` contains `category`, renamed `question` from the selected clue, `answer`, and `isBanned: false`.',
    risks: [
      'Generation stops when no Final Jeopardy record survives.',
      'A banned final can be selected because ban files are omitted from this pool.',
      'Cached or fail-open suitability can preserve an unsuitable final clue.',
    ],
    touchpoints: [
      {
        path: 'scripts/generate-game.js',
        symbols: ['selectQuestions()', 'filterQuestionsWithLLM()', 'shouldDisqualifyQuestion()', 'rewriteQuestion()', 'generateGame()'],
      },
      {
        path: 'data/archive-backup.json',
        symbols: ['Final Jeopardy records'],
      },
      {
        path: 'data/disqualify-cache.json',
        symbols: ['cached final-clue suitability decisions'],
      },
    ],
  }),
});

export { SUBTYPE_LABELS };
