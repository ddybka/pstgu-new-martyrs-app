import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { dropCache, readCache, writeCache } from '@/utils/api-cache';
import { ApiError, apiFetch } from '@/utils/api-fetch';

/**
 * Один запрос к API как состояние экрана: загрузка, обновление, офлайн, удаление.
 *
 * Сеть главнее кэша. Сведения в базе правят и удаляют, поэтому удачный ответ
 * всегда перезаписывает сохранённую копию целиком, а не дополняет её: пропавшие
 * записи пропадают и здесь.
 *
 * Кэш — на случай «сети нет». Он показывается, когда запрос не удался, и экран
 * честно говорит, от какого числа данные.
 */

/** Столько кэш считается свежим и показывается сразу, без скелетов. */
const FRESH_MS = 10 * 60 * 1000;

export type ApiResource<T> = {
    data: T | null;
    loading: boolean;
    refreshing: boolean;
    error: Error | null;
    /** Показана сохранённая копия: сеть не ответила. */
    stale: boolean;
    /** Сервер ответил 404 — записи в базе нет. */
    absent: boolean;
    updatedAt: number | null;
    refresh: () => Promise<void>;
};

type State<T> = Omit<ApiResource<T>, 'refresh'>;

const EMPTY: State<never> = {
    data: null,
    loading: false,
    refreshing: false,
    error: null,
    stale: false,
    absent: false,
    updatedAt: null,
};

function asError(error: unknown) {
    return error instanceof Error ? error : new Error(String(error));
}

function initialFor<T>(key: string | null): State<T> {
    return key === null ? { ...EMPTY, absent: true } : { ...EMPTY, loading: true };
}

export type UseApiResourceOptions = {
    freshMs?: number;
};

export function useApiResource<T>(
    key: string | null,
    { freshMs = FRESH_MS }: UseApiResourceOptions = {}
): ApiResource<T> {
    // Состояние хранится вместе с ключом, которому оно принадлежит, и
    // сбрасывается прямо в отрисовке, как только ключ сменился. Так на экране
    // никогда не оказывается список прошлой даты: в том же кадре, где выбрана
    // новая, уже видны скелеты.
    const [snapshot, setSnapshot] = useState<{ key: string | null; state: State<T> }>(() => ({
        key,
        state: initialFor<T>(key),
    }));

    if (snapshot.key !== key) setSnapshot({ key, state: initialFor<T>(key) });

    const state = snapshot.key === key ? snapshot.state : initialFor<T>(key);

    const setState = useCallback((next: State<T> | ((prev: State<T>) => State<T>)) => {
        setSnapshot((prev) => ({
            key: prev.key,
            state: typeof next === 'function' ? (next as (prev: State<T>) => State<T>)(prev.state) : next,
        }));
    }, []);

    // Номер поколения: ответ на прошлый ключ не должен попасть в состояние
    // нового. Сравнение по номеру, а не по флагу отмены, заодно отсекает
    // обновление, запущенное до смены даты.
    const generation = useRef(0);
    const updatedAt = useRef<number | null>(null);

    useEffect(() => {
        updatedAt.current = state.updatedAt;
    }, [state.updatedAt]);

    const run = useCallback(
        async (mode: 'initial' | 'refresh') => {
            if (key === null) return;

            const current = (generation.current += 1);
            const alive = () => generation.current === current;

            if (mode === 'initial') {
                const cached = await readCache<T>(key);
                if (!alive()) return;

                if (cached && Date.now() - cached.fetchedAt < freshMs) {
                    setState((prev) => ({
                        ...prev,
                        data: cached.data,
                        loading: false,
                        updatedAt: cached.fetchedAt,
                    }));
                }
            }

            try {
                const data = await apiFetch<T>(key);
                if (!alive()) return;

                setState({
                    data,
                    loading: false,
                    refreshing: false,
                    error: null,
                    stale: false,
                    absent: false,
                    updatedAt: Date.now(),
                });

                void writeCache(key, data);
            } catch (error) {
                if (!alive()) return;

                if (error instanceof ApiError && error.status === 404) {
                    await dropCache(key);
                    if (!alive()) return;

                    setState({ ...EMPTY, absent: true });
                    return;
                }

                console.error(`Не удалось загрузить ${key}:`, error);

                const cached = await readCache<T>(key);
                if (!alive()) return;

                setState(
                    cached
                        ? {
                            ...EMPTY,
                            data: cached.data,
                            stale: true,
                            updatedAt: cached.fetchedAt,
                        }
                        : { ...EMPTY, error: asError(error) }
                );
            }
        },
        [key, freshMs, setState]
    );

    useEffect(() => {
        if (key === null) return;

        void run('initial');

        return () => {
            generation.current += 1;
        };
    }, [key, run]);

    useEffect(() => {
        if (key === null) return;

        const subscription = AppState.addEventListener('change', (status) => {
            if (status !== 'active') return;
            if (updatedAt.current !== null && Date.now() - updatedAt.current < freshMs) return;

            void run('refresh');
        });

        return () => subscription.remove();
    }, [key, run, freshMs]);

    const refresh = useCallback(async () => {
        if (key === null) return;

        setState((prev) => ({ ...prev, refreshing: true }));
        await run('refresh');
    }, [key, run, setState]);

    return { ...state, refresh };
}
