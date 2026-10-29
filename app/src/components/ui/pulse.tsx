import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { PULSE_MS } from './pulse-timing';

export { PULSE_MS };

/**
 * Мягкая пульсация прозрачности — для заглушек на время загрузки. Веб-вариант
 * — `pulse.web.tsx`, на CSS-анимации, без reanimated.
 */
export function Pulse({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
    const opacity = useSharedValue(0.6);

    useEffect(() => {
        opacity.value = withRepeat(
            withTiming(1, { duration: PULSE_MS, easing: Easing.inOut(Easing.quad) }),
            -1,
            true
        );
    }, [opacity]);

    const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
        <Animated.View style={[style, pulse]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {children}
        </Animated.View>
    );
}
