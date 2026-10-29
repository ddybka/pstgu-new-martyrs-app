import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { KIND_COLORS, POINT_KINDS } from './map-kinds';

import { ThemedText } from '@/components/themed-text';
import { Chevron } from '@/components/ui/chevron';
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
    children,
}: {
    hidden: ReadonlySet<string>;
    onChange: (hidden: ReadonlySet<string>) => void;
    /** Сколько точек каждого типа — подпись у переключателя. */
    counts: Readonly<Record<string, number>>;
    /** Отступ первого и последнего переключателя от краёв ленты. */
    inset?: number;
    style?: StyleProp<ViewStyle>;
    /** Другие фильтры — в той же ленте, после типов. */
    children?: ReactNode;
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
            {children}
        </ScrollView>
    );
}

/**
 * Переключатель в той же ленте — для фильтров, у которых нет цвета на карте
 * («Прославленные»). Без `onPress` это просто плашка — для кнопки выпадающего
 * списка, нажатие которой ловит сам список; `dropdown` дорисовывает шеврон.
 */
export function FilterChip({
    label,
    on,
    onPress,
    dropdown = false,
    accessibilityLabel,
}: {
    label: string;
    on: boolean;
    onPress?: () => void;
    dropdown?: boolean;
    accessibilityLabel?: string;
}) {
    const theme = useTheme();

    const content = (
        <>
            <ThemedText type="small" themeColor={on ? 'text' : 'textSecondary'} style={on && styles.chipOn}>
                {label}
            </ThemedText>
            {dropdown && <Chevron direction="down" size={6} />}
        </>
    );

    const chipStyle = [
        styles.chip,
        dropdown && styles.chipDropdown,
        { backgroundColor: theme.background, borderColor: on ? theme.text : theme.separator },
    ];

    if (!onPress) return <View style={chipStyle}>{content}</View>;

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="switch"
            accessibilityState={{ checked: on }}
            accessibilityLabel={accessibilityLabel ?? label}
            style={({ pressed }) => [chipStyle, pressed && styles.pressed]}>
            {content}
        </Pressable>
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
    chipDropdown: {
        paddingRight: Spacing.two,
        gap: Spacing.one,
    },
    chipOn: {
        fontWeight: '600',
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
