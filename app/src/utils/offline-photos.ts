import { Directory, File, Paths } from 'expo-file-system';

/**
 * Фотографии, скачанные для чтения без сети (см. `offline-download`).
 *
 * Лежат в своей папке, а не в кэше expo-image: тот на iOS по умолчанию
 * чистится через неделю, и скачанное в поездку пропало бы к её середине.
 */

const DIRECTORY = 'offline-photos';

function directory() {
    return new Directory(Paths.document, DIRECTORY);
}

function fileFor(fileId: string) {
    // Имя файла — id из базы: это хеш с расширением, без путей и пробелов.
    return new File(directory(), fileId.replace(/[^\w.-]/g, '_'));
}

/** Адрес скачанной фотографии на устройстве или `null`, если её нет. */
export function localPhotoUri(fileId: string): string | null {
    try {
        const file = fileFor(fileId);
        return file.exists ? file.uri : null;
    } catch {
        return null;
    }
}

export async function savePhoto(url: string, fileId: string) {
    const target = directory();
    if (!target.exists) target.create({ intermediates: true });

    const file = fileFor(fileId);
    if (file.exists) return;

    await File.downloadFileAsync(url, file, { idempotent: true });
}

/** Сколько места занимают скачанные фотографии, в байтах. */
export function photosSize(): number {
    try {
        const target = directory();
        if (!target.exists) return 0;
        return target.list().reduce((sum, item) => sum + (item instanceof File ? (item.size ?? 0) : 0), 0);
    } catch {
        return 0;
    }
}

export function removePhotos() {
    try {
        const target = directory();
        if (target.exists) target.delete();
    } catch (error) {
        console.warn('Не удалось удалить скачанные фотографии:', error);
    }
}
