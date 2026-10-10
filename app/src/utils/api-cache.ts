import { readStored, removeStored, writeStored } from './storage';

/**
 * Офлайн-копия ответов API.
 *
 * Если в приложении нет соединения с сервером, то данные будут браться с кэша, а если
 * есть соединение, то данные будут браться c api и записшуться в кэш.
 */

const VERSION = 1;

type Entry<T> = {
    version: number;
    key: string;
    fetchedAt: number;
    data: T;
};

export type Cached<T> = {
    data: T;
    /** Время ответа сервера. */
    fetchedAt: number;
};

export async function readCache<T>(key: string): Promise<Cached<T> | null> {
    const raw = await readStored(key);
    if (!raw) return null;

    try {
        const entry = JSON.parse(raw) as Entry<T>;

        if (entry?.version !== VERSION) return null;
        if (entry.key !== key) return null;
        if (typeof entry.fetchedAt !== 'number') return null;

        return { data: entry.data, fetchedAt: entry.fetchedAt };
    } catch {
        return null;
    }
}

export async function writeCache<T>(key: string, data: T): Promise<void> {
    const entry: Entry<T> = { version: VERSION, key, fetchedAt: Date.now(), data };

    try {
        await writeStored(key, JSON.stringify(entry));
    } catch (error) {
        console.warn('Не удалось сериализовать кэш:', error);
    }
}

export async function dropCache(key: string): Promise<void> {
    await removeStored(key);
}
