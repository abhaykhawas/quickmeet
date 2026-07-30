import { readFile } from 'node:fs/promises';

const bundle = await readFile(
  new URL('../dist/index.js', import.meta.url),
  'utf8',
);

if (bundle.includes('React.createElement')) {
  throw new Error(
    'React SDK bundle contains classic JSX output without a guaranteed React binding.',
  );
}

console.log('React SDK bundle uses the automatic JSX runtime.');
