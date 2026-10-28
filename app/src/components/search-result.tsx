import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { PersonThumbnail } from './person-photos';
import { PersonRankLine } from './person-rank-line';
import { ThemedText } from './themed-text';

import { HeadingFonts, Spacing } from '@/constants/theme';
import { useNameOrder } from '@/context/name-order';
import type { SearchHit } from '@/hooks/use-person-search';
import { useTheme } from '@/hooks/use-theme';
import { formatPersonName } from '@/utils/person-name';

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };

/**
 * Фрагмент биографии из выдачи API — в одну строку.
 *
 * API режет биографию по строкам событий и отмечает обрезку « ... »;
 * строки здесь склеиваются через точку, а служебные «**» перед списком
 * источников убираются.
 */
function cleanSnippet(snippet: string) {
    return snippet
        .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, name: string) => ENTITIES[name])
        .replace(/\*\*\s*/g, '')
        .replace(/\s*\n\s*/g, ' · ')
        .replace(/^\s*\.\.\.\s*/, '…')
        .replace(/\s*\.\.\.\s*$/, '…')
        .trim();
}

/** Чётные куски — обычный текст, нечётные — совпадения из `<mark>`. */
function splitMarks(text: string) {
    return text.split(/<mark>(.*?)<\/mark>/g);
}

function formatYears(born: number | null, died: number | null) {
    if (!born && !died) return null;
    return `${born ?? '?'}–${died ?? '?'}`;
}

export function SearchResult({ hit }: { hit: SearchHit }) {
    const theme = useTheme();
    const { order } = useNameOrder();
    const name = formatPersonName(hit.name, order) ?? hit.name;
    const years = formatYears(hit.born, hit.died);
    const details = [hit.rank, years].filter(Boolean).join(', ');

    return (
        <Pressable
            onPress={() => router.push({ pathname: '/person/[id]', params: { id: hit.number } })}
            accessibilityRole="link"
            style={({ pressed }) => [
                styles.row,
                { borderColor: theme.separator },
                pressed && { backgroundColor: theme.backgroundElement },
            ]}>
            <View style={styles.head}>
                <View style={styles.headText}>
                    <PersonRankLine holiness={hit.holiness} style={styles.holiness} />
                    <ThemedText style={styles.name}>{name}</ThemedText>
                    {details ? (
                        <ThemedText type="small" themeColor="textSecondary">
                            {details}
                        </ThemedText>
                    ) : null}
                </View>
                <PersonThumbnail photos={hit.photos} name={name} size={THUMBNAIL_SIZE} />
            </View>

            {hit.snippet && (
                <View style={styles.snippet}>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={4}>
                        {splitMarks(cleanSnippet(hit.snippet)).map((part, index) =>
                            index % 2 === 1 ? (
                                <ThemedText
                                    key={index}
                                    type="smallBold"
                                    style={{ backgroundColor: theme.backgroundSelected }}>
                                    {part}
                                </ThemedText>
                            ) : (
                                part
                            )
                        )}
                    </ThemedText>
                </View>
            )}
        </Pressable>
    );
}

const THUMBNAIL_SIZE = 48;

const styles = StyleSheet.create({
    head: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.three,
    },
    headText: {
        flex: 1,
        gap: Spacing.half,
    },
    holiness: {
        fontSize: 14,
        lineHeight: 18,
        fontWeight: '400',
    },
    row: {
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.three,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: Spacing.half,
    },
    name: {
        fontFamily: HeadingFonts.bold,
        fontSize: 17,
        lineHeight: 22,
    },
    snippet: {
        paddingTop: Spacing.one,
    },
});
