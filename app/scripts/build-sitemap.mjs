import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = 'https://map.dybka.ru';
const PUBLIC_DIR = path.resolve(__dirname, '../public');

const routes = [
    '/',
    '/about',
    '/help',
    '/apps',
    '/map',
    '/calendar',
    '/settings',
    '/search',
    '/privacy',
];

function escapeXml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

const urls = routes
    .map((route) => `  <url>
    <loc>${escapeXml(new URL(route, SITE_URL).href)}</loc>
    </url>`)
    .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

await mkdir(PUBLIC_DIR, { recursive: true });
const sitemapPath = path.join(PUBLIC_DIR, 'sitemap.xml');
await writeFile(sitemapPath, xml, 'utf8');

console.log(`Sitemap создан: ${sitemapPath}`);
console.log(`URL: ${routes.length}; страниц новомучеников: 0`);
