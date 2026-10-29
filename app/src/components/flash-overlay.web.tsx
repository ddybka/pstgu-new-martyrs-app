import { StyleSheet, View, type ViewStyle } from 'react-native';

import { FLASH } from './flash-timing';

const TOTAL = FLASH.in + FLASH.hold + FLASH.out;
const percent = (ms: number) => `${((ms / TOTAL) * 100).toFixed(1)}%`;

/**
 * Подсветка блока в вебе — CSS-анимацией (см. `flash-overlay.tsx`). Новая
 * вспышка — новый узел (`key`), и анимация начинается заново.
 */
export function FlashOverlay({ flashKey, color }: { flashKey: number | null; color: string }) {
    if (flashKey === null) return null;

    return (
        <View
            key={flashKey}
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: color }, styles.flash]}
        />
    );
}

const styles = StyleSheet.create({
    flash: {
        opacity: 0,
        animationKeyframes: [
            {
                '0%': { opacity: 0 },
                [percent(FLASH.in)]: { opacity: 1 },
                [percent(FLASH.in + FLASH.hold)]: { opacity: 1 },
                '100%': { opacity: 0 },
            },
        ],
        animationDuration: `${TOTAL}ms`,
        animationDelay: `${FLASH.delay}ms`,
        animationTimingFunction: 'ease-out',
        animationFillMode: 'both',
    } as ViewStyle,
});
