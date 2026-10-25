import { Platform, StyleSheet } from 'react-native';

import { PLATE_BUTTON_HEIGHT, PlateButton } from '@/components/ui/plate-button';

export const RETURN_BUTTON_HEIGHT = PLATE_BUTTON_HEIGHT;

export function ReturnButton({ label, accessibilityLabel, onPress }: {
    label: string;
    accessibilityLabel: string;
    onPress: () => void;
}) {
    return (
        <PlateButton
            label={label}
            accessibilityLabel={accessibilityLabel}
            onPress={onPress}
            icon={{ ios: 'arrow.uturn.left', android: 'u_turn_left', web: 'u_turn_left' }}
            style={styles.button}
            // У Material «u_turn_left» смотрит вниз — поворачиваем, как у SF.
            iconStyle={Platform.OS === 'ios' ? undefined : styles.iconTurnedLeft}
        />
    );
}

const styles = StyleSheet.create({
    button: {
        marginLeft: 'auto',
    },
    iconTurnedLeft: {
        transform: [{ translateY: -1 }, { rotate: '90deg' }],
    },
});
