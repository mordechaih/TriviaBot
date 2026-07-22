/**
 * DOM-free feedback persistence parsing and Markdown report serialization.
 */

export const FEEDBACK_SCHEMA_VERSION = 1;

/**
 * @typedef {Object} FeedbackState
 * @property {number} schemaVersion
 * @property {string|null} updatedAt
 * @property {Record<string, string>} comments
 * @property {string} overall
 */

/** @returns {FeedbackState} */
export function createEmptyFeedback() {
  return {
    schemaVersion: FEEDBACK_SCHEMA_VERSION,
    updatedAt: null,
    comments: {},
    overall: '',
  };
}

/**
 * @param {string|null} raw
 * @returns {FeedbackState}
 */
export function parseFeedback(raw) {
  const empty = createEmptyFeedback();
  if (raw == null) return empty;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return empty;
  }

  if (!parsed || typeof parsed !== 'object') return empty;
  if (parsed.schemaVersion !== FEEDBACK_SCHEMA_VERSION) return empty;

  /** @type {Record<string, string>} */
  const comments = {};
  if (parsed.comments && typeof parsed.comments === 'object' && !Array.isArray(parsed.comments)) {
    for (const [key, value] of Object.entries(parsed.comments)) {
      const trimmedKey = String(key).trim();
      if (trimmedKey && typeof value === 'string') {
        comments[trimmedKey] = value;
      }
    }
  }

  return {
    schemaVersion: FEEDBACK_SCHEMA_VERSION,
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
    comments,
    overall: typeof parsed.overall === 'string' ? parsed.overall : '',
  };
}

/**
 * @param {string} comment
 * @returns {string[]}
 */
function quoteCommentLines(comment) {
  return comment.split('\n').map((line) => `> ${line}`);
}

/**
 * @param {import('../../shared/round-definitions.js').RoundDefinition} definition
 * @returns {string}
 */
function sectionHeading(definition) {
  if (definition.number != null) {
    return `Round ${definition.number}: ${definition.title}`;
  }
  return definition.title;
}

/**
 * @param {import('../../shared/round-definitions.js').RoundDefinition[]} definitions
 * @param {import('../../shared/round-definitions.js').RoundDefinition} finalDefinition
 * @param {FeedbackState} feedback
 * @param {string} generatedAt
 * @returns {string}
 */
export function buildRoundReviewReport(definitions, finalDefinition, feedback, generatedAt) {
  const lines = [
    '# TriviaBot Round Generation Review',
    '',
    `Generated: ${generatedAt}`,
    `Schema: ${FEEDBACK_SCHEMA_VERSION}`,
    '',
  ];

  for (const definition of [...definitions, finalDefinition]) {
    const comment = feedback.comments[definition.id]?.trim();
    if (!comment) continue;

    lines.push(`## ${sectionHeading(definition)}`);
    lines.push('');
    lines.push('### Current generation path');
    lines.push('');
    lines.push(definition.generation.summary);
    lines.push('');
    lines.push(`**Source and inputs:** ${definition.generation.source}`);
    lines.push(`**Selection:** ${definition.generation.selection}`);
    lines.push(`**Difficulty:** ${definition.generation.difficulty}`);
    lines.push(`**Grouping:** ${definition.generation.grouping}`);
    lines.push(`**LLM and fallback:** ${definition.generation.llm}`);
    lines.push(`**Filtering and reuse:** ${definition.generation.filtering}`);
    lines.push(`**Output:** ${definition.generation.output}`);
    lines.push('');
    lines.push('### Failure and exhaustion risks');
    lines.push('');
    for (const risk of definition.generation.risks) {
      lines.push(`- ${risk}`);
    }
    lines.push('');
    lines.push('### Implementation touchpoints');
    lines.push('');
    for (const touchpoint of definition.generation.touchpoints) {
      const symbols = touchpoint.symbols.map((symbol) => `\`${symbol}\``).join(', ');
      lines.push(`- \`${touchpoint.path}\` — ${symbols}`);
    }
    lines.push('');
    lines.push('### Requested generation change');
    lines.push('');
    lines.push(...quoteCommentLines(comment));
    lines.push('');
  }

  const overall = feedback.overall?.trim();
  if (overall) {
    lines.push('## Cross-round generation changes');
    lines.push('');
    lines.push(...quoteCommentLines(overall));
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}
