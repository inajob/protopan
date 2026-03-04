import fs from 'fs';
import path from 'path';

const corePath = 'public/parts/fritzing-parts/core';
const outputPath = 'public/parts-index.json';

console.log('Generating parts index...');

if (!fs.existsSync(corePath)) {
  console.error(`Error: Path not found ${corePath}`);
  process.exit(1);
}

const files = fs.readdirSync(corePath);
const index = files
  .filter(file => file.endsWith('.fzp'))
  .map(file => ({
    name: path.basename(file, '.fzp'),
    path: file
  }));

fs.writeFileSync(outputPath, JSON.stringify(index, null, 2));
console.log(`Successfully indexed ${index.length} parts to ${outputPath}`);
