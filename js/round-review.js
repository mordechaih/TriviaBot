import {
  FINAL_TRIVIA_DEFINITION,
  GENERATION_FLOW_DEFINITION,
  ROUND_DEFINITIONS,
  SUBTYPE_LABELS,
} from '../shared/round-definitions.js';
import {
  FEEDBACK_SCHEMA_VERSION,
  buildRoundReviewReport,
  createEmptyFeedback,
  parseFeedback,
} from './lib/round-feedback.js';

const STORAGE_KEY = 'triviabot-round-structure-feedback-v1';
const SAVE_DEBOUNCE_MS = 100;

/** @type {import('./lib/round-feedback.js').FeedbackState} */
let feedbackState = createEmptyFeedback();
/** @type {string|null} */
let currentReport = null;
/** @type {ReturnType<typeof setTimeout>|null} */
let saveTimeout = null;

const sectionNavList = document.getElementById('section-nav-list');
const generationFlow = document.getElementById('generation-flow');
const roundGuide = document.getElementById('round-guide');
const overallNotes = /** @type {HTMLTextAreaElement} */ (document.getElementById('overall-notes'));
const generateReportBtn = document.getElementById('generate-report-btn');
const copyReportBtn = document.getElementById('copy-report-btn');
const downloadReportBtn = document.getElementById('download-report-btn');
const clearFeedbackBtn = document.getElementById('clear-feedback-btn');
const reportStatus = document.getElementById('report-status');
const reportPreviewSection = document.getElementById('report-preview-section');
const reportPreview = document.getElementById('report-preview');

/**
 * @param {string} message
 */
function setStatus(message) {
  reportStatus.textContent = message;
}

/**
 * Append plain text while turning backtick-wrapped labels into code elements.
 * @param {HTMLElement} element
 * @param {string} text
 */
