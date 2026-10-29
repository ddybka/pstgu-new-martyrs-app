import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { HighlightedText } from '@/components/highlighted-text';
import { ThemedText } from '@/components/themed-text';
import { Chevron } from '@/components/ui/chevron';
import { Expandable } from '@/components/ui/expandable';
import { HeadingFonts, Spacing } from '@/constants/theme';
import type { PersonSource } from '@/hooks/use-persons';
import { useTheme } from '@/hooks/use-theme';
import { capitalize } from '@/utils/person-name';
import { findMatches } from '@/utils/text-search';

/** Подписи групп по `тип` источника; незнакомый тип подписывается как есть. */
const TYPE_LABELS: Record<string, string> = {
    документ: 'Архивные документы',
    публикация: 'Публикации',
    'интернет-ресурс': 'Интернет-ресурсы',
    воспоминания: 'Воспоминания',
};

type SourceGroup = { type: string; label: string; items: { text: string; number: number }[] };

/**
 * Источники по группам, в порядке базы: архивы, публикации, сайты. Повторы
 * убираются — в базе одна и та же строка бывает записана дважды.
 */
function groupSources(sources: readonly PersonSource[] = []): SourceGroup[] {
    const groups = new Map<string, SourceGroup>();
    const seen = new Set<string>();

    for (const source of sources) {
        const text = source.источник?.replace(/\s+/g, ' ').trim();
        if (!text || seen.has(text)) continue;
        seen.add(text);

        const type = source.тип?.trim() ?? '';
        let group = groups.get(type);
        if (!group) {
            group = { type, label: TYPE_LABELS[type] ?? capitalize(type) ?? 'Прочее', items: [] };
            groups.set(type, group);
        }
        group.items.push({ text, number: 0 });
    }

    // Нумерация сквозная: на источник удобно сослаться номером.
    let number = 0;
    for (const group of groups.values()) for (const item of group.items) item.number = number += 1;

    return [...groups.values()];
}

/** Тексты источников в том порядке, в каком они на экране, — для поиска по странице. */
export function sourceTexts(sources?: readonly PersonSource[]): string[] {
    return groupSources(sources).flatMap((group) => group.items.map((item) => item.text));
}

/**
 * Список источников в конце биографии. Он есть у каждого дела, и без него
 * биография для историка — пересказ без ссылок. Свёрнут по умолчанию: в
 * нём бывает по двадцать строк, и читать биографию он не мешает.
 */
export function PersonSources({
    sources,
    needle = '',
    first = 0,
    active = null,
}: {
    sources?: readonly PersonSource[];
    /** Поиск по странице: запрос, номер первого совпадения здесь и текущее. */
    needle?: string;
    first?: number;
    active?: number | null;
}) {
    const theme = useTheme();
    const [opened, setOpen] = useState(false);
    const groups = useMemo(() => groupSources(sources), [sources]);

    // Сквозные номера первого совпадения в каждом источнике.
    const firsts = useMemo(() => {
        const result = new Map<string, number>();
        let offset = first;
        for (const group of groups) {
            for (const item of group.items) {
                result.set(item.text, offset);
                offset += needle ? findMatches(item.text, needle).length : 0;
            }
        }
        return { result, total: offset - first };
    }, [groups, needle, first]);

    // Нашлось в источниках — список раскрыт, иначе совпадений не видно.
    const open = opened || firsts.total > 0;

    const count = groups.reduce((sum, group) => sum + group.items.length, 0);
    if (count === 0) return null;

    return (
        <View style={[styles.container, { borderColor: theme.separator }]}>
            <Pressable
                onPress={() => setOpen(!open)}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                accessibilityLabel={`Источники, ${count}`}
                style={({ pressed }) => [styles.header, pressed && styles.pressed]}>
                <ThemedText style={styles.title}>Источники</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.count}>
                    {count}
                </ThemedText>
                <View style={open && styles.chevronOpen}>
                    <Chevron direction="down" size={8} />
                </View>
            </Pressable>

            <Expandable open={open}>
                <View style={styles.list}>
                    {groups.map((group) => (
                        <View key={group.type} style={styles.group}>
                            {groups.length > 1 && (
                                <ThemedText type="smallBold" themeColor="textSecondary">
                                    {group.label}
                                </ThemedText>
                            )}
                            {group.items.map(({ text, number }) => (
                                <View key={text} style={styles.item}>
                                    <ThemedText type="small" themeColor="textSecondary" style={styles.number}>
                                        {number}.
                                    </ThemedText>
                                    <HighlightedText
                                        type="small"
                                        selectable
                                        style={styles.text}
                                        needle={needle}
                                        first={firsts.result.get(text)}
                                        active={active}>
                                        {text}
                                    </HighlightedText>
                                </View>
                            ))}
                        </View>
                    ))}
                </View>
            </Expandable>
        </View>
    );
}

const styles = StyleSheet.create({
    // Линии — от края до края экрана, как у строк-кнопок, а текст — с
    // обычным отступом колонки биографии.
    container: {
        marginTop: Spacing.three,
        marginHorizontal: -Spacing.three,
        paddingHorizontal: Spacing.three,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingVertical: Spacing.three,
    },
    pressed: {
        opacity: 0.7,
    },
    title: {
        fontFamily: HeadingFonts.bold,
        fontSize: 20,
        lineHeight: 26,
    },
    // Число — тем же шрифтом, что и заголовок, только серым.
    count: {
        flex: 1,
        fontFamily: HeadingFonts.bold,
        fontSize: 20,
        lineHeight: 26,
    },
    chevronOpen: {
        transform: [{ rotate: '180deg' }],
    },
    list: {
        gap: Spacing.four,
        paddingBottom: Spacing.four,
    },
    group: {
        gap: Spacing.two,
    },
    item: {
        flexDirection: 'row',
        gap: Spacing.two,
    },
    number: {
        minWidth: 24,
        fontWeight: '400',
    },
    text: {
        flex: 1,
        fontWeight: '400',
        lineHeight: 21,
    },
});
