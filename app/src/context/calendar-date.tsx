import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { readStored, writeStored } from '@/utils/storage';

/**
 * Что календарь показывает при открытии:
 *
 * - `saved` — последнюю выбранную дату (по умолчанию, как раньше);
 * - `current` — сегодняшнюю дату вместе с годом.
 *
 * Выбор хранится отдельно от самой выбранной даты: при переключении обратно
 * на «Сохраненное значение» последняя выбранная дата остаётся.
 */
export type CalendarDatePreference = 'saved' | 'current';

export const CALENDAR_DATE_PREFERENCES: { value: CalendarDatePreference; label: string; desc: string }[] = [
    { value: 'saved', label: 'Сохраненная', desc: 'По умолчанию в календаре будет показываться последняя выбранная дата.' },
    { value: 'current', label: 'Текущая', desc: 'По умолчанию в календаре будет показываться сегодняшняя дата вместе с годом.' },
];

const DEFAULT_PREFERENCE: CalendarDatePreference = 'saved';
const STORAGE_KEY = 'settings.calendar-date';

type CalendarDateContextType = {
    preference: CalendarDatePreference;
    setPreference: (preference: CalendarDatePreference) => void;
    /** Настройка прочитана из хранилища — можно выбирать дату. */
    ready: boolean;
};

const CalendarDateContext = createContext<CalendarDateContextType>({
    preference: DEFAULT_PREFERENCE,
    setPreference: () => { },
    ready: false,
});

function isPreference(value: unknown): value is CalendarDatePreference {
    return value === 'saved' || value === 'current';
}

export function CalendarDateProvider({ children }: { children: ReactNode }) {
    const [preference, setPreferenceState] = useState<CalendarDatePreference>(DEFAULT_PREFERENCE);
    const [ready, setReady] = useState(false);
    // Выбор, сделанный до ответа хранилища, важнее сохранённого.
    const chosen = useRef(false);

    useEffect(() => {
        let cancelled = false;

        readStored(STORAGE_KEY).then((stored) => {
            if (cancelled) return;

            if (!chosen.current && isPreference(stored)) setPreferenceState(stored);
            setReady(true);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    const setPreference = (next: CalendarDatePreference) => {
        chosen.current = true;
        setPreferenceState(next);
        setReady(true);
        void writeStored(STORAGE_KEY, next);
    };

    return <CalendarDateContext value={{ preference, setPreference, ready }}>{children}</CalendarDateContext>;
}

export function useCalendarDatePreference() {
    return useContext(CalendarDateContext);
}
