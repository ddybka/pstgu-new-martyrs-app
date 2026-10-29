/**
 * Прокрутка к блоку страницы по его узлу — только для веба (см.
 * `scroll-block.web.ts`). На телефоне координаты блоков из `onLayout`
 * верны и при сдвиге, и страница прокручивается по ним сама: здесь — «не
 * умею», `null`.
 */
export function scrollBlockToTop(_node: unknown, _offset: number): (() => void) | null {
    return null;
}
