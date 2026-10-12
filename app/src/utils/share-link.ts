import { Share } from 'react-native';

/**
 * Поделиться ссылкой системными средствами. Веб-вариант — в `share-link.web.ts`.
 *
 * `url` отдаётся отдельным полем, а не только внутри текста: на iOS по нему
 * система показывает превью страницы и предлагает «Скопировать ссылку».
 */
export type ShareResult = 'shared' | 'copied' | 'failed';

export async function shareLink({
    title,
    url,
}: {
    title: string;
    url: string;
}): Promise<ShareResult> {
    try {
        await Share.share({ title, message: `${title}\n${url}`, url });
        return 'shared';
    } catch {
        return 'failed';
    }
}
