import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform } from 'react-native';

import { renderContainedHeader } from '@/components/contained-header';
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
 * `large: false` — маленькая шапка: для экранов без прокрутки (карта).
 *
 * `material: true` — фон под шапкой всегда, а не только при прокрутке. Нужен
 * экранам без прокрутки (карта): там UIKit считает контент «у края» и всегда
 * берёт `scrollEdgeAppearance`, а прозрачный `headerLargeStyle` делает его
 * полностью прозрачным и стирает размытие (см. `buildAppearance` в
 * react-native-screens). Поэтому с `material` его нет.
 *
 * На iOS до 26 фон — системное размытие. На iOS 26 у системной шапки своего
 * стекла нет вовсе: шапка остаётся прозрачной, а стекло под неё кладёт сам
 * экран (`HeaderGlass`).
 */
export function useStackHeaderOptions(title: string, { large = true, material = false } = {}) {
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
            // У края прокрутки — прозрачная, материал появляется при прокрутке.
            // С `material` — материал всегда, и у края тоже.
            ...(material ? null : { headerLargeStyle: { backgroundColor: 'transparent' } }),
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
        // В вебе шапка в колонке содержимого, а не по краям окна. Именно
        // элементом, а не `header: ContainedHeader`: стек вызывает `header`
        // как обычную функцию, и хуки шапки попали бы в рендер самого стека —
        // React падает с «Rendered more hooks than during the previous render».
        ...(Platform.OS === 'web' ? { header: renderContainedHeader } : null),
    } as const;
}
