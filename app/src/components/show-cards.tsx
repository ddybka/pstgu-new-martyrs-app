import type { ReactElement } from "react";
import { FlatList, Platform, Pressable, RefreshControl, StyleSheet, View } from "react-native";

import { OfflineNotice } from "./offline-notice";
import { PersonCard } from "./person-card";
import { PersonCardsSkeleton } from "./person-card-skeleton";
import { ThemedText } from "./themed-text";

import { MaxContentWidth, Spacing, WebHeaderInset } from "@/constants/theme";
import { Person } from "@/hooks/use-persons";
import { useTheme } from "@/hooks/use-theme";
import { describeError } from "@/utils/api-fetch";

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
    refreshing?: boolean;
    onRefresh?: () => void;
    stale?: boolean;
    updatedAt?: number | null;
    emptyText?: string;
    horizontalPadding?: number;
    error?: unknown;
}) {
    const theme = useTheme();

    const listHeader = (
        <>
            {header}
            {stale && <OfflineNotice updatedAt={updatedAt} onRetry={onRefresh} />}
        </>
    );

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
            data={loading ? [] : persons}
            keyExtractor={(person, index) => String(person.Номер ?? index)}
            // Карточка тяжёлая: на iOS это свой SwiftUI-хост контекстного меню
            // с двумя деревьями внутри — самой карточкой и её копией для
            // превью. По умолчанию FlatList держит смонтированными по десять
            // экранов в обе стороны, и в дни с полусотней новомучеников
            // (30 октября) это были почти все карточки разом — список лагал.
            initialNumToRender={6}
            maxToRenderPerBatch={4}
            windowSize={5}
            ListHeaderComponent={listHeader}
            ListFooterComponent={footer}
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
