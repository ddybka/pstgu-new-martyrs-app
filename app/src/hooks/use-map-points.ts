import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import type { MartyrPoint } from '@/components/map/map-config';
import { readCache, writeCache } from '@/utils/api-cache';

/**
 * Точки для карты.
 *
 * Источник — `http://map.nmbook.ru/map/all_points`, проект тех же авторов:
 * координаты там расставлены по биографиям вручную специалистом по
 * исторической географии, а `humanId` в этой выдаче — это `Номер` дела в
 * основном API. Поэтому связывать точки с новомучениками ничего не стоит:
 * номер и есть ключ.
 *
 * Данных три слоя, и порядок между ними такой.
 *
 * 1. Снимок в бандле (`src/data/map-points.json`) — первый кадр: карта рисуется
 *    без сети и без пустого экрана. Пересобирается скриптом
 *    `scripts/build-map-points.mjs`.
 * 2. Сохранённая копия последней загрузки — если она новее снимка в бандле.
 * 3. Свежая выдача из сети, раз в сутки и в фоне. Она побеждает всегда:
 *    точки на той стороне правят, добавляют и удаляют, а вечный снимок в
 *    бандле показывал бы места дел, которых в базе уже нет.
 *
 * В вебе сети здесь нет: у `map.nmbook.ru` не отдаётся
 * `Access-Control-Allow-Origin`, и браузер запрос не выпускает вовсе,
 * там остаются снимок и копия.
 *
 * Состояние вынесено в модуль, а не в хук: карту показывают и вкладка, и
 * страница новомученика, а загрузка на всех одна.
 */

const SOURCE = 'http://map.nmbook.ru/map/all_points';
/** Сначала HTTPS; не ответил — тот же адрес по HTTP (как у API, см. `api-fetch`). */
const SOURCES = [SOURCE.replace(/^http:/, 'https:'), SOURCE];
// Версия в ключе: копия прошлого формата (без текстов событий) читаться не
// должна — с ней карта показала бы точки без описаний.
const CACHE_KEY = 'map-points-v2';

const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 45_000;

/** Номер дела, широта, долгота, индекс типа, датировка, текст события. */
type SnapshotPoint = [number, number, number, number, string, string];

type Snapshot = {
    source: string;
    builtAt?: number;
    types: string[];
    /** Заголовок биографии по номеру дела — один на все точки человека. */
    titles: Record<string, string>;
    points: SnapshotPoint[];
};

type RawPoint = {
    humanId: number;
    humanFio?: string;
    N: number;
    E: number;
    clusterType: string;
    dating?: string;
    description?: string;
};

function toPoints(snapshot: Snapshot): MartyrPoint[] {
    return snapshot.points.map(([number, latitude, longitude, type, dating, text], index) => ({
        id: index,
        number,
        kind: snapshot.types[type] ?? '',
        latitude,
        longitude,
        title: snapshot.titles[number] ?? `Дело №${number}`,
        dating,
        text,
    }));
}

/** То же, что делает `scripts/build-map-points.mjs`, — форматы обязаны совпадать. */
function condense(raw: RawPoint[]): Snapshot {
    const types = [...new Set(raw.map((point) => point.clusterType))].sort();
    const titles: Record<string, string> = {};

    const points = raw
        .filter((point) => Number.isFinite(point.N) && Number.isFinite(point.E))
        .map((point): SnapshotPoint => {
            if (point.humanFio) titles[point.humanId] = point.humanFio;

            return [
                point.humanId,
                Number(point.N.toFixed(5)),
                Number(point.E.toFixed(5)),
                types.indexOf(point.clusterType),
                point.dating ?? '',
                point.description ?? '',
            ];
        });

    return { source: SOURCE, builtAt: Date.now(), types, titles, points };
}

/**
 * Снимок в бандле подключается динамическим импортом, а не сверху модуля.
 *
 * Это почти два мегабайта: статический импорт разбирал их при запуске
 * приложения, даже если до карты не доходили, а в вебе клал их в общий
 * скрипт, который качается на любой странице. Так в вебе снимок уходит
 * в отдельный файл, а на нативе разбирается только тогда, когда понадобился
 * (см. `preloadMapPoints`).
 */
async function loadBundled(): Promise<Snapshot> {
    const module = await import('@/data/map-points.json');
    return ((module as { default?: unknown }).default ?? module) as Snapshot;
}

const NO_POINTS: MartyrPoint[] = [];

let current: Snapshot | null = null;
let points: MartyrPoint[] = NO_POINTS;
let updatedAt = 0;

const listeners = new Set<() => void>();

function publish(snapshot: Snapshot, fetchedAt: number) {
    current = snapshot;
    points = toPoints(snapshot);
    updatedAt = fetchedAt;
    listeners.forEach((listener) => listener());
}

/**
 * Свежая выдача обычно совпадает с той, что уже на экране: точки правят
 * редко. Тогда публиковать её незачем — карта заново разбирала бы и
 * кластеризовала восемь тысяч точек, а выбранные события сбрасывались бы.
 */
