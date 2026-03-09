import fs from 'fs';
import path from 'path';

const corePath = 'public/parts/fritzing-parts/core';
const contribPath = 'public/parts/fritzing-parts/contrib';
const adafruitPath = 'public/parts/adafruit-Fritzing-Library/parts';
const outputPath = 'public/parts-index.json';

console.log('Generating parts index...');

function getFilesRecursively(dir, extensions) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath, extensions));
    } else {
      if (extensions.some(ext => file.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const coreFiles = getFilesRecursively(corePath, ['.fzp']);
const contribFiles = getFilesRecursively(contribPath, ['.fzp']);
const adafruitFiles = getFilesRecursively(adafruitPath, ['.fzpz']);

const index = [
  ...coreFiles.map(file => ({
    name: path.basename(file, '.fzp'),
    path: file.replace(/\\/g, '/').replace('public/', ''),
    type: 'fzp'
  })),
  ...contribFiles.map(file => ({
    name: path.basename(file, '.fzp'),
    path: file.replace(/\\/g, '/').replace('public/', ''),
    type: 'fzp'
  })),
  ...adafruitFiles.map(file => ({
    name: path.basename(file, '.fzpz'),
    path: file.replace(/\\/g, '/').replace('public/', ''),
    type: 'fzpz'
  }))
];

fs.writeFileSync(outputPath, JSON.stringify(index, null, 2));
console.log(`Successfully indexed ${index.length} parts to ${outputPath}`);
