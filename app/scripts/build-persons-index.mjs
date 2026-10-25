/**
 * Пересобирает список имён для поиска без сети (`src/data/persons-index.json`).
 *
 * Полнотекстовый поиск идёт через API (`text_filter`). Без сети он
 * недоступен, и поиск сводится к ФИО: для этого в бандле лежит список всех
 * дел — номер, ФИО, сан и годы жизни. Биографии сюда не попадают: их сотни
 * мегабайт.
 *
 * Ужимается так же, как снимок карты: массивы вместо объектов.
 * Формат должен совпадать с `src/utils/persons-index.ts`.
 *
 * Доступы к API берутся из `.env.local` (см. README, шаг 5). Запускать руками,
 * когда в базе заметно прибавится дел:
 *     node --env-file=.env.local scripts/build-persons-index.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://api.nmbook.ru').replace(/\/?$/, '/');
const LOGIN = process.env.EXPO_PUBLIC_API_LOGIN;
const PASSWORD = process.env.EXPO_PUBLIC_API_PASSWORD;
const PAGE_SIZE = 50;

if (!LOGIN || !PASSWORD) {
    throw new Error('Нет доступов к API. Запустите так: node --env-file=.env.local scripts/build-persons-index.mjs');
}

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'persons-index.json');

const loginResponse = await fetch(`${API_URL}login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: LOGIN, password: PASSWORD }),
});
if (!loginResponse.ok) throw new Error(`Вход в API: ${loginResponse.status}`);
const { access_token: token } = await loginResponse.json();

const persons = [];
let page;

do {
    const params = new URLSearchParams({
        data_format: 'item',
        filter: '{}',
        skip: String(persons.length),
        take: String(PAGE_SIZE),
    });
    const response = await fetch(`${API_URL}public/dela?${params}`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Страница с ${persons.length}: ${response.status}`);

    page = await response.json();
    for (const item of page.items) {
        persons.push([
            item.Номер,
            item.ФИО ?? '',
            item.сан_церк_служение ?? '',
            item.год_рождения ?? 0,
            item.год_кончины ?? 0,
        ]);
    }

    process.stdout.write(`\r${persons.length} / ${page.total_docs_count}`);
} while (page.has_next && page.items.length > 0);

writeFileSync(out, JSON.stringify({ version: 1, builtAt: Date.now(), persons }));

console.log(`\n${persons.length} дел → ${out}`);
