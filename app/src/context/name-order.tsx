import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import type { NameOrder } from '@/utils/person-name';
import { readStored, writeStored } from '@/utils/storage';

/**
 * Порядок частей ФИО во всём приложении: в списках, поиске, на карте и на
 * странице новомученика (см. `formatPersonName`).
 *
 * По умолчанию — привычный «Имя Отчество Фамилия»; справочный, как в базе,
 * с фамилией вперёд, выбирается в настройках.
 */
export const NAME_ORDERS: { value: NameOrder; label: string; example: string }[] = [
    { value: 'name-first', label: 'Имя', example: 'ПАВЕЛ Иванович Алмазов' },
    { value: 'surname-first', label: 'Фамилия', example: 'АЛМАЗОВ Павел Иванович' },
];

const DEFAULT_ORDER: NameOrder = 'name-first';
const STORAGE_KEY = 'settings.name-order';

type NameOrderContextType = {
    order: NameOrder;
    setOrder: (order: NameOrder) => void;
};

const NameOrderContext = createContext<NameOrderContextType>({
    order: DEFAULT_ORDER,
    setOrder: () => { },
});

function isNameOrder(value: unknown): value is NameOrder {
    return value === 'name-first' || value === 'surname-first';
}

export function NameOrderProvider({ children }: { children: ReactNode }) {
    const [order, setOrderState] = useState<NameOrder>(DEFAULT_ORDER);
    // Выбор, сделанный до того, как хранилище ответило, важнее сохранённого.
    const chosen = useRef(false);

    // Как и вид карточек (см. `card-view`): сохранённый выбор подтягивается
    // после первого кадра.
    useEffect(() => {
        let cancelled = false;

        readStored(STORAGE_KEY).then((stored) => {
            if (!cancelled && !chosen.current && isNameOrder(stored)) setOrderState(stored);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    const setOrder = (next: NameOrder) => {
        chosen.current = true;
        setOrderState(next);
        void writeStored(STORAGE_KEY, next);
    };

    return <NameOrderContext value={{ order, setOrder }}>{children}</NameOrderContext>;
}

export function useNameOrder() {
    return useContext(NameOrderContext);
}