function appendTechnicalText(element, text) {
  for (const segment of text.split(/(`[^`]+`)/g)) {
    if (segment.startsWith('`') && segment.endsWith('`')) {
      const code = document.createElement('code');
      code.textContent = segment.slice(1, -1);
      element.appendChild(code);
    } else if (segment) {
      element.append(segment);
    }
  }
}

/**
 * @param {HTMLElement} container
 * @param {readonly string[]} references
 */
function appendFlowReferences(container, references) {
  if (references.length === 0) return;

  const list = document.createElement('ul');
  list.className = 'generation-reference-list';
  list.setAttribute('aria-label', 'Relevant code, data, and output labels');

  for (const reference of references) {
    const item = document.createElement('li');
    const code = document.createElement('code');
    code.textContent = reference;
    item.appendChild(code);
    list.appendChild(item);
  }

  container.appendChild(list);
}

/**
 * @param {{ label: string, title: string, text: string, files: readonly string[] }} stage
 * @param {string} modifier
 * @returns {HTMLLIElement}
 */
function createOverviewStage(stage, modifier) {
  const item = document.createElement('li');
  item.className = `generation-stage ${modifier}`;

  const node = document.createElement('div');
  node.className = 'generation-stage-node';

  const label = document.createElement('p');
  label.className = 'generation-stage-label';
  label.textContent = stage.label;
  node.appendChild(label);

  const title = document.createElement('h3');
  title.textContent = stage.title;
  node.appendChild(title);

  const description = document.createElement('p');
  appendTechnicalText(description, stage.text);
  node.appendChild(description);

  appendFlowReferences(node, stage.files);
  item.appendChild(node);
  return item;
}

/**
 * @param {{ id: string, label: string, scope: string, steps: readonly Object[] }} lane
 * @returns {HTMLElement}
 */
function createGenerationLane(lane) {
  const section = document.createElement('section');
  section.className = `generation-lane ${lane.id}`;
  const headingId = `${lane.id}-heading`;
  section.setAttribute('aria-labelledby', headingId);

  const header = document.createElement('header');
  header.className = 'generation-lane-header';

  const title = document.createElement('h4');
  title.id = headingId;
  title.textContent = lane.label;
  header.appendChild(title);

  const scope = document.createElement('p');
  scope.className = 'generation-lane-scope';
  scope.textContent = lane.scope;
  header.appendChild(scope);
  section.appendChild(header);

  const steps = document.createElement('ol');
  steps.className = 'generation-lane-steps';

  for (const [index, step] of lane.steps.entries()) {
    const item = document.createElement('li');
    item.className = 'generation-lane-step';

    const number = document.createElement('span');
    number.className = 'generation-lane-step-number';
    number.setAttribute('aria-hidden', 'true');
    number.textContent = String(index + 1).padStart(2, '0');
    item.appendChild(number);

    const content = document.createElement('div');
    const title = document.createElement('h5');
    title.textContent = step.title;
    content.appendChild(title);

    const description = document.createElement('p');
    appendTechnicalText(description, step.text);
    content.appendChild(description);
    appendFlowReferences(content, step.files);

    item.appendChild(content);
    steps.appendChild(item);
  }

  section.appendChild(steps);
  return section;
}

function renderGenerationFlow() {
  if (!generationFlow) return;

  const flow = document.createElement('ol');
  flow.className = 'generation-flow-list';
  flow.setAttribute('aria-label', 'TriviaBot game generation steps');
  flow.appendChild(createOverviewStage(GENERATION_FLOW_DEFINITION.intake, 'intake-stage'));

  const branch = document.createElement('li');
  branch.className = 'generation-stage generation-branch-stage';

  const branchHeader = document.createElement('div');
  branchHeader.className = 'generation-branch-header';

  const branchLabel = document.createElement('p');
  branchLabel.className = 'generation-stage-label';
  branchLabel.textContent = 'Parallel paths';
  branchHeader.appendChild(branchLabel);

  const branchTitle = document.createElement('h3');
  branchTitle.textContent = 'Build the round candidates';
  branchHeader.appendChild(branchTitle);

  const branchDescription = document.createElement('p');
  branchDescription.textContent = 'Each lane follows its real selection rules before the results converge.';
  branchHeader.appendChild(branchDescription);
  branch.appendChild(branchHeader);

  const lanes = document.createElement('div');
  lanes.className = 'generation-lanes';
  for (const lane of GENERATION_FLOW_DEFINITION.lanes) {
    lanes.appendChild(createGenerationLane(lane));
  }
  branch.appendChild(lanes);
  flow.appendChild(branch);

  flow.appendChild(createOverviewStage(GENERATION_FLOW_DEFINITION.assembly, 'assembly-stage'));
  flow.appendChild(createOverviewStage(GENERATION_FLOW_DEFINITION.output, 'output-stage'));

  generationFlow.replaceChildren(flow);
}

/**
 * @param {string} id
 */
function updateNavMarker(id) {
  const link = sectionNavList?.querySelector(`[data-section-id="${id}"]`);
  if (!link) return;
  const hasComment = Boolean(feedbackState.comments[id]?.trim());
  link.classList.toggle('has-comment', hasComment);
}

/**
 * @param {import('../shared/round-definitions.js').RoundDefinition} definition
 * @returns {HTMLElement}
 */
function createRoundCard(definition) {
  const card = document.createElement('article');
  card.className = 'round-card';
  card.id = definition.id;
  card.dataset.round = definition.number != null ? String(definition.number) : 'final';

  const header = document.createElement('header');
  header.className = 'round-card-header';

  const title = document.createElement('h3');
  title.textContent = definition.number != null
    ? `Round ${definition.number}: ${definition.title}`
    : definition.title;
  header.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'round-meta';

  const typeBadge = document.createElement('span');
  typeBadge.className = 'round-badge code-badge';
  typeBadge.textContent = definition.roundType;
  meta.appendChild(typeBadge);

  if (definition.useLLM) {
    const llmBadge = document.createElement('span');
    llmBadge.className = 'round-badge';
    llmBadge.textContent = 'Generative LLM path';
    meta.appendChild(llmBadge);
  } else {
    const sourceBadge = document.createElement('span');
    sourceBadge.className = 'round-badge';
    sourceBadge.textContent = 'Archive / curated path';
    meta.appendChild(sourceBadge);
  }

  header.appendChild(meta);
  card.appendChild(header);

  const summary = document.createElement('p');
  summary.className = 'generation-summary';
  summary.textContent = definition.generation.summary;
  card.appendChild(summary);

  const flow = document.createElement('div');
  flow.className = 'flow-illustration';
  flow.setAttribute(
    'aria-label',
    `Generation flow for ${definition.number != null ? `round ${definition.number}` : 'Final Trivia'}`,
  );

  for (const [index, block] of definition.generation.flow.entries()) {
    if (index > 0) {
      const arrow = document.createElement('div');
      arrow.className = 'flow-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';
      flow.appendChild(arrow);
    }

    const blockEl = document.createElement('div');
    blockEl.className = 'flow-block';

    const blockTitle = document.createElement('span');
    blockTitle.className = 'flow-block-title';
    blockTitle.textContent = block.label;
    blockEl.appendChild(blockTitle);

    const blockText = document.createElement('p');
    blockText.textContent = block.text;
    blockEl.appendChild(blockText);

    flow.appendChild(blockEl);
  }

  card.appendChild(flow);

  if (definition.subTypes?.length) {
    const chips = document.createElement('div');
    chips.className = 'subtype-chips';
    chips.setAttribute('aria-label', 'Possible generated subtypes');

    for (const subType of definition.subTypes) {
      const chip = document.createElement('span');
      chip.className = 'subtype-chip';
      chip.textContent = SUBTYPE_LABELS[subType] || subType;
      chips.appendChild(chip);
    }

    card.appendChild(chips);
  }

  const details = document.createElement('dl');
  details.className = 'generation-details';
  const detailItems = [
    ['Source & inputs', definition.generation.source],
    ['Selection pipeline', definition.generation.selection],
    ['Difficulty calibration', definition.generation.difficulty],
    ['Grouping rules', definition.generation.grouping],
    ['LLM & fallback', definition.generation.llm],
    ['Filtering & reuse', definition.generation.filtering],
    ['Output shape', definition.generation.output],
  ];

  for (const [labelText, valueText] of detailItems) {
    const item = document.createElement('div');
    item.className = 'generation-detail';

    const term = document.createElement('dt');
    term.textContent = labelText;
    item.appendChild(term);

    const description = document.createElement('dd');
    description.textContent = valueText;
    item.appendChild(description);

    details.appendChild(item);
  }
  card.appendChild(details);

  const risks = document.createElement('section');
  risks.className = 'generation-risks';

  const risksTitle = document.createElement('h4');
  risksTitle.textContent = 'Failure & exhaustion risks';
  risks.appendChild(risksTitle);

  const risksList = document.createElement('ul');
  for (const risk of definition.generation.risks) {
    const item = document.createElement('li');
    item.textContent = risk;
    risksList.appendChild(item);
  }
  risks.appendChild(risksList);
  card.appendChild(risks);

  const touchpoints = document.createElement('section');
  touchpoints.className = 'generation-touchpoints';

  const touchpointsTitle = document.createElement('h4');
  touchpointsTitle.textContent = 'Implementation touchpoints';
  touchpoints.appendChild(touchpointsTitle);

  const touchpointsList = document.createElement('ul');
  for (const touchpoint of definition.generation.touchpoints) {
    const item = document.createElement('li');
    const path = document.createElement('code');
    path.textContent = touchpoint.path;
    item.appendChild(path);
    item.append(` — ${touchpoint.symbols.join(', ')}`);
    touchpointsList.appendChild(item);
  }
  touchpoints.appendChild(touchpointsList);
  card.appendChild(touchpoints);

  const label = document.createElement('label');
  label.className = 'comment-label';
  label.setAttribute('for', `${definition.id}-comment`);
  label.textContent = `What should change about ${definition.title}'s generation path?`;

  const textarea = document.createElement('textarea');
  textarea.id = `${definition.id}-comment`;
  textarea.className = 'comment-field';
  textarea.rows = 4;
  textarea.placeholder = 'Request changes to sources, filtering, prompts, calibration, grouping, fallback behavior, or output…';
  textarea.value = feedbackState.comments[definition.id] || '';
  textarea.addEventListener('input', () => {
    feedbackState.comments[definition.id] = textarea.value;
    updateNavMarker(definition.id);
    scheduleSave();
    invalidateReport();
  });

  card.appendChild(label);
  card.appendChild(textarea);

  return card;
}

/**
 * @param {import('../shared/round-definitions.js').RoundDefinition} definition
 * @returns {HTMLLIElement}
 */
function createNavItem(definition) {
  const item = document.createElement('li');

  const link = document.createElement('a');
  link.className = 'section-nav-link';
  link.href = `#${definition.id}`;
  link.dataset.sectionId = definition.id;

  const label = document.createElement('span');
  label.className = 'section-nav-label';
  label.textContent = definition.number != null
    ? `R${definition.number} ${definition.title}`
    : definition.title;
  link.appendChild(label);

  if (feedbackState.comments[definition.id]?.trim()) {
    link.classList.add('has-comment');
  }

  item.appendChild(link);
  return item;
}

function createOverviewNavItem() {
  const item = document.createElement('li');
  const link = document.createElement('a');
  link.className = 'section-nav-link';
  link.href = `#${GENERATION_FLOW_DEFINITION.id}`;

  const label = document.createElement('span');
  label.className = 'section-nav-label';
  label.textContent = 'Generation overview';
  link.appendChild(label);
  item.appendChild(link);
  return item;
}

function renderGuide() {
  if (!sectionNavList || !roundGuide) return;

  const navFragment = document.createDocumentFragment();
  const cardFragment = document.createDocumentFragment();
  const allSections = [...ROUND_DEFINITIONS, FINAL_TRIVIA_DEFINITION];

  navFragment.appendChild(createOverviewNavItem());
  for (const definition of allSections) {
    navFragment.appendChild(createNavItem(definition));
    cardFragment.appendChild(createRoundCard(definition));
  }

  sectionNavList.replaceChildren(navFragment);
  roundGuide.replaceChildren(cardFragment);
}

function loadFeedback() {
  try {
    feedbackState = parseFeedback(localStorage.getItem(STORAGE_KEY));
  } catch {
    feedbackState = createEmptyFeedback();
    setStatus('Saved feedback could not be loaded. Starting with a fresh session.');
  }
  overallNotes.value = feedbackState.overall;
}

function persistFeedback() {
  try {
    const payload = {
      schemaVersion: FEEDBACK_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      comments: feedbackState.comments,
      overall: feedbackState.overall,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    feedbackState.updatedAt = payload.updatedAt;
  } catch {
    setStatus('Could not save feedback locally. Your comments remain in this session only.');
  }
}

function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    persistFeedback();
  }, SAVE_DEBOUNCE_MS);
}

