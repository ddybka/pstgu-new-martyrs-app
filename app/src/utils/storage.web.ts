/**
 * Веб-версия хранилища из `storage.ts` на localStorage.
 */

const PREFIX = 'nmbook.cache.';

function storage() {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
}

export async function readStored(key: string): Promise<string | null> {
    try {
        return storage()?.getItem(PREFIX + key) ?? null;
    } catch {
        return null;
    }
}

export async function writeStored(key: string, value: string): Promise<void> {
    try {
        storage()?.setItem(PREFIX + key, value);
    } catch (error) {
        console.warn('Не удалось сохранить кэш:', error);
    }
}

export async function removeStored(key: string): Promise<void> {
    try {
        storage()?.removeItem(PREFIX + key);
    } catch (error) {
        console.warn('Не удалось удалить кэш:', error);
    }
}
