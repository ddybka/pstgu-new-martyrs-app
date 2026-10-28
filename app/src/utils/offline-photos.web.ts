/**
 * В вебе скачивания базы нет (см. `settings`), и своих фотографий на
 * устройстве — тоже: снимки кэширует сам браузер.
 */

export function localPhotoUri(_fileId: string): string | null {
    return null;
}

export async function savePhoto(_url: string, _fileId: string) { }

export function photosSize(): number {
    return 0;
}

export function removePhotos() { }
