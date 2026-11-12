import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PersonCard } from './person-card';
import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import type { SearchHit } from '@/hooks/use-person-search';
import { useTheme } from '@/hooks/use-theme';

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

/**
 * Выдача поиска — та же карточка, что на главной, плюс фрагмент биографии с
 * подсвеченными совпадениями: по нему видно, почему запись попала в поиск.
 */
export const SearchResult = memo(function SearchResult({ hit }: { hit: SearchHit }) {
    return (
        <PersonCard
            person={hit.person}
            extra={hit.snippet ? <Snippet snippet={hit.snippet} /> : undefined}
        />
    );
});

function Snippet({ snippet }: { snippet: string }) {
    const theme = useTheme();

    return (
        <View style={styles.snippet}>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={4}>
                {splitMarks(cleanSnippet(snippet)).map((part, index) =>
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
    );
}

const styles = StyleSheet.create({
    snippet: {
        marginTop: Spacing.two,
    },
});
