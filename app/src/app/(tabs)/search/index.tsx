import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { SearchResult } from '@/components/search-result';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing, WebHeaderInset } from '@/constants/theme';
import { usePersonSearch } from '@/hooks/use-person-search';
import { useTheme } from '@/hooks/use-theme';
import { describeError } from '@/utils/api-fetch';
import { plural } from '@/utils/plural';

const PLACEHOLDER = 'Найти информацию'

export default function SearchScreen() {
    const theme = useTheme();
    const [query, setQuery] = useState('');
    const search = usePersonSearch(query);
    const nativeSearchBar = Platform.OS === 'ios';

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
            Найдено: {plural(search.total, 'запись', 'записи', 'записей')}
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
        <View style={styles.hint}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.hintText}>
                Поиск идёт по полному тексту биографий: именам, местам и событиям.
            </ThemedText>
        </View>
    ) : search.loading ? (
        <ActivityIndicator style={styles.spinner} />
    ) : search.error ? (
        <View style={styles.hint}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.hintText}>
                {describeError(search.error)}
            </ThemedText>
            <Pressable onPress={search.retry} hitSlop={Spacing.two} accessibilityRole="button">
                <ThemedText type="linkPrimary">Повторить</ThemedText>
            </Pressable>
        </View>
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
        fontWeight: 400,
        textAlign: 'center',
        paddingTop: Spacing.one
    },
    notice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        marginHorizontal: Spacing.three,
        marginBottom: Spacing.two,
        padding: Spacing.three,
        borderRadius: 10,
    },
    noticeText: {
        flex: 1,
    },
    hint: {
        alignItems: 'center',
        gap: Spacing.two,
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.five,
    },
    hintText: {

        fontWeight: '400',
    },
    spinner: {
        paddingVertical: Spacing.five,
    },
});
