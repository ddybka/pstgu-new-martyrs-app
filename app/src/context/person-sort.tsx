import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { readStored, writeStored } from '@/utils/storage';

/**
 * Порядок карточек в списках «Сегодня» и «Календаря».
 *
 * - `rank` — по сану, от высшего к низшему (по умолчанию);
 * - `alphabet` — по алфавиту в выбранном порядке ФИО (см. `name-order`).
 */
export type PersonSort = 'rank' | 'alphabet';

export const PERSON_SORTS: { value: PersonSort; label: string }[] = [
    { value: 'rank', label: 'По сану' },
    { value: 'alphabet', label: 'По алфавиту' },
];

const DEFAULT_SORT: PersonSort = 'rank';
const STORAGE_KEY = 'settings.person-sort';

type PersonSortContextType = {
    sort: PersonSort;
    setSort: (sort: PersonSort) => void;
};

const PersonSortContext = createContext<PersonSortContextType>({
    sort: DEFAULT_SORT,
    setSort: () => { },
});

function isPersonSort(value: unknown): value is PersonSort {
    return value === 'rank' || value === 'alphabet';
}

export function PersonSortProvider({ children }: { children: ReactNode }) {
    const [sort, setSortState] = useState<PersonSort>(DEFAULT_SORT);
    // Выбор, сделанный до того, как хранилище ответило, важнее сохранённого.
    const chosen = useRef(false);

    useEffect(() => {
        let cancelled = false;

        readStored(STORAGE_KEY).then((stored) => {
            if (!cancelled && !chosen.current && isPersonSort(stored)) setSortState(stored);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    const setSort = (next: PersonSort) => {
        chosen.current = true;
        setSortState(next);
        void writeStored(STORAGE_KEY, next);
    };

    return <PersonSortContext value={{ sort, setSort }}>{children}</PersonSortContext>;
}

export function usePersonSort() {
    return useContext(PersonSortContext);
}
