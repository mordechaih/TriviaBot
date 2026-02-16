import fs from 'fs';

const ARCHIVE_FILE = './data/archive-backup.json';
const OUTPUT_FILE = './data/archive-backup-cleaned.json';

console.log('Cleaning archive of bad answers...');

// Load archive
const archive = JSON.parse(fs.readFileSync(ARCHIVE_FILE, 'utf-8'));
console.log(`Loaded ${archive.length} questions`);

// Filter out questions with incomplete answers
const cleaned = archive.filter(q => {
  // Remove questions where answer is just "the" or "The" (incomplete extraction)
  if (q.answer === 'the' || q.answer === 'The') {
    console.log(`Removing incomplete answer: "${q.clue.substring(0, 60)}..." => "${q.answer}"`);
    return false;
  }
  
  // Remove questions with suspiciously short answers (likely incomplete)
  if (q.answer && q.answer.trim().length < 2) {
    console.log(`Removing suspiciously short answer: "${q.clue.substring(0, 60)}..." => "${q.answer}"`);
    return false;
  }
  
  return true;
});

console.log(`\nRemoved ${archive.length - cleaned.length} questions with bad answers`);
console.log(`Cleaned archive has ${cleaned.length} questions`);

// Save cleaned archive
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cleaned, null, 2));
console.log(`Saved cleaned archive to ${OUTPUT_FILE}`);

console.log('\nTo use the cleaned archive, run:');
console.log(`  mv ${OUTPUT_FILE} ${ARCHIVE_FILE}`);
console.log('\nOr keep both files for comparison.');

