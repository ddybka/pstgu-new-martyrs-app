import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { Chevron } from './ui/chevron';

import { Spacing } from '@/constants/theme';

/**
 * Кнопка «Назад» для веба — одна стрелка, без подписи, как у нативного стека.
 */
export function BackButton() {
    if (Platform.OS !== 'web') return null;

    return (
        <Pressable
            hitSlop={Spacing.two}
            accessibilityLabel="Назад"
            accessibilityRole="button"
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
            <Chevron direction="left" size={11} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    back: {
        paddingHorizontal: Spacing.two,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pressed: {
        opacity: 0.7,
    },
});
