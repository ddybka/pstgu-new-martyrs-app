import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PULSE_MS } from './pulse-timing';

/** Пульсация заглушек в вебе — CSS-анимацией (см. `pulse.tsx`). */
export function Pulse({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
    return (
        <View style={[style, styles.pulse]} aria-hidden>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    pulse: {
        // react-native-web превращает это в @keyframes.
        animationKeyframes: [{ '0%': { opacity: 0.6 }, '100%': { opacity: 1 } }],
        animationDuration: `${PULSE_MS}ms`,
        animationTimingFunction: 'ease-in-out',
        animationIterationCount: 'infinite',
        animationDirection: 'alternate',
    } as ViewStyle,
});
