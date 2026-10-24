import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import type { MartyrPoint } from '@/components/map/map-config';
import bundled from '@/data/map-points.json';
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
 *    сразу, без сети и без пустого экрана. Пересобирается скриптом
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
const CACHE_KEY = 'map-points';

const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 45_000;

type Snapshot = {
    source: string;
    builtAt?: number;
    types: string[];
    points: [number, number, number, number][];
};

type RawPoint = {
    humanId: number;
    N: number;
    E: number;
    clusterType: string;
};

function toPoints(snapshot: Snapshot): MartyrPoint[] {
    return snapshot.points.map(([number, latitude, longitude, type], index) => ({
        id: index,
        number,
        kind: snapshot.types[type] ?? '',
        latitude,
        longitude,
    }));
}

function condense(raw: RawPoint[]): Snapshot {
    const types = [...new Set(raw.map((point) => point.clusterType))].sort();

    const points = raw
        .filter((point) => Number.isFinite(point.N) && Number.isFinite(point.E))
        .map(
            (point) =>
                [
                    point.humanId,
                    Number(point.N.toFixed(5)),
                    Number(point.E.toFixed(5)),
                    types.indexOf(point.clusterType),
                ] as [number, number, number, number]
        );

    return { source: SOURCE, builtAt: Date.now(), types, points };
}

const BUNDLED = bundled as Snapshot;

let points: MartyrPoint[] = toPoints(BUNDLED);
let updatedAt: number = BUNDLED.builtAt ?? 0;

const listeners = new Set<() => void>();

function publish(snapshot: Snapshot, fetchedAt: number) {
    points = toPoints(snapshot);
    updatedAt = fetchedAt;
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getSnapshot() {
    return points;
}

async function fetchPoints(): Promise<Snapshot> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(SOURCE, { signal: controller.signal });
        if (!response.ok) throw new Error(`${SOURCE} ответил ${response.status}`);

        const raw = (await response.json()) as RawPoint[];
        if (!Array.isArray(raw) || raw.length === 0) throw new Error('Пустая выдача точек');

        return condense(raw);
    } finally {
        clearTimeout(timer);
    }
}

let loading: Promise<void> | null = null;
let restored = false;

/**
 * Поднять копию из кэша и, если пора, сходить за свежей.
 *
 * Вызывается со всех экранов с картой, но работает один раз: повторные вызовы
 * ждут ту же загрузку.
 */
export function loadMapPoints(force = false): Promise<void> {
    if (loading) return loading;

    loading = (async () => {
        if (!restored) {
            restored = true;

            const cached = await readCache<Snapshot>(CACHE_KEY);

            if (cached && cached.fetchedAt > (BUNDLED.builtAt ?? 0)) {
                publish(cached.data, cached.fetchedAt);
            }
        }

        if (Platform.OS === 'web') return;
        if (!force && Date.now() - updatedAt < REFRESH_AFTER_MS) return;

        try {
            const snapshot = await fetchPoints();
            publish(snapshot, Date.now());
            void writeCache(CACHE_KEY, snapshot);
        } catch (error) {
            console.warn('Не удалось обновить точки карты:', error);
        }
    })().finally(() => {
        loading = null;
    });

    return loading;
}

/** Все точки — для вкладки карты. */
export function useMapPoints(): MartyrPoint[] {
    useEffect(() => {
        void loadMapPoints();
    }, []);

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Точки одного дела, для карты на странице новомученика. */
export function usePersonMapPoints(number: number | null): MartyrPoint[] {
    const all = useMapPoints();

    return useMemo(() => {
        if (number === null) return [];
        return all.filter((point) => point.number === number);
    }, [all, number]);
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
