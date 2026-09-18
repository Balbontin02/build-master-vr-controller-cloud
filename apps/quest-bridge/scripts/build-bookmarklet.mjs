import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const entry = path.join(root, 'src', 'index.ts');
const dist = path.join(root, 'dist');
const sharedSrc = path.join(root, '..', '..', 'packages', 'shared', 'src');

const productionWssUrl = process.env.PRODUCTION_WSS_URL || '';

const result = await build({
  entryPoints: [entry],
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome100'],
  write: false,
  alias: {
    '@bmvr/shared': sharedSrc,
    '@bmvr/shared/lite': path.join(sharedSrc, 'lite.ts'),
  },
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.PRODUCTION_WSS_URL': JSON.stringify(productionWssUrl),
  },
});

const code = result.outputFiles[0].text;

let bookmarklet;
if (productionWssUrl) {
  const cfg = { wss: productionWssUrl };
  const prefix = `window.__BMVR_CFG__=${JSON.stringify(cfg)};`;
  bookmarklet = `javascript:${prefix}${code}`;
} else {
  bookmarklet = `javascript:${code}`;
}

fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, 'build-master-vr-connect.bookmarklet.txt'), bookmarklet, 'utf8');
fs.writeFileSync(path.join(dist, 'quest-bridge.min.js'), code, 'utf8');

console.log(`[bookmarklet] generado: ${bookmarklet.length} caracteres`);
console.log(`[bookmarklet] dist/build-master-vr-connect.bookmarklet.txt`);
console.log(`[bookmarklet] dist/quest-bridge.min.js`);
if (productionWssUrl) {
  console.log(`[bookmarklet] producción WSS inyectado: ${productionWssUrl}`);
}