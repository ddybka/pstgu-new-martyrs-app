import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Appearance, Platform, useColorScheme as useRNColorScheme } from 'react-native';

import { readStored, writeStored } from '@/utils/storage';

export type ColorScheme = 'light' | 'dark';
export type ColorSchemePreference = 'system' | ColorScheme;

/**
 * Этот контекст нужен для того, чтобы в вебе не было мигания приложения
 * сначала рисуется в светлой теме, а потом уже в темной, если у пользователя
 * включена системная темная тема. В нативных приложениях такого мигания нет, потому что там
 * системная тема доступна сразу, а в вебе она становится доступна после того, как браузер
 * отдаст значения CSS переменных.
 */
const ColorSchemeContext = createContext<ColorScheme>('light');

const PreferenceContext = createContext<{
    preference: ColorSchemePreference;
    setPreference: (value: ColorSchemePreference) => void;
}>({ preference: 'system', setPreference: () => {} });

const PREFERENCE_KEY = 'color-scheme-preference';

function isPreference(value: string | null): value is ColorSchemePreference {
    return value === 'system' || value === 'light' || value === 'dark';
}

// Системная тема в нативном Appearance называется 'unspecified', а не 'system' или null
function applyNative(preference: ColorSchemePreference) {
    if (Platform.OS === 'web') return;
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
}

const subscribeNever = () => () => { };

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
    const system = useRNColorScheme();
    const [preference, setPreferenceState] = useState<ColorSchemePreference>('system');

    // На сервере (статическая сборка веба) и при гидратации — false, сразу
    // после неё — true. На нативе сервера нет, и значение сразу true.
    const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);

    useEffect(() => {
        let active = true;
        readStored(PREFERENCE_KEY).then((stored) => {
            if (!active || !isPreference(stored)) return;
            applyNative(stored);
            setPreferenceState(stored);
        });
        return () => {
            active = false;
        };
    }, []);

    const setPreference = (value: ColorSchemePreference) => {
        applyNative(value);
        setPreferenceState(value);
        writeStored(PREFERENCE_KEY, value);
    };

    const resolved = preference === 'system' ? system : preference;
    const scheme: ColorScheme = hydrated && resolved === 'dark' ? 'dark' : 'light';

    return (
        <PreferenceContext value={{ preference, setPreference }}>
            <ColorSchemeContext value={scheme}>{children}</ColorSchemeContext>
        </PreferenceContext>
    );
}

export function useColorSchemeValue() {
    return useContext(ColorSchemeContext);
}

export function useColorSchemePreference() {
    return useContext(PreferenceContext);
}
