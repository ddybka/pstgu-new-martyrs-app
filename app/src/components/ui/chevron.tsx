import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/**
 * Шеврон «влево/вправо/вниз», нарисованный двумя гранями квадрата.
 *
 * Раньше был `SymbolView` из expo-symbols, но SF Symbols существуют
 * только на iOS.
 */
export function Chevron({ direction, size = 10 }: { direction: 'left' | 'right' | 'down'; size?: number }) {
    const theme = useTheme();

    return (
        <View style={styles.box}>
            <View
                style={[
                    {
                        width: size,
                        height: size,
                        borderColor: theme.text,
                        transform: direction === 'down'
                            ? [{ translateY: -size / 4 }, { rotate: '45deg' }]
                            : [{ rotate: '45deg' }],
                    },
                    styles[direction],
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    // Коробка постоянного размера: сам уголок повёрнут, и без неё соседние
    // элементы прыгали бы вслед за его габаритами.
    box: {
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    left: {
        borderLeftWidth: 2,
        borderBottomWidth: 2,
    },
    right: {
        borderRightWidth: 2,
        borderTopWidth: 2,
    },
    down: {
        borderRightWidth: 2,
        borderBottomWidth: 2,
    },
});