function invalidateReport() {
  currentReport = null;
  copyReportBtn.disabled = true;
  downloadReportBtn.disabled = true;
}

function generateReport() {
  currentReport = buildRoundReviewReport(
    ROUND_DEFINITIONS,
    FINAL_TRIVIA_DEFINITION,
    feedbackState,
    new Date().toISOString(),
  );
  reportPreview.textContent = currentReport;
  reportPreviewSection.hidden = false;
  copyReportBtn.disabled = false;
  downloadReportBtn.disabled = false;
  document.getElementById('report-preview-heading')?.focus({ preventScroll: true });
  setStatus('Report generated.');
}

async function copyReport() {
  if (!currentReport) {
    generateReport();
  }
  if (!currentReport) return;

  try {
    await navigator.clipboard.writeText(currentReport);
    setStatus('Report copied to clipboard.');
  } catch {
    setStatus('Could not copy to clipboard. Try downloading the report instead.');
  }
}

function downloadReport() {
  if (!currentReport) {
    generateReport();
  }
  if (!currentReport) return;

  try {
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([currentReport], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `triviabot-round-generation-review-${date}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('Report downloaded.');
  } catch {
    setStatus('Could not download the report.');
  }
}

function clearFeedback() {
  const confirmed = window.confirm(
    'Clear all round comments, overall notes, and saved feedback?',
  );
  if (!confirmed) return;

  feedbackState = createEmptyFeedback();
  overallNotes.value = '';
  currentReport = null;
  reportPreview.textContent = '';
  reportPreviewSection.hidden = true;
  invalidateReport();

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    setStatus('Feedback cleared in this session, but local storage could not be updated.');
    renderGuide();
    return;
  }

  setStatus('All feedback cleared.');
  renderGuide();
}

function init() {
  loadFeedback();
  renderGenerationFlow();
  renderGuide();

  overallNotes.addEventListener('input', () => {
    feedbackState.overall = overallNotes.value;
    scheduleSave();
    invalidateReport();
  });

  generateReportBtn?.addEventListener('click', generateReport);
  copyReportBtn?.addEventListener('click', copyReport);
  downloadReportBtn?.addEventListener('click', downloadReport);
  clearFeedbackBtn?.addEventListener('click', clearFeedback);
}

init();
