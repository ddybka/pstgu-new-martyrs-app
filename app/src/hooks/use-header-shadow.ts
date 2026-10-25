import { useRoute } from 'expo-router';
import { useEffect, useSyncExternalStore } from 'react';

/**
 * Прокручена ли страница — для тени под шапкой (`ContainedHeader`).
 *
 * Шапку рисует стек, а прокрутку знает страница, и общего предка с
 * состоянием у них нет. Поэтому признак лежит в модуле, по ключу маршрута:
 * у каждой открытой страницы — свой, и шапка соседней страницы в стеке от
 * чужой прокрутки тень не получит. Подписчики уведомляются только при смене
 * признака, а не на каждом кадре прокрутки.
 */

const scrolled = new Map<string, boolean>();
const listeners = new Set<() => void>();

function setScrolled(key: string, value: boolean) {
    if ((scrolled.get(key) ?? false) === value) return;
    if (value) scrolled.set(key, true);
    else scrolled.delete(key);
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** Для шапки: прокручена ли страница этого маршрута. */
export function useIsScrolled(routeKey: string) {
    return useSyncExternalStore(
        subscribe,
        () => scrolled.get(routeKey) ?? false,
        () => false
    );
}

/**
 * Для страницы: функция, которой сообщают текущую прокрутку. Её можно звать
 * на каждом событии — дальше пройдёт только смена «наверху / прокручено».
 */
export function useReportScroll() {
    const { key } = useRoute();

    // Страница закрылась — её признак больше не нужен.
    useEffect(() => () => setScrolled(key, false), [key]);

    return (offsetY: number) => setScrolled(key, offsetY > 0);
}
