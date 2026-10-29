import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESS_IN = { duration: 60, easing: Easing.out(Easing.quad) };
const PRESS_OUT = { duration: 120, easing: Easing.out(Easing.quad) };

export type CardPressableProps = {
    onPress?: () => void;
    onLongPress?: () => void;
    onLayout?: (event: LayoutChangeEvent) => void;
    /** Рамка карточки: отступы, линия сверху. Фон задаётся здесь. */
    containerStyle: StyleProp<ViewStyle>;
    /** Фон в покое и под пальцем. */
    background: string;
    pressedBackground: string;
    children: ReactNode;
};

/**
 * Нажимаемая карточка списка: под пальцем чуть уменьшается и бледнеет, фон
 * меняется. Веб-вариант — `card-pressable.web.tsx`, на CSS-переходах, без
 * reanimated.
 */
export function CardPressable({
    onPress,
    onLongPress,
    onLayout,
    containerStyle,
    background,
    pressedBackground,
    children,
}: CardPressableProps) {
    // Одно значение на всё нажатие: масштаб, прозрачность и фон считаются из
    // него на UI-потоке, без перерисовки карточки на каждое касание.
    const press = useSharedValue(0);

    const contentStyle = useAnimatedStyle(() => ({
        transform: [{ scale: 1 - 0.01 * press.value }],
        opacity: 1 - 0.25 * press.value,
    }));

    // Фон меняется скачком, как и раньше: плавное затухание фона под
    // пальцем читается как задержка.
    const backgroundStyle = useAnimatedStyle(() => ({
        backgroundColor: press.value > 0.5 ? pressedBackground : background,
    }));

    return (
        <AnimatedPressable
            onPress={onPress}
            onLongPress={onLongPress}
            onLayout={onLayout}
            onPressIn={() => {
                press.value = withTiming(1, PRESS_IN);
            }}
            onPressOut={() => {
                press.value = withTiming(0, PRESS_OUT);
            }}>
            <Animated.View style={[containerStyle, backgroundStyle]}>
                <Animated.View style={[styles.content, contentStyle]}>{children}</Animated.View>
            </Animated.View>
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    content: {
        width: '100%',
    },
});
