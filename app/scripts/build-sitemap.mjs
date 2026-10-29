
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = 'https://fcsmap.nmbook.ru';
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const PERSONS_INDEX_PATH = path.resolve(
    __dirname,
    '../src/data/persons-index.json'
);

const staticRoutes = [
    '/',
    '/about',
    '/help',
    '/map',
    '/calendar',
    '/settings',
    '/search'
];

const rawPersons = await readFile(PERSONS_INDEX_PATH, 'utf8');
const index = JSON.parse(rawPersons);
const persons = index.persons;

// проверка на массив
if (!Array.isArray(persons)) {
    throw new Error('persons-index.json должен содержать массив');
}

// Из каждой записи берём номер человека из первого элемента.
// Отбрасываем некорректные номера и дубликаты.
const personNumbers = [
    ...new Set(
        persons
            .map((person) => Array.isArray(person) ? Number(person[0]) : NaN)
            .filter((number) => Number.isSafeInteger(number) && number > 0)
    ),
];

const personRoutes = personNumbers.map(
    (number) => `/person/${number}`
);

const routes = [...staticRoutes, ...personRoutes];

// XML-экранирование на случай, если список маршрутов расширится.
function escapeXml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

const urls = routes
    .map((route) => {
        const loc = escapeXml(`${SITE_URL}${route}`);

        return `  <url>
    <loc>${loc}</loc>
  </url>`;
    })
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
console.log(`Общих страниц: ${staticRoutes.length}`);
console.log(`Страниц новомучеников: ${personRoutes.length}`);
console.log(`Всего URL: ${routes.length}`);
