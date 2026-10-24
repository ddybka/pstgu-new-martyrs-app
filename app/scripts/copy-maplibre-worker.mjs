/**
 * Кладёт воркер MapLibre в `public/`, откуда его отдаёт веб-сервер.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'node_modules', 'maplibre-gl', 'dist');
const to = join(root, 'public', 'maplibre');

const FILES = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];

mkdirSync(to, { recursive: true });
for (const file of FILES) copyFileSync(join(from, file), join(to, file));

console.log(`maplibre worker > ${to}`);
