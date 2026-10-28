/**
 * Имя новомученика в выбранном в настройках порядке.
 *
 * В базе `ФИО` записано по-справочному: фамилия вперёд и заглавными
 * («АРТЕМЬЕВ Фома Константинович»), у монашествующих вперёд монашеское имя, а
 * мирское в скобках («АВГУСТА (Зашук Лидия Васильевна)»). По умолчанию
 * порядок меняется на привычный — «Имя Отчество Фамилия», а заглавными
 * остаётся имя. Историкам привычнее справочный вид, как в базе, — его можно
 * выбрать в настройках (см. `context/name-order`).
 */

/**
 * - `name-first` — «ФОМА Константинович Артемьев», «АФАНАСИЙ (Сергей
 *   Григорьевич Сахаров)»;
 * - `surname-first` — как в базе: «АРТЕМЬЕВ Фома Константинович»,
 *   «АФАНАСИЙ (Сахаров Сергей Григорьевич)».
 */
export type NameOrder = 'name-first' | 'surname-first';

const LOWER = /[а-яёa-z]/;

function hasLower(text: string) {
    return LOWER.test(text);
}

function isGroup(token: string) {
    return token.startsWith('(') && token.endsWith(')');
}

function isCapsWord(token: string) {
    return /^[А-ЯЁ-]{2,}$/.test(token);
}

function tokenize(text: string) {
    const tokens: string[] = [];
    let current = '';
    let depth = 0;

    const flush = () => {
        if (current) tokens.push(current);
        current = '';
    };

    for (const char of text) {
        if (char === '(') {
            if (depth === 0) flush();
            depth += 1;
            current += char;
        } else if (char === ')' && depth > 0) {
            depth -= 1;
            current += char;
            if (depth === 0) flush();
        } else if (char === ' ' && depth === 0) {
            flush();
        } else {
            current += char;
        }
    }

    flush();
    return tokens;
}

function splitOutside(text: string, separator: string): [string, string | null] {
    let depth = 0;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        if (char === '(') depth += 1;
        else if (char === ')') depth = Math.max(0, depth - 1);
        else if (depth === 0 && text.startsWith(separator, i)) {
            return [text.slice(0, i), text.slice(i)];
        }
    }

    return [text, null];
}

function titleCase(word: string) {
    if (hasLower(word)) return word;
    return word.toLowerCase().replace(/(^|[-\s(])([а-яёa-z])/g, (_, before, letter) => before + letter.toUpperCase());
}

function surnameLast(text: string, upperName: boolean) {
    const tokens = tokenize(text);
    const [surname] = tokens;
    if (!surname || isGroup(surname) || !/^[А-ЯЁA-Z]/.test(surname)) return text;

    let index = 1;
    while (index < tokens.length && isGroup(tokens[index])) index += 1;

    const variants = tokens.slice(1, index).map(titleCase);
    const rest = tokens.slice(index);
    const lastName = [titleCase(surname), ...variants];

    if (rest.length === 0) return lastName.join(' ');

    if (isCapsWord(rest[0])) return text;

    const last = rest[rest.length - 1];
    const fullAlternative =
        rest.length > 1 && isGroup(last) && tokenize(last.slice(1, -1)).length > 1 ? rest.pop() : undefined;

    if (upperName && hasLower(rest[0]) && !isGroup(rest[0])) {
        rest[0] = rest[0].toUpperCase();
    }

    return [...rest, ...lastName, ...(fullAlternative ? [fullAlternative] : [])].join(' ');
}

function formatSecularName(text: string, upperName: boolean): string {
    return text
        .split('; ')
        .map((part) => {
            if (!/^[А-ЯЁA-Z]/.test(part)) return part;

            const normalized = part.replace(/^(\S+), (иначе \S+), /, '$1 ($2) ');
            const [main, tail] = splitOutside(normalized, ', ');

            return surnameLast(main, upperName) + (tail ?? '');
        })
        .join('; ');
}

function normalizeSpaces(text: string) {
    return text.replace(/\s+/g, ' ').trim();
}

export function formatPersonName(
    fio: string | undefined | null,
    order: NameOrder = 'name-first'
): string | null {
    if (!fio) return null;

    const text = normalizeSpaces(fio);
    if (order === 'surname-first') return text;

    const tokens = tokenize(text);

    const secular = tokens.findIndex((token) => isGroup(token) && hasLower(token));
    if (secular > 0 && tokens.slice(0, secular).every((token) => !hasLower(token))) {
        const after = tokens.slice(secular + 1).join(' ');

        if (after === '' || after.startsWith(',')) {
            const head = tokens.slice(0, secular).join(' ');
            const inner = formatSecularName(tokens[secular].slice(1, -1), false);
            return `${head} (${inner})${after}`;
        }
    }

    return formatSecularName(text, true);
}

export function capitalize(value: string | undefined | null): string | null {
    const text = value?.trim();
    if (!text) return null;

    return text[0].toUpperCase() + text.slice(1);
}

export const formatRank = capitalize;

const collator = new Intl.Collator('ru', { sensitivity: 'base' });

/**
 * Сравнение имён по алфавиту — для порядка «Имя Отчество Фамилия».
 *
 * API сортирует по ФИО в справочном виде, то есть по фамилии. Когда первым
 * показано имя, такой порядок на глаз выглядит случайным: «ПАВЕЛ … Алмазов»,
 * «КОНСТАНТИН … Андреюк», «НИКОЛАЙ … Архангельский». Поэтому список
 * упорядочивается заново — по тому, что видно на экране.
 */
export function compareDisplayedNames(a: string, b: string) {
    return collator.compare(a, b);
}

/**
 * Заголовок для списков и страницы: у канонизированных перед именем — чин
 * святости, как в заголовке биографии в базе: «Исповедник АФАНАСИЙ (Сахаров
 * Сергей Григорьевич)».
 */
export function formatPersonHeading(
    fio: string | undefined | null,
    holiness: string | undefined | null,
    order: NameOrder = 'name-first'
): string | null {
    const name = formatPersonName(fio, order);
    if (!name) return null;

    const rank = capitalize(holiness);
    return rank ? `${rank} ${name}` : name;
}

/**
 * Заголовок биографии целиком — «[Чин святости ]ФИО[, сан]», как его отдаёт
 * карта (`humanFio` у map.nmbook.ru). Чин и сан остаются на местах, порядок
 * меняется только в самом ФИО.
 */
export function formatPersonTitle(title: string, order: NameOrder = 'name-first'): string {
    const { holiness, name } = splitPersonTitle(title, order);
    return holiness ? `${holiness} ${name}` : name;
}

/**
 * Заголовок биографии, разобранный на чин святости и остальное — для показа
 * чина отдельной строкой над именем (см. `PersonRankLine`).
 */
export function splitPersonTitle(
    title: string,
    order: NameOrder = 'name-first'
): { holiness: string | null; name: string } {
    const text = normalizeSpaces(title);

    // Чин святости — слова со строчными буквами до первого слова заглавными.
    const tokens = text.split(' ');
    let index = 0;
    while (index < tokens.length - 1 && hasLower(tokens[index]) && !tokens[index].startsWith('(')) index += 1;

    if (index === 0 || !/^[А-ЯЁA-Z-]{2,}/.test(tokens[index])) {
        return { holiness: null, name: formatPersonName(text, order) ?? text };
    }

    return {
        holiness: tokens.slice(0, index).join(' '),
        name: formatPersonName(tokens.slice(index).join(' '), order) ?? '',
    };
}

