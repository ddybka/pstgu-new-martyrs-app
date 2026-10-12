/**
 * Веб-вариант «Поделиться». Нативный — в `share-link.ts`.
 *
 * `navigator.share` есть не везде (в десктопных браузерах чаще нет), поэтому
 * запасной путь — положить ссылку в буфер обмена. Возвращаемое значение
 * говорит, что именно произошло: кнопке надо показать «Скопировано», когда
 * системного окна не было.
 */
export type ShareResult = 'shared' | 'copied' | 'failed';

export async function shareLink({
    title,
    url,
}: {
    title: string;
    url: string;
}): Promise<ShareResult> {
    if (typeof navigator !== 'undefined' && navigator.share) {
        try {
            await navigator.share({ title, url });
            return 'shared';
        } catch {
            // Отмена пользователем приходит той же ошибкой, что и отказ
            // браузера, — различить их нельзя, поэтому просто буфер.
        }
    }

    try {
        await navigator.clipboard.writeText(url);
        return 'copied';
    } catch {
        return 'failed';
    }
}
