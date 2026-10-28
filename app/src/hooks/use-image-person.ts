import { useMemo } from 'react';

import type { ImageSource } from 'expo-image';

import { httpsUnavailable } from '@/utils/api-fetch';
import { localPhotoUri } from '@/utils/offline-photos';

export type PersonPhoto = {
    имя_файла?: string;
    полное_фото_file_id?: string;
    сжатое_фото_file_id?: string;
    подпись?: string;
};

export type PersonPhotoItem = {
    fileId: string;
    caption: string | null;
    source: ImageSource;
    /** Тот же снимок по HTTP — если по HTTPS он не загрузился. */
    fallback: ImageSource | null;
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
 * Сжатые снимки открыто лежат на img.nmbook.ru — без токена, с кэшем на годы.
 * Имя файла — id из базы как есть, вместе с расширением.
 *
 * Если HTTPS не ответил, тот же файл берётся по HTTP (`fallback`, см.
 * компоненты в `person-photos`): так же, как с API (см. `api-fetch`).
 */
const PHOTO_HOST = 'img.nmbook.ru';

export function photoUrl(fileId: string, secure = true) {
    return `${secure ? 'https' : 'http'}://${PHOTO_HOST}/${encodeURIComponent(fileId)}`;
}

/**
 * Адреса снимков дела. Скачанные для чтения без сети берутся с устройства
 * (см. `offline-download`), остальные — с img.nmbook.ru; загрузку и её
 * состояние ведёт сам компонент.
 */
export function usePersonPhotos(photos: unknown): { photos: PersonPhotoItem[] } {
    // Массив сравнивается по содержимому: объект дела после обновления —
    // новый, а снимки в нём те же, и пересобирать адреса незачем.
    const signature = JSON.stringify(getPersonPhotos(photos));

    const result = useMemo(
        () =>
            (JSON.parse(signature) as { fileId: string; caption: string | null }[]).map(({ fileId, caption }) => {
                const local = localPhotoUri(fileId);
                // HTTPS уже признан недоступным — сразу HTTP, без ожидания.
                const secure = !httpsUnavailable();
                return {
                    fileId,
                    caption,
                    source: { uri: local ?? photoUrl(fileId, secure) },
                    fallback: local || !secure ? null : { uri: photoUrl(fileId, false) },
                };
            }),
        [signature]
    );

    return { photos: result };
}
