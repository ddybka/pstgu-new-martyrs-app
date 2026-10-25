import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { Dropdown } from './ui/dropdown';

import { ButtonRadius, Spacing } from '@/constants/theme';
import { CARD_VIEWS, useCardView } from '@/context/card-view';
import { useTheme } from '@/hooks/use-theme';

export function TabHeaderMenu() {
    const theme = useTheme();
    const { view, setView } = useCardView();
    const current = CARD_VIEWS.find((option) => option.value === view) ?? CARD_VIEWS[0];

    return (
        <Dropdown
            options={CARD_VIEWS}
            value={view}
            onSelect={setView}
            align="right"
            accessibilityLabel="Вид карточек">
            <View style={[styles.button, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.icon}>
                    {[18, 12, 6].map((width) => (
                        <View key={width} style={[styles.line, { width, backgroundColor: theme.text }]} />
                    ))}
                </View>
                <ThemedText type="small">{current.label}</ThemedText>
            </View>
        </Dropdown>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingVertical: Spacing.one,
        paddingHorizontal: Spacing.three,
        borderRadius: ButtonRadius,
    },
    icon: {
        height: 12,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    line: {
        height: 1.5,
        borderRadius: 1.5,
    },
});
