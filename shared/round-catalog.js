/**
 * Compact runtime round config consumed by generation and display.
 * Review prose lives in round-review.js.
 */
import { ROUND_DEFINITIONS } from './round-review.js';

/** @typedef {import('./round-review.js').RoundDefinition} RoundDefinition */

/** Legacy config consumed by generation and display. */
export const ROUND_TEMPLATES = Object.freeze(
  Object.fromEntries(
    ROUND_DEFINITIONS.map((definition) => {
      const {
        number, type, roundType, title, points,
        difficulty, useLLM, subTypes, instructions,
      } = definition;
      /** @type {Record<string, unknown>} */
      const template = {
        type,
        roundType,
        title,
        points,
        useLLM,
        instructions,
      };
      if (difficulty !== undefined) template.difficulty = difficulty;
      if (subTypes !== undefined) template.subTypes = subTypes;
      return [number, Object.freeze(template)];
    }),
  ),
);
