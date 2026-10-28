import { useMemo, type ReactElement } from "react";
import { FlatList, Platform, Pressable, RefreshControl, StyleSheet, View } from "react-native";

import { OfflineNotice } from "./offline-notice";
import { PersonCard } from "./person-card";
import { PersonCardsSkeleton } from "./person-card-skeleton";
import { ThemedText } from "./themed-text";

import { MaxContentWidth, Spacing, WebHeaderInset } from "@/constants/theme";
import { useNameOrder } from "@/context/name-order";
import { Person } from "@/hooks/use-persons";
import { useTheme } from "@/hooks/use-theme";
import { describeError } from "@/utils/api-fetch";
import { compareDisplayedNames, formatPersonName } from "@/utils/person-name";

/**
 * Сколько экранов карточек держать смонтированными (вместе с видимым): по
 * три в обе стороны. Шире не нужно: карточка без SwiftUI-хоста, создать её
 * заново дёшево, а узкое окно бережёт память в днях с сотней фотографий.
 */
const WINDOW_SIZE = 7;

/**
 * Список дел — общий для главной и календаря.
 *
 * Состояния списка живут здесь, а не на экранах: скелеты, пустой день, состояие
 * «нет связи» и обновление свайпом устроены одинаково, и расходиться им незачем.
 */
export function ShowCards({
    persons = [],
    header,
    footer,
    loading = false,
    loadingMore = false,
    refreshing = false,
    onRefresh,
    stale = false,
    updatedAt = null,
    emptyText = 'В этот день памяти нет записей',
    horizontalPadding = Spacing.three,
    error,
}: {
    persons: Person[];
    header?: ReactElement;
    footer?: ReactElement;
    loading?: boolean;
    /** Первая страница на экране, остальные ещё грузятся. */
    loadingMore?: boolean;
    refreshing?: boolean;
    onRefresh?: () => void;
    stale?: boolean;
    updatedAt?: number | null;
    emptyText?: string;
    horizontalPadding?: number;
    error?: unknown;
}) {
    const theme = useTheme();
    const { order } = useNameOrder();

    // API отдаёт список по фамилии — в справочном порядке он и остаётся. Если
    // первым показано имя, список сортируется по нему (см. compareDisplayedNames).
    const sorted = useMemo(() => {
        if (order === 'surname-first') return persons;

        return persons
            .map((person) => ({ person, name: formatPersonName(person.ФИО, order) ?? person.Заголовок ?? '' }))
            .sort((a, b) => compareDisplayedNames(a.name, b.name))
            .map(({ person }) => person);
    }, [persons, order]);

    const listHeader = (
        <>
            {header}
            {stale && <OfflineNotice updatedAt={updatedAt} onRetry={onRefresh} />}
        </>
    );

    // Пока дописываются страницы, под списком — заглушка карточки, а не
    // кнопки подвала: иначе, долистав до конца первой страницы, человек
    // увидел бы подвал, а его тут же унесло бы вниз пришедшими карточками.
    const listFooter = loadingMore ? <PersonCardsSkeleton count={2} /> : footer;

    return (
        <FlatList
            style={[styles.list, { backgroundColor: theme.background }]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
                styles.container,
                // { paddingHorizontal: horizontalPadding },
                Platform.OS === 'android' && styles.containerAndroid,
                Platform.OS === 'web' && styles.containerWeb,
            ]}
            contentInsetAdjustmentBehavior="automatic"
            data={loading ? [] : sorted}
            keyExtractor={(person, index) => String(person.Номер ?? index)}
            // Карточки досоздаются небольшими пачками с паузой — без
            // запинок посреди прокрутки.
            initialNumToRender={5}
            maxToRenderPerBatch={2}
            updateCellsBatchingPeriod={80}
            windowSize={WINDOW_SIZE}
            ListHeaderComponent={listHeader}
            ListFooterComponent={listFooter}
            renderItem={({ item }) => (
                <PersonCard person={item} />
            )}
            ListEmptyComponent={
                loading ? (
                    <PersonCardsSkeleton />
                ) : error ? (
                    <View style={styles.empty}>
                        <ThemedText type="small" themeColor="textSecondary" style={styles.errorText}>
                            {describeError(error)}
                        </ThemedText>
                        {onRefresh && (
                            <Pressable onPress={onRefresh} hitSlop={Spacing.two} accessibilityRole="button">
                                <ThemedText type="linkPrimary">Повторить</ThemedText>
                            </Pressable>
                        )}
                    </View>
                ) : (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                        {emptyText}
                    </ThemedText>
                )
            }
            refreshControl={
                onRefresh ? (
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.textSecondary}
                        colors={[theme.text]}
                        progressBackgroundColor={theme.backgroundElement}
                    />
                ) : undefined
            }
        />
    )
}

const styles = StyleSheet.create({
    list: {
        flex: 1,
    },
    container: {
        paddingBottom: Spacing.six,
    },
    containerAndroid: {
        paddingTop: Spacing.four
    },
    containerWeb: {
        paddingTop: WebHeaderInset + Spacing.three,
        maxWidth: MaxContentWidth,
        width: '100%',
        alignSelf: 'center',
    },
    empty: {
        alignItems: 'center',
        gap: Spacing.two,
        paddingVertical: Spacing.five,
    },
    emptyText: {
        textAlign: 'center',
        paddingVertical: Spacing.five,
    },
    errorText: {
        textAlign: 'center',
    },
});
