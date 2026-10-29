/**
 * Кладёт воркер MapLibre и его стили в `public/`, откуда их отдаёт
 * веб-сервер. Стили подключаются только при открытии карты (см.
 * `martyrs-map.web.tsx`), а не на каждой странице.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'node_modules', 'maplibre-gl', 'dist');
const to = join(root, 'public', 'maplibre');

const FILES = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs', 'maplibre-gl.css'];

mkdirSync(to, { recursive: true });
for (const file of FILES) copyFileSync(join(from, file), join(to, file));

console.log(`maplibre worker > ${to}`);
