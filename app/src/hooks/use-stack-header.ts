import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform } from 'react-native';

import { HeadingFonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Настройки шапки вкладки — одни на все вкладки со своим Stack.
 *
 * На iOS шапка прозрачная с крупным заголовком, чтобы контент проезжал под
 * ней. На Android прозрачность означает шапку без фона и без верхнего отступа:
 * контент уезжает под неё и сливается со списком, поэтому там обычная шапка.
 *
 * `large: false` — для экранов без прокрутки.
 */
export function useStackHeaderOptions(title: string, { large = true } = {}) {
    const isDark = useColorScheme() === 'dark';
    const theme = useTheme();
    // На iOS 26 «жидкое стекло» шапка делает сама, явный blurEffect с ним спорит, поэтому его не задаем.
    const blurEffect = isDark ? 'systemMaterialDark' : 'systemMaterialLight';

    if (Platform.OS === 'ios') {
        return {
            title,
            headerLargeTitle: large,
            headerTransparent: true,
            headerShadowVisible: false,
            headerTintColor: theme.text,
            headerLargeStyle: { backgroundColor: 'transparent' },
            headerBlurEffect: isLiquidGlassAvailable() ? undefined : blurEffect,
            headerLargeTitleStyle: { color: theme.text, fontFamily: HeadingFonts.bold },
            headerTitleStyle: { color: theme.text, fontFamily: HeadingFonts.bold },
        } as const;
    }

    if (Platform.OS === 'android') {
        return {
            title,
            headerShadowVisible: false,
            headerTintColor: theme.text,
            headerStyle: { backgroundColor: theme.background },
            headerTitleStyle: { color: theme.text, fontFamily: HeadingFonts.bold },
        } as const;
    }

    // В вебе шапка своя — плавающая панель вкладок в app-tabs.web.
    return { headerShown: false } as const;
}

export function useDetailHeaderOptions(title = '', { large = false } = {}) {
    const isDark = useColorScheme() === 'dark';
    const theme = useTheme();
    const blurEffect = isDark ? 'systemMaterialDark' : 'systemMaterialLight';

    if (Platform.OS === 'ios') {
        return {
            title,
            headerLargeTitle: large,
            headerTransparent: true,
            headerShadowVisible: false,
            headerTintColor: theme.text,
            headerLargeStyle: { backgroundColor: 'transparent' },
            headerBlurEffect: isLiquidGlassAvailable() ? undefined : blurEffect,
            headerLargeTitleStyle: { color: theme.text, fontFamily: HeadingFonts.bold },
            headerTitleStyle: { color: theme.text, fontFamily: HeadingFonts.bold },
            contentStyle: { backgroundColor: theme.background },
            scrollEdgeEffects: { top: 'hard' },
        } as const;
    }

    return {
        title,
        headerShadowVisible: false,
        headerTintColor: theme.text,
        headerStyle: { backgroundColor: theme.background },
        headerTitleStyle: { color: theme.text, fontFamily: HeadingFonts.bold },
        contentStyle: { backgroundColor: theme.background },
    } as const;
}
