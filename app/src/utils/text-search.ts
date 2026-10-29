/**
 * Поиск по тексту страницы — как Ctrl+F в браузере: без учёта регистра и
 * с «ё» как «е». Замены не меняют длину строки, поэтому найденные позиции
 * годятся и для исходного текста — по ним и подсвечивается совпадение.
 */

export const MIN_PAGE_QUERY_LENGTH = 2;

function fold(text: string) {
    return text.toLowerCase().replace(/ё/g, 'е');
}

/** Запрос, приведённый к виду для сравнения; короче MIN_PAGE_QUERY_LENGTH — пусто. */
export function pageNeedle(query: string) {
    const trimmed = query.trim().replace(/\s+/g, ' ');
    return trimmed.length < MIN_PAGE_QUERY_LENGTH ? '' : fold(trimmed);
}

/** Начала всех совпадений `needle` (уже приведённого, см. `pageNeedle`) в тексте. */
export function findMatches(text: string, needle: string): number[] {
    if (!needle) return [];

    const haystack = fold(text);
    const found: number[] = [];
    let index = haystack.indexOf(needle);

    while (index !== -1) {
        found.push(index);
        index = haystack.indexOf(needle, index + needle.length);
    }

    return found;
}

export function countMatches(texts: readonly (string | null | undefined)[], needle: string) {
    return texts.reduce((sum, text) => sum + (text ? findMatches(text, needle).length : 0), 0);
}
