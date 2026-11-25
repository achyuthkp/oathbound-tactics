#!/usr/bin/env node
// Copies the single-file build to the repository root as Oathbound.html.
// Run via `npm run release`, which builds first.
import { copyFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const source = path.join(root, 'dist', 'index.html');
const destination = path.join(root, 'Oathbound.html');

let size;
try {
  ({ size } = await stat(source));
} catch {
  console.error('release: dist/index.html not found.');
  console.error('`npm run release` builds first; if this persists, run `npm run build` and read its output.');
  process.exit(1);
}

await copyFile(source, destination);

console.log(
  `release: copied ${path.relative(root, source)} -> ${path.relative(root, destination)} (${size} bytes)`,
);
