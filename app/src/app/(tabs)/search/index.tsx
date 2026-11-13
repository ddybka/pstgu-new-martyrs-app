import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ErrorContent, HintContent } from '@/components/block-error';
import { SearchResult } from '@/components/search-result';
import { ThemedText } from '@/components/themed-text';
import { cardListBatch } from '@/constants/card-list';
import { MaxContentWidth, Spacing, WebHeaderInset } from '@/constants/theme';
import { useCardView } from '@/context/card-view';
import { usePersonSearch } from '@/hooks/use-person-search';
import { useTheme } from '@/hooks/use-theme';
import { isSingular, plural } from '@/utils/plural';

import { Metadata } from 'expo-router/server';
import { SITE_URL } from '@/constants/site';

export function generateMetadata(): Metadata {
    const title = 'Поиск по новомученикам — Память новомучеников';
    const description = 'Ищите новомучеников по ключевым словам: сан, имя, фамилия, отчество, годы жизни.';

    const url = `${SITE_URL}/search`;

    return {
        title,
        description,

        alternates: {
            canonical: url,
        },

        openGraph: {
            title,
            description,
            url,
            siteName: 'Память новомучеников',
            locale: 'ru_RU',
            type: 'website',
        },
    };
}

const PLACEHOLDER = 'Найти информацию'

export default function SearchScreen() {
    const theme = useTheme();
    const [query, setQuery] = useState('');
    const search = usePersonSearch(query);
    const nativeSearchBar = Platform.OS === 'ios';
    const { view } = useCardView();
    const compact = view === 'compact';

    const status = search.idle ? null : search.offline ? (
        <View style={[styles.notice, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.noticeText}>
                Нет связи с сервером, ищем только по ФИО
            </ThemedText>
            <Pressable onPress={search.retry} hitSlop={Spacing.two} accessibilityRole="button">
                <ThemedText type="linkPrimary">Повторить</ThemedText>
            </Pressable>
        </View>
    ) : !search.loading && !search.error && search.total > 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.count}>
            {isSingular(search.total) ? 'Найдена' : 'Найдено'}{' '}
            {plural(search.total, 'запись', 'записи', 'записей')}
        </ThemedText>
    ) : null;

    const header = (
        <>
            {!nativeSearchBar && (
                <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder={PLACEHOLDER}
                    placeholderTextColor={theme.textSecondary}
                    autoFocus
                    autoCorrect={false}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                    accessibilityLabel="Поиск по биографиям"
                    style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                />
            )}
            {status}
        </>
    );

    const empty = search.idle ? (
        <HintContent
            icon={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
            title="Поиск по биографиям"
            description="Ищите по именам, местам и событиям."
            style={styles.hintCard}
        />
    ) : search.loading ? (
        <ActivityIndicator style={styles.spinner} />
    ) : search.error ? (
        <ErrorContent error={search.error} onRetry={search.retry} style={styles.errorCard} />
    ) : (
        <ThemedText type="small" themeColor="textSecondary" style={[styles.hint, styles.hintText]}>
            Ничего не найдено
        </ThemedText>
    );

    return (
        <>
            {nativeSearchBar && (
                <Stack.Screen
                    options={{
                        headerSearchBarOptions: {
                            placeholder: PLACEHOLDER,
                            hideWhenScrolling: false,
                            autoCapitalize: 'none',
                            onChangeText: (event) => setQuery(event.nativeEvent.text),
                            onCancelButtonPress: () => setQuery(''),
                        },
                    }}
                />
            )}

            <FlatList
                style={{ backgroundColor: theme.background }}
                contentContainerStyle={[
                    styles.container,
                    Platform.OS === 'android' && styles.containerAndroid,
                    Platform.OS === 'web' && styles.containerWeb,
                ]}
                contentInsetAdjustmentBehavior="automatic"
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                data={search.loading ? [] : search.hits}
                keyExtractor={(hit) => String(hit.number)}
                // Как на главной: карточка та же, и досоздаётся так же.
                {...cardListBatch(compact)}
                renderItem={({ item }) => <SearchResult hit={item} />}
                ListHeaderComponent={header}
                ListEmptyComponent={empty}
                ListFooterComponent={search.loadingMore ? <ActivityIndicator style={styles.spinner} /> : undefined}
                onEndReached={search.loadMore}
                onEndReachedThreshold={0.5}
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: Spacing.six,
    },
    containerAndroid: {
        paddingTop: Spacing.three,
    },
    containerWeb: {
        paddingTop: WebHeaderInset + Spacing.three,
        maxWidth: MaxContentWidth,
        width: '100%',
        alignSelf: 'center',
    },
    input: {
        marginHorizontal: Spacing.three,
        marginBottom: Spacing.three,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two + Spacing.half,
        borderRadius: 10,
        fontSize: 17,
    },
    count: {
        paddingHorizontal: Spacing.three,
        paddingBottom: Spacing.two,
        fontSize: 17,
        lineHeight: 22,
        paddingTop: Spacing.two
    },
    notice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        // От края до края и без скругления: это полоса-предупреждение над
        // выдачей, как «нет связи» на главной (см. OfflineNotice).
        marginBottom: Spacing.two,
        padding: Spacing.three,
    },
    noticeText: {
        flex: 1,
        fontWeight: 400,
    },
    hint: {
        alignItems: 'center',
        gap: Spacing.two,
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.five,
    },
    errorCard: {
        marginHorizontal: Spacing.three,
        marginVertical: Spacing.four,
    },
    hintCard: {
        marginHorizontal: Spacing.three,
        marginVertical: Spacing.four,
    },
    hintText: {

        fontWeight: '400',
    },
    spinner: {
        paddingVertical: Spacing.five,
    },
});
