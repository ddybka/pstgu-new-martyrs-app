import type { SearchHit } from '@/hooks/use-person-search';

/**
 * Поиск по ФИО без сети — по списку всех дел в бандле.
 *
 * Список пересобирается скриптом `scripts/build-persons-index.mjs`, формат
 * должен совпадать. В веб-версию он не попадает (см. `persons-index.web.ts`):
 * без сети сайт не откроется, а два мегабайта в бандле — заметная цена.
 */

/**
 * Номер дела, ФИО, сан, год рождения, год кончины (0 — неизвестен), чин
 * святости (в списках, собранных до него, его нет).
 */
type IndexEntry = [number, string, string, number, number, string?];

type Index = {
    entries: IndexEntry[];
    /** ФИО и сан, приведённые к виду для сравнения (см. `normalize`). */
    haystacks: string[];
};

/** Больше на экран всё равно не выводится: дальше стоит уточнить запрос. */
const MAX_RESULTS = 200;

let index: Index | null = null;

/** Строчные буквы, «ё» как «е», вместо знаков препинания — пробелы. */
function normalize(text: string) {
    return ` ${text.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim()} `;
}

function load(): Index {
    if (index) return index;

    // Список читается только при первом поиске без сети, а не при запуске.
    const data = require('@/data/persons-index.json') as { persons: IndexEntry[] };
    index = {
        entries: data.persons,
        haystacks: data.persons.map(([, name, rank]) => normalize(`${name} ${rank}`)),
    };
    return index;
}

export const offlineSearchAvailable = true;

/**
 * Каждое слово запроса должно быть началом какого-то слова в ФИО или сане:
 * «абрам серг» найдёт «АБРАМОВ Сергей Николаевич». Звёздочка на конце, как
 * в полнотекстовом поиске, ничего не меняет: здесь всё ищется по началу.
 *
 * Выше те, у кого слова запроса совпали целиком («петров» — Петров, а не
 * Петрович) и у кого с первого слова начинается само ФИО (обычно это фамилия
 * или монашеское имя). При равенстве — по алфавиту, как в списке.
 */
export function searchOffline(query: string): SearchHit[] {
    const words = normalize(query.replace(/\*/g, ' ')).trim().split(' ').filter(Boolean);
    if (words.length === 0) return [];

    const { entries, haystacks } = load();
    const matches: { index: number; score: number }[] = [];

    for (let i = 0; i < entries.length; i += 1) {
        const haystack = haystacks[i];
        if (!words.every((word) => haystack.includes(` ${word}`))) continue;

        let score = haystack.startsWith(` ${words[0]}`) ? 1 : 0;
        for (const word of words) if (haystack.includes(` ${word} `)) score += 2;
        matches.push({ index: i, score });
    }

    // Сортировка устойчивая: при равном счёте остаётся алфавитный порядок списка.
    matches.sort((a, b) => b.score - a.score);

    return matches.slice(0, MAX_RESULTS).map(({ index }) => {
        const [number, name, rank, born, died, holiness] = entries[index];
        return { number, name, rank, holiness: holiness || null, born: born || null, died: died || null, snippet: null };
    });
}
