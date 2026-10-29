
import { Directory, File, Paths } from 'expo-file-system';

const photosDirectory = new Directory(
    Paths.document,
    'offline',
    'photos'
);

/**
 * Возвращает файл фотографии по её идентификатору.
 */
function getPhotoFile(fileId: string): File {
    // Кодируем идентификатор, чтобы он не содержал
    // символов, влияющих на путь к файлу.
    return new File(
        photosDirectory,
        `${encodeURIComponent(fileId)}.img`
    );
}

/**
 * Возвращает URI сохранённой фотографии,
 * если файл существует.
 */
export function getOfflinePhotoUri(
    fileId: string
): string | null {
    const file = getPhotoFile(fileId);

    return file.exists ? file.uri : null;
}

/**
 * Скачивает фотографию в локальное хранилище.
 * Уже сохранённые фотографии повторно не скачиваются,
 * если forceUpdate = false.
 */
export async function downloadPhoto(
    fileId: string,
    url: string,
    token: string,
    forceUpdate = false
): Promise<string> {
    if (!photosDirectory.exists) {
        photosDirectory.create({ intermediates: true });
    }

    const file = getPhotoFile(fileId);

    if (file.exists && !forceUpdate) {
        return file.uri;
    }

    const downloadedFile = await File.downloadFileAsync(
        url,
        file,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            idempotent: forceUpdate,
        }
    );

    return downloadedFile.uri;
}
