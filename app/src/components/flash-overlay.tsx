import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { FLASH } from './flash-timing';

/**
 * Подсветка блока, к которому прокрутили (событие биографии): фон
 * проявляется, держится и гаснет. Новый `flashKey` — новая вспышка.
 * Веб-вариант — `flash-overlay.web.tsx`, CSS-анимацией.
 */
export function FlashOverlay({ flashKey, color }: { flashKey: number | null; color: string }) {
    const flash = useSharedValue(0);

    useEffect(() => {
        if (flashKey === null) return;
        flash.value = 0;
        flash.value = withSequence(
            withDelay(FLASH.delay, withTiming(1, { duration: FLASH.in })),
            withDelay(FLASH.hold, withTiming(0, { duration: FLASH.out, easing: Easing.out(Easing.quad) }))
        );
    }, [flashKey, flash]);

    const style = useAnimatedStyle(() => ({ opacity: flash.value }));

    return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color }, style]} />;
}
