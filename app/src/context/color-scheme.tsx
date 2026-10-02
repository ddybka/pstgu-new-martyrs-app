import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform, useColorScheme as useRNColorScheme } from 'react-native';

export type ColorScheme = 'light' | 'dark';

/**
 * Этот контекст нужен для того, чтобы в вебе не было мигания приложения
 * сначала рисуется в светлой теме, а потом уже в темной, если у пользователя
 * включена системная темная тема. В нативных приложениях такого мигания нет, потому что там
 * системная тема доступна сразу, а в вебе она становится доступна после того, как браузер
 * отдаст значения CSS переменных.
 */
const ColorSchemeContext = createContext<ColorScheme>('light');

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
    const system = useRNColorScheme();

    const [hydrated, setHydrated] = useState(Platform.OS !== 'web');
    useEffect(() => {
        if (!hydrated) setHydrated(true);
    }, [hydrated]);

    const scheme: ColorScheme = hydrated && system === 'dark' ? 'dark' : 'light';

    return <ColorSchemeContext value={scheme}>{children}</ColorSchemeContext>;
}

export function useColorSchemeValue() {
    return useContext(ColorSchemeContext);
}
