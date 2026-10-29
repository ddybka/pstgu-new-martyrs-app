import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import type { CardPressableProps } from './card-pressable';

/**
 * Нажимаемая карточка в вебе (см. `card-pressable.tsx`): то же уменьшение и
 * побледнение под нажатием, но CSS-переходом, без reanimated. Фон, как и на
 * телефоне, меняется скачком.
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
    return (
        <Pressable onPress={onPress} onLongPress={onLongPress} onLayout={onLayout}>
            {({ pressed }) => (
                <View style={[containerStyle, { backgroundColor: pressed ? pressedBackground : background }]}>
                    <View style={[styles.content, pressed ? styles.pressed : styles.idle]}>{children}</View>
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    content: {
        width: '100%',
        transitionProperty: 'transform, opacity',
        transitionTimingFunction: 'ease-out',
    } as ViewStyle,
    // Как PRESS_IN и PRESS_OUT в card-pressable.tsx: нажатие быстрее отпускания.
    pressed: {
        transform: [{ scale: 0.99 }],
        opacity: 0.75,
        transitionDuration: '60ms',
    } as ViewStyle,
    idle: {
        transform: [{ scale: 1 }],
        opacity: 1,
        transitionDuration: '120ms',
    } as ViewStyle,
});