function sameSnapshot(a: Snapshot, b: Snapshot) {
    if (a.points.length !== b.points.length) return false;
    if (a.types.join('\n') !== b.types.join('\n')) return false;

    for (let i = 0; i < a.points.length; i += 1) {
        const x = a.points[i];
        const y = b.points[i];
        for (let j = 0; j < x.length; j += 1) if (x[j] !== y[j]) return false;
        if (a.titles[x[0]] !== b.titles[y[0]]) return false;
    }

    return true;
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getSnapshot() {
    return points;
}

async function fetchFirstAvailable(signal: AbortSignal): Promise<Response> {
    let lastError: unknown;

    for (const url of SOURCES) {
        try {
            const response = await fetch(url, { signal });
            if (!response.ok) throw new Error(`${url} ответил ${response.status}`);
            return response;
        } catch (error) {
            if (signal.aborted) throw error;
            lastError = error;
        }
    }

    throw lastError;
}

async function fetchPoints(): Promise<Snapshot> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetchFirstAvailable(controller.signal);

        const raw = (await response.json()) as RawPoint[];
        if (!Array.isArray(raw) || raw.length === 0) throw new Error('Пустая выдача точек');

        return condense(raw);
    } finally {
        clearTimeout(timer);
    }
}

let loading: Promise<void> | null = null;
let restored: Promise<void> | null = null;

/**
 * Первые точки — из сохранённой копии или снимка в бандле, что новее.
 * Один раз за запуск: дальше точки живут в памяти модуля.
 */
function restore(): Promise<void> {
    restored ??= (async () => {
        const [cached, bundled] = await Promise.all([readCache<Snapshot>(CACHE_KEY), loadBundled()]);
        const builtAt = bundled.builtAt ?? 0;

        if (cached && cached.fetchedAt > builtAt) publish(cached.data, cached.fetchedAt);
        else publish(bundled, builtAt);
    })().catch((error) => {
        console.warn('Не удалось прочитать точки карты:', error);
    });

    return restored;
}

/**
 * Поднять копию из кэша и, если пора, сходить за свежей.
 *
 * Вызывается со всех экранов с картой и заранее, после запуска (см.
 * `preloadMapPoints`), но работает один раз: повторные вызовы ждут ту же
 * загрузку.
 *
 * Свежая выдача запрашивается, когда показанным точкам больше суток: снимку
 * в бандле — со сборки приложения, сохранённой копии — с прошлой загрузки.
 */
export function loadMapPoints(force = false): Promise<void> {
    if (loading) return loading;

    loading = (async () => {
        await restore();

        if (Platform.OS === 'web') return;
        if (!force && Date.now() - updatedAt < REFRESH_AFTER_MS) return;

        try {
            const snapshot = await fetchPoints();
            const fetchedAt = Date.now();

            if (current && sameSnapshot(current, snapshot)) updatedAt = fetchedAt;
            else publish(snapshot, fetchedAt);

            // Копия пишется и без изменений — ради даты: иначе после
            // перезапуска точки снова считались бы устаревшими.
            void writeCache(CACHE_KEY, snapshot);
        } catch (error) {
            console.warn('Не удалось обновить точки карты:', error);
        }
    })().finally(() => {
        loading = null;
    });

    return loading;
}

/**
 * Подготовить карту заранее, пока пользователь на первом экране: точки
 * разобраны, стиль подложки скачан. Иначе всё это начиналось бы в момент
 * открытия вкладки, и карта долго стояла бы пустой.
 */
export function preloadMapPoints() {
    void loadMapPoints();
}

/**
 * Все точки — для вкладки карты. Пока точки не прочитаны — пустой список.
 * `enabled: false` — не загружать их отсюда (в вебе это четыреста килобайт).
 */
export function useMapPoints(enabled = true): MartyrPoint[] {
    useEffect(() => {
        if (enabled) void loadMapPoints();
    }, [enabled]);

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Точки по номерам дел — один проход по всему списку на все страницы
 * новомучеников, а не фильтр восьми тысяч точек на каждую.
 */
const byNumberCache = new WeakMap<MartyrPoint[], Map<number, MartyrPoint[]>>();

function pointsOf(all: MartyrPoint[], number: number) {
    let byNumber = byNumberCache.get(all);

    if (!byNumber) {
        byNumber = new Map();
        for (const point of all) {
            const list = byNumber.get(point.number);
            if (list) list.push(point);
            else byNumber.set(point.number, [point]);
        }
        byNumberCache.set(all, byNumber);
    }

    return byNumber.get(number) ?? NO_POINTS;
}

/** Точки одного дела, для карты на странице новомученика. */
export function usePersonMapPoints(number: number | null, enabled = true): MartyrPoint[] {
    const all = useMapPoints(enabled && number !== null);

    return useMemo(() => (number === null ? NO_POINTS : pointsOf(all, number)), [all, number]);
}

export function boundsOf(points: MartyrPoint[]): [[number, number], [number, number]] | null {
    if (points.length === 0) return null;

    let west = points[0].longitude;
    let east = points[0].longitude;
    let south = points[0].latitude;
    let north = points[0].latitude;

    for (const point of points) {
        west = Math.min(west, point.longitude);
        east = Math.max(east, point.longitude);
        south = Math.min(south, point.latitude);
        north = Math.max(north, point.latitude);
    }

    return [
        [west, south],
        [east, north],
    ];
}
