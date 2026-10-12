import type { SFSymbol } from 'expo-symbols';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { readStored, writeStored } from '@/utils/storage';

/**
 * Сколько сведений показывает карточка новомученика в списках.
 *
 * - `compact` — сан и имя, без фотографии и дат
 * - `detailed` — с фотографией, годами жизни и текстами о рождении и кончине.
 */
export type CardView = 'compact' | 'detailed';

export const CARD_VIEWS: { value: CardView; label: string; sfSymbol: SFSymbol }[] = [
    { value: 'compact', label: 'Кратко', sfSymbol: 'list.bullet' },
    { value: 'detailed', label: 'Подробно', sfSymbol: 'list.bullet.below.rectangle' },
];

const DEFAULT_VIEW: CardView = 'compact';
const STORAGE_KEY = 'settings.card-view';

type CardViewContextType = {
    view: CardView;
    setView: (view: CardView) => void;
};

/**
 * Один выбор вида на все приложение.
 */
const CardViewContext = createContext<CardViewContextType>({
    view: DEFAULT_VIEW,
    setView: () => { },
});

function isCardView(value: unknown): value is CardView {
    return value === 'compact' || value === 'detailed';
}

export function CardViewProvider({ children }: { children: ReactNode }) {
    const [view, setViewState] = useState<CardView>(DEFAULT_VIEW);
    // Выбор, сделанный до того, как хранилище ответило, важнее сохранённого.
    const chosen = useRef(false);

    // Сохранённый выбор подтягивается после первого кадра: хранилище
    // асинхронное, а в вебе первый кадр ещё и обязан совпасть с пререндером.
    useEffect(() => {
        let cancelled = false;

        readStored(STORAGE_KEY).then((stored) => {
            if (!cancelled && !chosen.current && isCardView(stored)) setViewState(stored);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    const setView = (next: CardView) => {
        chosen.current = true;
        setViewState(next);
        void writeStored(STORAGE_KEY, next);
    };

    return <CardViewContext value={{ view, setView }}>{children}</CardViewContext>;
}

export function useCardView() {
    return useContext(CardViewContext);
}
