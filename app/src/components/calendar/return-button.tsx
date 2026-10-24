import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const RETURN_BUTTON_HEIGHT = 32;
const ICON_SIZE = 15;

export function ReturnButton({ label, accessibilityLabel, onPress }: {
    label: string;
    accessibilityLabel: string;
    onPress: () => void;
}) {
    const theme = useTheme();

    return (
        <Pressable
            onPress={onPress}
            hitSlop={Spacing.two}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
            ]}>
            <ThemedText type="small">{label}</ThemedText>
            <SymbolView
                name={{ ios: 'arrow.uturn.left', android: 'u_turn_left', web: 'u_turn_left' }}
                size={ICON_SIZE}
                style={Platform.OS === 'ios' ? styles.icon : styles.iconTurnedLeft}
                tintColor={theme.text}
                weight="medium"
            />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        marginLeft: 'auto',
        height: RETURN_BUTTON_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one,
        paddingHorizontal: Spacing.three,
        borderRadius: RETURN_BUTTON_HEIGHT / 2,
    },
    icon: {
        transform: [{ translateY: -1 }],
    },
    iconTurnedLeft: {
        transform: [{ translateY: -1 }, { rotate: '90deg' }],
    },
    pressed: {
        opacity: 0.7,
    },
});
