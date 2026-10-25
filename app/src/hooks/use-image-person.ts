import { useEffect, useMemo, useState } from 'react';

import type { ImageSource } from 'expo-image';

import { API_URL, ensureToken, peekToken } from '@/utils/api-fetch';

export type PersonPhoto = {
    имя_файла?: string;
    полное_фото_file_id?: string;
    сжатое_фото_file_id?: string;
    подпись?: string;
};

export type PersonPhotoItem = {
    fileId: string;
    caption: string | null;
    source: ImageSource | null;
};

export type UsePersonPhotosOptions = {
    /** Полноразмерный файл вместо сжатого — он в TIF и тяжёлый, для экрана не нужен. */
    full?: boolean;
};

/**
 * Фотографий у дела бывает и десять, и ни одной; у отдельной записи может не
 * оказаться файла — такую пропускаем, а не рисуем пустую рамку.
 */
export function getPersonPhotos(photos: unknown, { full = false }: UsePersonPhotosOptions = {}) {
    if (!Array.isArray(photos)) return [];

    return (photos as PersonPhoto[]).flatMap((photo) => {
        const fileId = full ? photo?.полное_фото_file_id : photo?.сжатое_фото_file_id;
        if (typeof fileId !== 'string' || fileId === '') return [];

        const caption = photo.подпись?.trim();
        return [{ fileId, caption: caption ? caption : null }];
    });
}

/**
 * Файлы закрыты токеном, но качать их в JS и гнать через base64, как в вебе,
 * не нужно: expo-image умеет сам сходить по URL с заголовком Authorization и
 * положить результат в нативный кэш на диске. Отсюда — только адреса и токен
 * (один на все снимки), загрузку и её состояние ведёт сам компонент.
 */
export function usePersonPhotos(photos: unknown, options: UsePersonPhotosOptions = {}) {
    const { full = false } = options;
    // Массив сравнивается по содержимому: объект дела после обновления — новый,
    // а снимки в нём те же, и токен из-за этого перезапрашивать незачем.
    const signature = JSON.stringify(getPersonPhotos(photos, { full }));
    const items = useMemo(
        () => JSON.parse(signature) as { fileId: string; caption: string | null }[],
        [signature]
    );
    const hasPhotos = items.length > 0;

    // Токен почти всегда уже в памяти: его получают при запуске (см.
    // `LoginProvider`). Тогда адреса снимков готовы в первой же отрисовке, и
    // карточка не перерисовывается ещё дважды после монтирования — в списке
    // на сотню карточек это и были лишние кадры при прокрутке.
    const [token, setToken] = useState<string | null>(peekToken);
    const [error, setError] = useState<Error | null>(null);
    const needsToken = hasPhotos && token === null;

    useEffect(() => {
        if (!needsToken) return;

        let cancelled = false;

        ensureToken()
            .then((value) => {
                if (!cancelled) setToken(value);
            })
            .catch((err) => {
                if (cancelled) return;
                console.error('Ошибка загрузки изображения:', err);
                setError(err instanceof Error ? err : new Error(String(err)));
            });

        return () => {
            cancelled = true;
        };
    }, [needsToken]);

    const loading = needsToken && error === null;

    const result: PersonPhotoItem[] = useMemo(
        () =>
            items.map(({ fileId, caption }) => ({
                fileId,
                caption,
                source: token
                    ? { uri: `${API_URL}files/${fileId}/content`, headers: { Authorization: `Bearer ${token}` } }
                    : null,
            })),
        [items, token]
    );

    return { photos: result, loading, error };
}
