/**
 * Прокрутка к блоку страницы в вебе — так, чтобы блок оказался вверху
 * экрана с отступом `offset`.
 *
 * Координаты из `onLayout` в вебе для этого не годятся: react-native-web
 * сообщает их, только когда у блока меняется размер, а не положение. Фото
 * вверху биографии догружается и вырастает из заглушки, текст под ним
 * съезжает, а сохранённые координаты событий остаются прежними — страница
 * недокручивала. Здесь положение меряется в момент прокрутки, прямо в DOM.
 *
 * И ещё FOLLOW_MS после прокрутки позиция подправляется, если что-то выше
 * догрузилось и сдвинуло блок, — пока человек сам не начал листать.
 *
 * Возвращает отмену: новая прокрутка отменяет подправку старой.
 */

const FOLLOW_MS = 2500;

function scrollParent(node: HTMLElement): HTMLElement | null {
    let current = node.parentElement;
    while (current) {
        const { overflowY } = getComputedStyle(current);
        if ((overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight) {
            return current;
        }
        current = current.parentElement;
    }
    return null;
}

export function scrollBlockToTop(node: unknown, offset: number): (() => void) | null {
    if (!(node instanceof HTMLElement)) return null;

    const scroller = scrollParent(node);
    if (!scroller) return null;

    const targetTop = () =>
        node.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - offset;

    scroller.scrollTo({ top: targetTop(), behavior: 'smooth' });

    let done = false;
    const stop = () => {
        if (done) return;
        done = true;
        observer?.disconnect();
        clearTimeout(timer);
        for (const type of USER_EVENTS) scroller.removeEventListener(type, stop);
    };

    // Содержимое прокрутки поменяло размер — блок мог съехать: к нему снова.
    const content = scroller.firstElementChild;
    const observer =
        typeof ResizeObserver === 'undefined' || !content
            ? null
            : new ResizeObserver(() => scroller.scrollTo({ top: targetTop(), behavior: 'smooth' }));
    if (content) observer?.observe(content);

    // Человек сам взялся за прокрутку — дальше не мешаем.
    const USER_EVENTS = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;
    for (const type of USER_EVENTS) scroller.addEventListener(type, stop, { passive: true });

    const timer = setTimeout(stop, FOLLOW_MS);
    return stop;
}
