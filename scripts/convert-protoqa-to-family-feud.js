import fs from 'node:fs';
import path from 'node:path';

const PROTOQA_DEV_URL =
  'https://raw.githubusercontent.com/iesl/protoqa-data/master/data/dev/dev.scraped.jsonl';
const DEFAULT_LOCAL_PATH = './protoqa-data/data/dev/dev.scraped.jsonl';
const OUTPUT_PATH = './data/family-feud-questions.json';

const args = process.argv.slice(2);
const useFetch = args.includes('--fetch');
const inputPath = args.find((a) => !a.startsWith('--')) || DEFAULT_LOCAL_PATH;

function toTopAnswers(rawAnswers) {
  return Object.entries(rawAnswers)
    .map(([answer, points]) => ({
      answer: String(answer || '').trim(),
      points: Number(points) || 0
    }))
    .filter((entry) => entry.answer.length > 0 && entry.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 10);
}

function parseJsonl(raw) {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function convertLines(lines) {
  const questions = [];
  let malformed = 0;
  let skipped = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    let row;

    try {
      row = JSON.parse(line);
    } catch (error) {
      malformed += 1;
      console.warn(`Skipping malformed JSONL at line ${i + 1}: ${error.message}`);
      continue;
    }

    const question = row?.question?.original;
    const rawAnswers = row?.answers?.raw;
    if (!question || typeof rawAnswers !== 'object' || rawAnswers === null) {
      skipped += 1;
      continue;
    }

    const topAnswers = toTopAnswers(rawAnswers);
    if (topAnswers.length === 0) {
      skipped += 1;
      continue;
    }

    questions.push({
      id: `protoqa-${questions.length + 1}`,
      question: String(question).trim(),
      topAnswers
    });
  }

  return { questions, malformed, skipped };
}

async function fetchProtoqaData() {
  const res = await fetch(PROTOQA_DEV_URL);
  if (!res.ok) {
    throw new Error(
      `Fetch failed: HTTP ${res.status} ${res.statusText}\n` +
        `URL: ${PROTOQA_DEV_URL}\n` +
        `Try running with a local path instead: npm run populate-family-feud -- ./protoqa-data/data/dev/dev.scraped.jsonl`
    );
  }
  return res.text();
}

async function run() {
  let raw;

  if (useFetch) {
    try {
      raw = await fetchProtoqaData();
    } catch (error) {
      console.error(
        `Network error: ${error.message}\n` +
          `Fallback: download the file manually and run with local path:\n` +
          `  npm run populate-family-feud -- ./path/to/dev.scraped.jsonl`
      );
      process.exit(1);
    }
  } else {
    if (!fs.existsSync(inputPath)) {
      throw new Error(
        `Input JSONL file not found: ${inputPath}\n` +
          `Use --fetch to download from: ${PROTOQA_DEV_URL}`
      );
    }
    raw = fs.readFileSync(inputPath, 'utf-8');
  }

  const lines = parseJsonl(raw);
  const { questions, malformed, skipped } = convertLines(lines);

  if (questions.length === 0) {
    console.error(
      'Conversion failed: no valid questions produced.\n' +
        'Check input format (expects ProtoQA JSONL with question.original and answers.raw).'
    );
    process.exit(1);
  }

  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const output = {
    questions,
    metadata: {
      description: 'Family Feud questions converted from ProtoQA JSONL',
      source: 'ProtoQA (iesl/protoqa-data)',
      license: 'CC-BY-4.0',
      sourceFile: useFetch ? PROTOQA_DEV_URL : path.normalize(inputPath),
      generatedAt: new Date().toISOString(),
      malformedLinesSkipped: malformed,
      invalidRowsSkipped: skipped,
      version: '1.0'
    }
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Wrote ${questions.length} Family Feud questions to ${OUTPUT_PATH}`);
  if (malformed > 0 || skipped > 0) {
    console.log(`Skipped ${malformed} malformed lines and ${skipped} invalid rows.`);
  }
}

run().catch((error) => {
  console.error(`Conversion failed: ${error.message}`);
  process.exit(1);
});
