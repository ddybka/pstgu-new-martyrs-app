import { useCallback, useEffect, useRef, useState } from 'react';

import { NetworkError, apiFetch } from '@/utils/api-fetch';
import { offlineSearchAvailable, searchOffline } from '@/utils/persons-index';

/**
 * Полнотекстовый поиск по биографиям.
 *
 * Ищет API (`text_filter`): слова — в любой словоформе, «слово*» — по началу.
 * Выдача уже отсортирована по релевантности, и к каждой записи API прикладывает
 * фрагмент биографии с совпадениями в `<mark>`.
 *
 * Без сети поиск сводится к ФИО по списку в бандле (см. `persons-index`):
 * биографий на устройстве нет, а список имён весит немного.
 */

export type SearchHit = {
    number: number;
    /** ФИО по-справочному: «АБРАМОВ Сергей Николаевич». */
    name: string;
    rank: string;
    born: number | null;
    died: number | null;
    /** Фрагмент биографии с `<mark>`; без сети его нет. */
    snippet: string | null;
};

export type PersonSearch = {
    hits: SearchHit[];
    total: number;
    loading: boolean;
    loadingMore: boolean;
    error: Error | null;
    /** Сети нет — показан поиск по ФИО. */
    offline: boolean;
    /** Запрос слишком короткий, поиска не было. */
    idle: boolean;
    loadMore: () => void;
    retry: () => void;
};

type SearchItem = {
    Номер: number;
    ФИО?: string;
    сан_церк_служение?: string;
    год_рождения?: number;
    год_кончины?: number;
    пояснение?: string;
};

type SearchResponse = {
    items: SearchItem[];
    total_docs_count: number;
    has_next: boolean;
};

export const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

function toHit(item: SearchItem): SearchHit {
    return {
        number: item.Номер,
        name: item.ФИО ?? `Дело №${item.Номер}`,
        rank: item.сан_церк_служение ?? '',
        born: item.год_рождения ?? null,
        died: item.год_кончины ?? null,
        snippet: item.пояснение ?? null,
    };
}

function fetchPage(query: string, skip: number) {
    const params = new URLSearchParams({
        data_format: 'item',
        text_filter: query,
        skip: String(skip),
        take: String(PAGE_SIZE),
    });

    return apiFetch<SearchResponse>(`public/dela?${params.toString()}`);
}

type State = Omit<PersonSearch, 'loadMore' | 'retry' | 'idle'> & { hasNext: boolean };

const EMPTY: State = {
    hits: [],
    total: 0,
    loading: false,
    loadingMore: false,
    error: null,
    offline: false,
    hasNext: false,
};

export function usePersonSearch(rawQuery: string): PersonSearch {
    const query = rawQuery.trim().replace(/\s+/g, ' ');
    const idle = query.length < MIN_QUERY_LENGTH;

    const [attempt, setAttempt] = useState(0);

    // Состояние хранится вместе с запросом, которому принадлежит, и
    // сбрасывается прямо в отрисовке, как только запрос сменился (как в
    // `useApiResource`): в том же кадре видна загрузка, а не прошлая выдача.
    const key = idle ? null : `${attempt}:${query}`;
    const initial = (): State => (key === null ? EMPTY : { ...EMPTY, loading: true });
    const [snapshot, setSnapshot] = useState<{ key: string | null; state: State }>(() => ({ key, state: initial() }));

    if (snapshot.key !== key) setSnapshot({ key, state: initial() });

    const state = snapshot.key === key ? snapshot.state : initial();
    const setState = useCallback((next: State | ((prev: State) => State)) => {
        setSnapshot((prev) => ({ key: prev.key, state: typeof next === 'function' ? next(prev.state) : next }));
    }, []);

    // Ответ на прошлый запрос не должен попасть в выдачу нового: пока печатают,
    // запросы обгоняют друг друга.
    const generation = useRef(0);

    useEffect(() => {
        const current = (generation.current += 1);
        const alive = () => generation.current === current;

        if (idle) return;

        const timer = setTimeout(async () => {
            try {
                const page = await fetchPage(query, 0);
                if (!alive()) return;

                setState({
                    ...EMPTY,
                    hits: page.items.map(toHit),
                    total: page.total_docs_count,
                    hasNext: page.has_next,
                });
            } catch (error) {
                if (!alive()) return;

                if (error instanceof NetworkError && offlineSearchAvailable) {
                    const hits = searchOffline(query);
                    setState({ ...EMPTY, hits, total: hits.length, offline: true });
                    return;
                }

                setState({ ...EMPTY, error: error instanceof Error ? error : new Error(String(error)) });
            }
        }, DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [query, idle, attempt, setState]);

    const loadMore = useCallback(() => {
        if (state.loading || state.loadingMore || !state.hasNext || state.offline) return;

        const current = generation.current;
        setState((prev) => ({ ...prev, loadingMore: true }));

        fetchPage(query, state.hits.length)
            .then((page) => {
                if (generation.current !== current) return;

                setState((prev) => ({
                    ...prev,
                    hits: [...prev.hits, ...page.items.map(toHit)],
                    total: page.total_docs_count,
                    hasNext: page.has_next && page.items.length > 0,
                    loadingMore: false,
                }));
            })
            .catch((error) => {
                if (generation.current !== current) return;

                // Следующая страница не пришла — то, что уже найдено, остаётся,
                // а долистав до конца ещё раз, можно попробовать снова.
                console.warn('Не удалось загрузить следующую страницу поиска:', error);
                setState((prev) => ({ ...prev, loadingMore: false }));
            });
    }, [query, state, setState]);

    const retry = useCallback(() => setAttempt((n) => n + 1), []);

    return {
        hits: state.hits,
        total: state.total,
        loading: state.loading,
        loadingMore: state.loadingMore,
        error: state.error,
        offline: state.offline,
        idle,
        loadMore,
        retry,
    };
}
