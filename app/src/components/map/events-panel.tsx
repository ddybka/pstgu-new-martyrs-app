import { SymbolView } from 'expo-symbols';
import { memo, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { KIND_COLORS, POINT_KINDS, kindColor, type MartyrPoint } from './map-config';

import { PersonRankLine } from '@/components/person-rank-line';
import { ThemedText } from '@/components/themed-text';
import { useNameOrder } from '@/context/name-order';
import { ButtonRadius, HeadingFonts, Spacing, SurfaceRadius, SurfaceShadow } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { compareDisplayedNames, splitPersonTitle } from '@/utils/person-name';
import { plural } from '@/utils/plural';

/** С этого числа людей в списке появляется поиск по ФИО. */
const SEARCH_FROM = 8;
const CLOSE_ICON_SIZE = 20;

type PersonEvents = {
    number: number;
    title: string;
    events: MartyrPoint[];
};

/**
 * События, собранные по людям: «заголовок биографии → его события здесь».
 * У одного человека в одном месте их бывает несколько, и повторять над
 * каждым заголовок незачем.
 */
function groupByPerson(events: readonly MartyrPoint[]): PersonEvents[] {
    const groups = new Map<number, PersonEvents>();

    for (const event of events) {
        const group = groups.get(event.number);
        if (group) group.events.push(event);
        else groups.set(event.number, { number: event.number, title: event.title, events: [event] });
    }

    return [...groups.values()];
}

const KIND_LABELS: Record<string, string> = Object.fromEntries(
    POINT_KINDS.map(({ kind, label }) => [kind, label])
);

/**
 * Шторка со списком событий под нажатой точкой или кластером.
 *
 * Одна на все случаи: одна точка, несколько событий в одном месте, кластер.
 * Список виртуальный — в одну точку стекается вся Москва, это 2400 событий,
 * и для неё же нужен поиск.
 *
 * Оформлена как веб-шапка: едва скруглена, без обводки, с мягкой тенью и
 * фоном приподнятой поверхности. Блок человека нажимается целиком — он и
 * есть ссылка на биографию.
 */
export function EventsPanel({
    events,
    onClose,
    onOpenPerson,
    style,
    found = false,
}: {
    events: readonly MartyrPoint[];
    onClose: () => void;
    onOpenPerson: (number: number, eventIds: number[]) => void;
    style?: StyleProp<ViewStyle>;
    /**
     * Это выдача поиска по карте: в заголовке «Найдено», а своего поиска по
     * ФИО нет — запрос уже вводят над картой.
     */
    found?: boolean;
}) {
    const theme = useTheme();
    const colors = KIND_COLORS[useColorScheme()];
    const [query, setQuery] = useState('');
    const { order } = useNameOrder();

    // Заголовок — в том же порядке ФИО, что и во всём приложении; ищется и
    // по нему, и по исходному, справочному.
    const groups = useMemo(
        () =>
            groupByPerson(events).map((group) => {
                const { holiness, name } = splitPersonTitle(group.title, order);
                return {
                    ...group,
                    title: name,
                    holiness,
                    haystack: `${name}\n${group.title}`.toLocaleLowerCase('ru'),
                };
            }).sort((a, b) => compareDisplayedNames(a.title, b.title)),
        [events, order]
    );
    const needle = query.trim().toLocaleLowerCase('ru');
    const shown = useMemo(
        () =>
            needle
                ? groups.filter((group) => group.haystack.includes(needle))
                : groups,
        [groups, needle]
    );

    const counted =
        groups.length === 1
            ? plural(events.length, 'событие', 'события', 'событий')
            : `${plural(events.length, 'событие', 'события', 'событий')} · ${plural(groups.length, 'человек', 'человека', 'человек')}`;
    const summary = found ? `Найдено: ${counted}` : counted;

    return (
        <View
            style={[
                styles.panel,
                { backgroundColor: theme.backgroundRaised },
                style,
            ]}>
            <View style={styles.header}>
                <ThemedText type="smallBold" themeColor="textSecondary" style={styles.summary}>
                    {summary}
                </ThemedText>
                <Pressable
                    onPress={onClose}
                    hitSlop={Spacing.two}
                    accessibilityRole="button"
                    accessibilityLabel="Закрыть"
                    style={({ pressed }) => pressed && styles.pressed}>
                    <SymbolView
                        name={{ ios: 'xmark', android: 'close', web: 'close' }}
                        size={CLOSE_ICON_SIZE}
                        tintColor={theme.text}
                        weight="semibold"
                    />
                </Pressable>
            </View>

            {!found && groups.length >= SEARCH_FROM && (
                <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Поиск по ФИО"
                    placeholderTextColor={theme.textSecondary}
                    autoCorrect={false}
                    clearButtonMode="while-editing"
                    style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                />
            )}

            {/* Строки тяжёлые (у человека бывают десятки событий), и
                досоздаются они на главном потоке: пачками помельче и чаще, а
                ушедшие с экрана отцепляются от иерархии — так прокрутка не
                проседает ниже частоты экрана. */}
            <FlatList
                data={shown}
                keyExtractor={(group) => String(group.number)}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={6}
                maxToRenderPerBatch={3}
                updateCellsBatchingPeriod={30}
                windowSize={7}
                removeClippedSubviews
                contentContainerStyle={styles.list}
                ItemSeparatorComponent={Separator}
                ListEmptyComponent={
                    <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                        Никого не нашлось
                    </ThemedText>
                }
                renderItem={({ item }) => <GroupRow group={item} colors={colors} onOpenPerson={onOpenPerson} />}
            />
        </View>
    );
}

function Separator() {
    const theme = useTheme();
    return <View style={[styles.separator, { backgroundColor: theme.separator }]} />;
}

type ShownGroup = PersonEvents & { holiness: string | null };

/**
 * Строка человека. Мемоизирована: поиск по ФИО и обновления шторки не
 * перерисовывают уже показанные строки — только новые.
 */
const GroupRow = memo(function GroupRow({
    group,
    colors,
    onOpenPerson,
}: {
    group: ShownGroup;
    colors: (typeof KIND_COLORS)[keyof typeof KIND_COLORS];
    onOpenPerson: (number: number, eventIds: number[]) => void;
}) {
    const theme = useTheme();

    return (
        <Pressable
            onPress={() => onOpenPerson(group.number, group.events.map((event) => event.id))}
            accessibilityRole="link"
            accessibilityLabel={`Открыть биографию: ${group.title}`}
            style={({ pressed, hovered }) => [
                styles.group,
                (pressed || hovered) && { backgroundColor: theme.backgroundElement },
            ]}>
            <PersonRankLine holiness={group.holiness} style={styles.holiness} />
            <ThemedText style={styles.title}>{group.title}</ThemedText>

            <View style={styles.events}>
                {group.events.map((event) => (
                    <View key={event.id} style={styles.event}>
                        <View style={styles.meta}>
                            <View style={[styles.dot, { backgroundColor: kindColor(colors, event.kind) }]} />
                            <ThemedText type="small" themeColor="textSecondary">
                                {[KIND_LABELS[event.kind] ?? event.kind, event.dating].filter(Boolean).join(' · ')}
                            </ThemedText>
                        </View>
                        {event.text !== '' && <ThemedText style={styles.text}>{event.text}</ThemedText>}
                    </View>
                ))}
            </View>
        </Pressable>
    );
});

const styles = StyleSheet.create({
    panel: {
        borderRadius: SurfaceRadius,
        boxShadow: SurfaceShadow,
        overflow: 'hidden',
    },
    pressed: {
        opacity: 0.7,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingHorizontal: Spacing.three,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.two,
    },
    summary: {
        flex: 1,
    },
    search: {
        marginHorizontal: Spacing.three,
        marginBottom: Spacing.two,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        borderRadius: ButtonRadius,
        fontSize: 16,
    },
    list: {
        paddingBottom: Spacing.three,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginHorizontal: Spacing.three,
    },
    group: {
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.three,
    },
    holiness: {
        fontSize: 14,
        lineHeight: 18,
        fontWeight: '400',
        marginBottom: Spacing.half,
    },
    title: {
        marginBottom: Spacing.two,
        fontFamily: HeadingFonts.bold,
        fontSize: 17,
        lineHeight: 22,
    },
    // События одного человека отделены друг от друга заметнее, чем строки
    // внутри события, — иначе они слипаются.
    events: {
        gap: Spacing.three,
    },
    // Между строкой «тип · датировка» и текстом — тот же отступ, что между
    // заголовком и этой строкой.
    event: {
        gap: Spacing.two,
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    text: {
        fontSize: 16,
        lineHeight: 22,
        fontWeight: 400,
    },
    empty: {
        textAlign: 'center',
        paddingVertical: Spacing.four,
    },
});
