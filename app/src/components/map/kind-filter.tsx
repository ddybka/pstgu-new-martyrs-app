import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { KIND_COLORS, POINT_KINDS } from './map-config';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Фильтр точек по типу — заодно и легенда: точка у переключателя того же
 * цвета, что и на карте. Хранится набор выключенных типов, а не включённых:
 * по умолчанию видно всё, и тип, которого фильтр не знает, не пропадёт.
 */
export function KindFilter({
    hidden,
    onChange,
    counts,
    inset = Spacing.three,
    style,
}: {
    hidden: ReadonlySet<string>;
    onChange: (hidden: ReadonlySet<string>) => void;
    /** Сколько точек каждого типа — подпись у переключателя. */
    counts: Readonly<Record<string, number>>;
    /** Отступ первого и последнего переключателя от краёв ленты. */
    inset?: number;
    style?: StyleProp<ViewStyle>;
}) {
    const theme = useTheme();
    const colors = KIND_COLORS[useColorScheme()];

    const toggle = (kind: string) => {
        const next = new Set(hidden);
        if (next.has(kind)) next.delete(kind);
        else next.add(kind);
        onChange(next);
    };

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={style}
            contentContainerStyle={[styles.row, { paddingHorizontal: inset }]}>
            {POINT_KINDS.map(({ kind, label }) => {
                const on = !hidden.has(kind);

                return (
                    <Pressable
                        key={kind}
                        onPress={() => toggle(kind)}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={`${label}: ${on ? 'показаны' : 'скрыты'}`}
                        style={({ pressed }) => [
                            styles.chip,
                            {
                                backgroundColor: theme.background,
                                borderColor: on ? colors[kind] : theme.separator,
                            },
                            pressed && styles.pressed,
                        ]}>
                        <View
                            style={[
                                styles.dot,
                                on
                                    ? { backgroundColor: colors[kind] }
                                    : { borderWidth: 1.5, borderColor: theme.textSecondary },
                            ]}
                        />
                        <ThemedText type="small" themeColor={on ? 'text' : 'textSecondary'}>
                            {label}
                            {counts[kind] ? ` ${counts[kind]}` : ''}
                        </ThemedText>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    // Вертикальный отступ — место под тень: лента прокручивается и обрезает
    // всё, что выходит за её край.
    row: {
        gap: Spacing.two,
        paddingVertical: Spacing.one,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingVertical: Spacing.one + Spacing.half,
        paddingHorizontal: Spacing.three,
        borderRadius: 999,
        // Тонкая, как все линии в проекте (карточки, строки-кнопки, разделители).
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    pressed: {
        opacity: 0.7,
    },
});
