import { useSyncExternalStore } from 'react';

import { getPersonPhotos, photoUrl } from '@/hooks/use-image-person';
import { buildPersonsUrl, dayOfYearFilter, fetchAllPersons, type Person } from '@/hooks/use-persons';
import { writeCache } from '@/utils/api-cache';
import { apiFetch } from '@/utils/api-fetch';
import { removePhotos, savePhoto } from '@/utils/offline-photos';
import { readStored, removeStored, writeStored } from '@/utils/storage';

/**
 * Скачивание базы по месяцам — чтобы читать без интернета, например в поездке.
 *
 * Скачанное кладётся туда же, откуда его и так берут экраны, когда нет сети
 * (см. `useApiResource`): списки дней — под ключами «Сегодня» и «Календаря»,
 * биографии — под ключом страницы новомученика. Поэтому отдельного «режима
 * без сети» нет: приложение просто находит всё в кэше. Фотографии — в своей
 * папке (см. `offline-photos`).
 *
 * Месяц — это дни памяти, то есть месяц кончины. Состояние загрузки живёт в
 * модуле, а не в экране настроек: с него можно уйти, а скачивание продолжится.
 */

/** Сколько запросов идёт одновременно: быстрее, но без нагрузки на сервер. */
const CONCURRENCY = 6;

const MANIFEST_KEY = 'downloads.manifest';

export type MonthDownload = {
    /** Когда скачан. */
    at: number;
    persons: number;
    photos: number;
    withPhotos: boolean;
};

/** Скачанные месяцы: номер месяца (1–12) → сведения о загрузке. */
export type Manifest = Record<number, MonthDownload>;

export type DownloadState =
    | { status: 'idle' }
    | {
        status: 'running';
        month: number;
        /** «Списки дней», «Биографии», «Фотографии». */
        stage: string;
        done: number;
        total: number;
        /** Месяцев готово из выбранных. */
        monthsDone: number;
        monthsTotal: number;
    }
    | { status: 'done'; failed: number }
    | { status: 'cancelled' }
    | { status: 'error'; error: Error };

let state: DownloadState = { status: 'idle' };
let manifest: Manifest = {};
let manifestLoaded: Promise<void> | null = null;
let controller: AbortController | null = null;

const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((listener) => listener());
}

function setState(next: DownloadState) {
    state = next;
    emit();
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    void loadManifest();
    return () => listeners.delete(listener);
}

function loadManifest() {
    manifestLoaded ??= readStored(MANIFEST_KEY).then((raw) => {
        try {
            manifest = raw ? (JSON.parse(raw) as Manifest) : {};
        } catch {
            manifest = {};
        }
        emit();
    });
    return manifestLoaded;
}

async function saveManifest(next: Manifest) {
    manifest = next;
    emit();
    await writeStored(MANIFEST_KEY, JSON.stringify(next));
}

export function useDownloadState() {
    return useSyncExternalStore(subscribe, () => state, () => state);
}

export function useManifest() {
    return useSyncExternalStore(subscribe, () => manifest, () => manifest);
}

class Cancelled extends Error { }

/** Сколько дней в месяце — по високосному году: 29 февраля тоже день памяти. */
function daysIn(month: number) {
    return new Date(2024, month, 0).getDate();
}

/**
 * Задачи по `CONCURRENCY` штук за раз. Ошибка отдельной задачи не
 * останавливает остальные — она только считается.
 */
async function runPool<T>(
    items: readonly T[],
    task: (item: T) => Promise<void>,
    signal: AbortSignal,
    onDone: (done: number) => void
): Promise<number> {
    let next = 0;
    let done = 0;
    let failed = 0;

    const worker = async () => {
        while (next < items.length) {
            if (signal.aborted) throw new Cancelled();
            const item = items[next];
            next += 1;

            try {
                await task(item);
            } catch (error) {
                if (signal.aborted) throw new Cancelled();
                failed += 1;
                console.warn('Не удалось скачать:', error);
            }

            done += 1;
            onDone(done);
        }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
    return failed;
}

async function downloadMonth(
    month: number,
    withPhotos: boolean,
    signal: AbortSignal,
    progress: (stage: string, done: number, total: number) => void
): Promise<{ failed: number; persons: number; photos: number }> {
    let failed = 0;

    // 1. Списки дней — как их запрашивают «Сегодня» и «Календарь».
    const days = Array.from({ length: daysIn(month) }, (_, index) => index + 1);
    const numbers = new Set<number>();

    progress('Списки дней', 0, days.length);
    failed += await runPool(
        days,
        async (day) => {
            const key = buildPersonsUrl({ filter: dayOfYearFilter(month, day) });
            const list = await fetchAllPersons(key);
            await writeCache(key, list);
            list.items.forEach((person) => numbers.add(person.Номер));
        },
        signal,
        (done) => progress('Списки дней', done, days.length)
    );

    // 2. Биографии целиком — как их запрашивает страница новомученика.
    const persons = [...numbers];
    const photoIds: string[] = [];

    progress('Биографии', 0, persons.length);
    failed += await runPool(
        persons,
        async (number) => {
            const key = `public/dela/${number}`;
            const person = await apiFetch<Person>(key);
            await writeCache(key, person);
            if (withPhotos) photoIds.push(...getPersonPhotos(person.Фотографии).map((photo) => photo.fileId));
        },
        signal,
        (done) => progress('Биографии', done, persons.length)
    );

    // 3. Фотографии — сжатые, те же, что показывает приложение.
    if (withPhotos && photoIds.length > 0) {
        progress('Фотографии', 0, photoIds.length);
        failed += await runPool(
            photoIds,
            // Сначала HTTPS, при отказе — HTTP, как и при показе снимков.
            (fileId) => savePhoto(photoUrl(fileId), fileId).catch(() => savePhoto(photoUrl(fileId, false), fileId)),
            signal,
            (done) => progress('Фотографии', done, photoIds.length)
        );
    }

    return { failed, persons: persons.length, photos: photoIds.length };
}

/** Скачать выбранные месяцы. Если загрузка уже идёт, второй не будет. */
export async function startDownload(months: readonly number[], withPhotos: boolean) {
    if (state.status === 'running' || months.length === 0) return;

    await loadManifest();
    controller = new AbortController();
    const { signal } = controller;
    let failed = 0;

    const sorted = [...months].sort((a, b) => a - b);

    try {
        for (let index = 0; index < sorted.length; index += 1) {
            const month = sorted[index];
            const result = await downloadMonth(month, withPhotos, signal, (stage, done, total) =>
                setState({
                    status: 'running',
                    month,
                    stage,
                    done,
                    total,
                    monthsDone: index,
                    monthsTotal: sorted.length,
                })
            );

            failed += result.failed;
            await saveManifest({
                ...manifest,
                [month]: { at: Date.now(), persons: result.persons, photos: result.photos, withPhotos },
            });
        }

        setState({ status: 'done', failed });
    } catch (error) {
        if (error instanceof Cancelled || signal.aborted) setState({ status: 'cancelled' });
        else setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) });
    } finally {
        controller = null;
    }
}

export function cancelDownload() {
    controller?.abort();
}

/**
 * Забыть скачанное: отметки о месяцах и фотографии. Сами биографии остаются
 * в общем кэше — они и без скачивания там лежат, их обновит сеть.
 */
export async function clearDownloads() {
    cancelDownload();
    removePhotos();
    await removeStored(MANIFEST_KEY);
    manifest = {};
    setState({ status: 'idle' });
}
