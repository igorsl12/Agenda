// inject-pwa.mjs — pós-build do export web do Expo.
//
// O `expo export --platform web` não gera manifest PWA nem referencia ícones
// em alta resolução (só um favicon.ico pequeno), então a instalação "Adicionar
// à tela inicial" fica com o ícone borrado. Este script:
//   1) garante que os assets de PWA (manifest + ícones SVG) estão no dist/;
//   2) injeta no <head> do index.html o link do manifest, o theme-color e o
//      favicon/apple-touch-icon em SVG (nítido em qualquer densidade).
//
// Roda no buildCommand da Vercel logo após o export (ver vercel.json).
import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  existsSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const pub = join(root, 'public');

const indexPath = join(dist, 'index.html');
if (!existsSync(indexPath)) {
  console.error('[inject-pwa] dist/index.html não encontrado — rode o export web antes.');
  process.exit(1);
}

// 1) Copia os assets de PWA para o dist (o public/ nem sempre é copiado).
for (const file of ['manifest.json', 'icon.svg', 'icon-maskable.svg']) {
  const src = join(pub, file);
  if (existsSync(src)) copyFileSync(src, join(dist, file));
}

// 2) Injeta as tags de PWA no <head>, uma única vez.
let html = readFileSync(indexPath, 'utf8');
if (html.includes('rel="manifest"')) {
  console.log('[inject-pwa] tags já presentes, nada a fazer.');
  process.exit(0);
}

const tags = [
  '<link rel="manifest" href="/manifest.json" />',
  '<meta name="theme-color" content="#2E6BF0" />',
  '<link rel="icon" href="/icon.svg" type="image/svg+xml" />',
  '<link rel="apple-touch-icon" href="/icon.svg" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
  '<meta name="apple-mobile-web-app-title" content="AgendIA" />',
].join('\n    ');

html = html.replace('</head>', `    ${tags}\n  </head>`);
writeFileSync(indexPath, html, 'utf8');
console.log('[inject-pwa] manifest + ícones SVG injetados no index.html.');
