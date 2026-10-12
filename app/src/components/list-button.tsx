import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Кнопка-строка во всю ширину экрана, с тонкими линиями сверху и снизу:
 * «Помочь проекту» и «О проекте».
 */
export function ListButton({
    label,
    onPress,
    last = false,
}: {
    label: string;
    onPress?: () => void;
    last?: boolean;
}) {
    const theme = useTheme();

    return (
        <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={({ pressed }) => [
                styles.button,
                last && styles.last,
                { borderColor: theme.separator, opacity: pressed ? 0.7 : 1 },
            ]}>
            <ThemedText>{label}</ThemedText>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        width: '100%',
        borderTopWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.three,
    },
    last: {
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
});
