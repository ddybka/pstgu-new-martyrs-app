import { useSyncExternalStore } from 'react';

const subscribe = () => () => { };

/**
 * Отрисовка уже в браузере (или на телефоне), а не при сборке HTML и не при
 * гидратации. Для страниц, чьё содержимое при сборке неизвестно: страница
 * новомученика (номер — из адреса), карта. До этого — то же, что в собранном
 * HTML, и React не ругается на расхождение (ошибка #418).
 */
export function useIsClient() {
    return useSyncExternalStore(
        subscribe,
        () => true,
        () => false
    );
}
