import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const TIMING = { duration: 280, easing: Easing.out(Easing.cubic) };

/**
 * Блок, который раскрывается и сворачивается по высоте.
 *
 * Содержимое меряется в невидимом слое поверх, а наружу отдаётся анимированная
 * высота: так раскрытие плавное и на нативе, и в вебе. Поменялось содержимое
 * в раскрытом блоке — высота тоже доезжает плавно, а не прыгает.
 *
 * Содержимое во время сворачивания должно оставаться прежним — его держит
 * родитель, иначе блок опустеет раньше, чем закроется.
 */
export function Expandable({
    open,
    children,
    style,
}: {
    open: boolean;
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
}) {
    const progress = useSharedValue(0);
    const height = useSharedValue(0);

    useEffect(() => {
        progress.value = withTiming(open ? 1 : 0, TIMING);
    }, [open, progress]);

    const animated = useAnimatedStyle(() => ({
        height: height.value * progress.value,
        opacity: progress.value,
    }));

    return (
        <Animated.View style={[styles.clip, animated]}>
            <View
                style={[styles.measure, style]}
                onLayout={({ nativeEvent }) => {
                    const next = nativeEvent.layout.height;
                    // Первое измерение — сразу, без анимации: раскрытие и так
                    // анимирует `progress`.
                    height.value = height.value === 0 ? next : withTiming(next, TIMING);
                }}>
                {children}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    clip: {
        overflow: 'hidden',
    },
    measure: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
});
