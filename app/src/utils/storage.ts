import { Directory, File, Paths } from 'expo-file-system';

/**
* Кэширование для хранения данных
 */

const DIRECTORY = 'api-cache';

function hash(key: string) {
    let value = 0x811c9dc5;

    for (let i = 0; i < key.length; i += 1) {
        value ^= key.charCodeAt(i);
        value = Math.imul(value, 0x01000193);
    }

    return (value >>> 0).toString(16).padStart(8, '0');
}

function fileFor(key: string) {
    const directory = new Directory(Paths.document, DIRECTORY);
    if (!directory.exists) directory.create({ intermediates: true });

    return new File(directory, `${hash(key)}-${key.length.toString(16)}.json`);
}

export async function readStored(key: string): Promise<string | null> {
    try {
        const file = fileFor(key);
        return file.exists ? await file.text() : null;
    } catch {
        return null;
    }
}

export async function writeStored(key: string, value: string): Promise<void> {
    try {
        const file = fileFor(key);
        if (!file.exists) file.create({ intermediates: true });
        file.write(value);
    } catch (error) {
        // Если не записали в кэш, то после пробуем подключиться к сети
        console.warn('Не удалось сохранить кэш:', error);
    }
}

export async function removeStored(key: string): Promise<void> {
    try {
        const file = fileFor(key);
        if (file.exists) file.delete();
    } catch (error) {
        console.warn('Не удалось удалить кэш:', error);
    }
}
