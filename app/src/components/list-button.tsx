import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';

import { ButtonRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Второстепенная кнопка во всю ширину колонки — скруглённая, на серой
 * плашке, как «Остановить» в настройках: «Помочь проекту», «О проекте»,
 * «Настройки», «Поделиться». Главное действие экрана — инверсное, его
 * кнопки рисуются отдельно.
 */
export function ListButton({ label, onPress }: { label: string; onPress?: () => void }) {
    const theme = useTheme();

    return (
        <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
            ]}>
            <ThemedText style={styles.label}>{label}</ThemedText>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        marginHorizontal: Spacing.three,
        marginBottom: Spacing.two,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.three,
        borderRadius: ButtonRadius,
    },
    pressed: {
        opacity: 0.7,
    },
    label: {
        fontSize: 17,
        lineHeight: 22,
        fontWeight: '600',
    },
});
