import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from './themed-text';
import { Dropdown } from './ui/dropdown';

import { ButtonRadius, Spacing } from '@/constants/theme';
import { CARD_VIEWS, useCardView } from '@/context/card-view';
import { PERSON_SORTS, usePersonSort } from '@/context/person-sort';
import { useTheme } from '@/hooks/use-theme';

/** С этой ширины подписи у кнопок скрываются, чтобы они не уезжали под дату. */
const COMPACT_BELOW = 620;

/**
 * Правый край шапки списка на вебе: сортировка и вид карточки.
 *
 * В отличие от нативного тулбара, здесь у обоих выборов есть подпись — иначе
 * «По сану» и «Кратко» рядом читались бы как одно и то же. На узком экране
 * подписи скрываются: иначе кнопки не помещаются рядом с «Найдено…» и
 * переносятся на следующую строку (см. `showLabels`).
 */
export function TabHeaderMenu() {
    const theme = useTheme();
    const { width } = useWindowDimensions();
    const { view, setView } = useCardView();
    const { sort, setSort } = usePersonSort();
    const currentView = CARD_VIEWS.find((option) => option.value === view) ?? CARD_VIEWS[0];
    const currentSort = PERSON_SORTS.find((option) => option.value === sort) ?? PERSON_SORTS[0];
    const showLabels = width >= COMPACT_BELOW;

    return (
        <View style={styles.controls}>
            <Dropdown
                options={PERSON_SORTS}
                value={sort}
                onSelect={setSort}
                align="right"
                accessibilityLabel={`Сортировка: ${currentSort.label}`}>
                <View style={[styles.button, !showLabels && styles.buttonCompact, { backgroundColor: theme.backgroundElement }]}>
                    {showLabels && (
                        <ThemedText type="small" themeColor="textSecondary">
                            Сортировка:
                        </ThemedText>
                    )}
                    <ThemedText type="small">{currentSort.label}</ThemedText>
                </View>
            </Dropdown>

            <Dropdown
                options={CARD_VIEWS}
                value={view}
                onSelect={setView}
                align="right"
                accessibilityLabel={`Вид карточек: ${currentView.label}`}>
                <View style={[styles.button, !showLabels && styles.buttonCompact, { backgroundColor: theme.backgroundElement }]}>
                    <View style={styles.icon}>
                        {[18, 12, 6].map((width) => (
                            <View key={width} style={[styles.line, { width, backgroundColor: theme.text }]} />
                        ))}
                    </View>
                    {showLabels && <ThemedText type="small">{currentView.label}</ThemedText>}
                </View>
            </Dropdown>
        </View>
    );
}

const styles = StyleSheet.create({
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        gap: Spacing.two,
        // Кнопки не сжимаются и не переносятся под дату, пока хватает места.
        flexShrink: 0,
        // Если кнопки всё же не поместились рядом с датой и уехали на новую
        // строку, прижимаем их к правому краю, а не к левому.
        marginLeft: 'auto',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingVertical: Spacing.one,
        paddingHorizontal: Spacing.three,
        borderRadius: ButtonRadius,
    },
    buttonCompact: {
        paddingHorizontal: Spacing.two + Spacing.one,
        height: 28
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
