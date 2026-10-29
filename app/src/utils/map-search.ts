import type { MartyrPoint } from '@/components/map/map-config';

/**
 * Поиск и фильтры по точкам карты — на устройстве, по снимку точек.
 *
 * Как и общий поиск, ищется и по ФИО, и по событиям: у точки есть заголовок
 * биографии, текст события (в нём и место) и датировка. Сеть для этого не
 * нужна, а выдача сразу ложится на карту: восемь тысяч точек перебираются
 * быстрее, чем пришёл бы ответ сервера.
 */

/** Строчные буквы, «ё» как «е», вместо знаков препинания — пробелы. */
function normalize(text: string) {
    return ` ${text.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim()} `;
}

const haystackCache = new WeakMap<readonly MartyrPoint[], string[]>();

function haystacks(points: readonly MartyrPoint[]) {
    let result = haystackCache.get(points);
    if (!result) {
        result = points.map((point) => normalize(`${point.title} ${point.text} ${point.dating}`));
        haystackCache.set(points, result);
    }
    return result;
}

export const MIN_MAP_QUERY_LENGTH = 2;

/** Слова запроса; пустой список — поиска нет. */
export function queryWords(query: string): string[] {
    const trimmed = query.trim();
    if (trimmed.length < MIN_MAP_QUERY_LENGTH) return [];
    return normalize(trimmed.replace(/\*/g, ' ')).trim().split(' ').filter(Boolean);
}

/**
 * id точек, где каждое слово запроса — начало какого-то слова в заголовке,
 * тексте или датировке: «тихон моск» найдёт события патриарха Тихона в Москве.
 * `all` — полный список точек, по нему кешируются строки для сравнения.
 */
export function searchPoints(all: readonly MartyrPoint[], words: readonly string[]): Set<number> {
    const texts = haystacks(all);
    const found = new Set<number>();

    for (let i = 0; i < all.length; i += 1) {
        const text = texts[i];
        if (words.every((word) => text.includes(` ${word}`))) found.add(all[i].id);
    }

    return found;
}

/**
 * Периоды для фильтра по годам. Границы — по вехам гонений: революция и
 * Гражданская война, двадцатые–тридцатые, Большой террор, война и последние
 * годы Сталина, хрущёвские гонения и позже.
 */
export const PERIODS = [
    { value: 'all', label: 'Все годы', from: -Infinity, to: Infinity },
    { value: 'before-1917', label: 'До 1917', from: -Infinity, to: 1916 },
    { value: '1917-1922', label: '1917–1922', from: 1917, to: 1922 },
    { value: '1923-1936', label: '1923–1936', from: 1923, to: 1936 },
    { value: '1937-1938', label: '1937–1938', from: 1937, to: 1938 },
    { value: '1939-1953', label: '1939–1953', from: 1939, to: 1953 },
    { value: 'after-1953', label: 'После 1953', from: 1954, to: Infinity },
] as const;

export type PeriodValue = (typeof PERIODS)[number]['value'];

/** Первый год в датировке события: «1937, 5 августа» → 1937. */
export function yearOf(dating: string): number | null {
    const match = /(?:^|\D)(1[89]\d\d|20\d\d)(?!\d)/.exec(dating);
    return match ? Number(match[1]) : null;
}

export function inPeriod(point: MartyrPoint, period: PeriodValue) {
    if (period === 'all') return true;

    const { from, to } = PERIODS.find((item) => item.value === period) ?? PERIODS[0];
    const year = yearOf(point.dating);
    return year !== null && year >= from && year <= to;
}

/**
 * Прославлен ли человек: у канонизированных заголовок биографии начинается
 * с чина святости — «Священномученик ВЛАДИМИР (…)», у остальных — сразу с ФИО
 * заглавными.
 */
export function isCanonizedTitle(title: string) {
    return /^[А-ЯЁ][а-яё-]+\s/.test(title);
}
