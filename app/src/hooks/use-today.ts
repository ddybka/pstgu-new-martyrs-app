import { useSyncExternalStore } from 'react';

/**
 * Сегодняшняя дата — или `null`, пока веб-страница гидратируется.
 *
 * HTML сайта собирается заранее, в день выкладки. Дата, посчитанная при
 * отрисовке («поминаемых 29 октября»), назавтра уже не совпала бы с той, что
 * в готовом HTML, и React ругался бы на расхождение (ошибка #418), заново
 * перерисовывая страницу. Поэтому при гидратации даты нет — как и в
 * собранном HTML, — а сразу после неё компонент получает сегодняшнюю. На
 * телефоне гидратации нет: дата есть с первой отрисовки.
 */

const subscribe = () => () => { };

let cached: { key: string; date: Date } | null = null;

/** Один и тот же объект в течение дня: так требует useSyncExternalStore. */
function getSnapshot() {
    const now = new Date();
    const key = now.toDateString();
    if (cached?.key !== key) cached = { key, date: now };
    return cached.date;
}

function getServerSnapshot() {
    return null;
}

export function useToday(): Date | null {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
