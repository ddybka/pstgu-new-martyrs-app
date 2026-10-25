import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Platform, StyleSheet } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Системное стекло iOS 26 под прозрачной шапкой экрана.
 *
 * Своего стеклянного фона у навигационной шапки в iOS 26 нет: стекло там у
 * кнопок, а полоса прозрачная и проявляется только от прокрутки контента под
 * ней. Экрану без прокрутки (карте) фон нужен всегда — его даёт этот слой:
 * настоящий `UIGlassEffect`, тот же, что у панели вкладок, во всю ширину и на
 * высоту шапки вместе со строкой состояния.
 *
 * Ставится в экран поверх содержимого; системная шапка рисуется над ним. На
 * iOS до 26 и на других платформах ничего не рисует — там фон делает сама
 * шапка (`material` в `useStackHeaderOptions`).
 */
export function HeaderGlass() {
    const headerHeight = useHeaderHeight();
    // Тема приложения, а не системы: в настройках её можно выбрать вручную.
    const scheme = useColorScheme();

    if (Platform.OS !== 'ios' || !isLiquidGlassAvailable()) return null;

    return (
        <GlassView
            glassEffectStyle="regular"
            colorScheme={scheme}
            style={[styles.glass, { height: headerHeight }]}
        />
    );
}

const styles = StyleSheet.create({
    glass: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
});
