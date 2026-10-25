import type { MartyrPoint } from '@/components/map/map-config';
import type { PersonEvent } from '@/hooks/use-persons';

/**
 * Какое событие биографии из API описывает точка карты.
 *
 * Точки и их тексты пока берутся с map.nmbook.ru, а не из API (географии в
 * API ещё нет), и общего ключа у события там и тут нет. Сопоставляем по
 * содержанию — на выборке так узнаётся ~99% точек:
 *
 * 1. тот же текст с точностью до пробелов и знаков (~90%);
 * 2. иначе единственное событие с той же датировкой (текст в API правили);
 * 3. иначе самое похожее по словам, если похоже достаточно.
 *
 * Не нашлось — `null`: подсвечивать наугад хуже, чем не подсвечивать.
 */

/** Буквы и цифры в нижнем регистре: «губ.  (ныне» и «губ. (ныне» — одно. */
function normalize(text: string | undefined) {
    return (text ?? '').toLocaleLowerCase('ru').replace(/[^\p{L}\p{N}]+/gu, '');
}

function words(text: string | undefined) {
    return new Set((text ?? '').toLocaleLowerCase('ru').match(/[\p{L}\p{N}]+/gu) ?? []);
}

/** Доля общих слов (мера Жаккара). */
function similarity(a: Set<string>, b: Set<string>) {
    if (a.size === 0 || b.size === 0) return 0;
    let common = 0;
    for (const word of a) if (b.has(word)) common++;
    return common / (a.size + b.size - common);
}

const MIN_SIMILARITY = 0.6;

export function matchEvent(point: Pick<MartyrPoint, 'dating' | 'text'>, events: readonly PersonEvent[]): number | null {
    const text = normalize(point.text);
    if (text) {
        const exact = events.findIndex((event) => normalize(event.текст) === text);
        if (exact !== -1) return exact;
    }

    const dating = normalize(point.dating);
    if (dating) {
        const sameDate = events.flatMap((event, index) => (normalize(event.датировка) === dating ? [index] : []));
        if (sameDate.length === 1) return sameDate[0];
    }

    const pointWords = words(point.text);
    let best: number | null = null;
    let bestScore = MIN_SIMILARITY;

    events.forEach((event, index) => {
        const score = similarity(pointWords, words(event.текст));
        if (score >= bestScore) {
            best = index;
            bestScore = score;
        }
    });

    return best;
}

/** Индексы событий биографии для набора точек — без повторов, по порядку. */
export function matchEvents(points: readonly Pick<MartyrPoint, 'dating' | 'text'>[], events: readonly PersonEvent[]) {
    const found = new Set<number>();
    for (const point of points) {
        const index = matchEvent(point, events);
        if (index !== null) found.add(index);
    }
    return [...found].sort((a, b) => a - b);
}
