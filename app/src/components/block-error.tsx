import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { describeError } from '@/utils/api-fetch';

/**
 * Показывается при ошибке загрузки данных, приложения или страницы. Содержит текст ошибки и кнопку «Повторить».
 */
export function BlockError({
    error,
    onRetry,
    title = 'Не удалось загрузить данные',
}: {
    error?: unknown;
    onRetry?: () => void;
    title?: string;
}) {
    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.errorContainer}>
                    <ThemedText>{title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.reason}>
                        {describeError(error)}
                    </ThemedText>

                    {onRetry && (
                        <Pressable onPress={onRetry} hitSlop={Spacing.two} accessibilityRole="button">
                            <ThemedText type="linkPrimary">Повторить</ThemedText>
                        </Pressable>
                    )}
                </View>
            </SafeAreaView>
        </ThemedView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        flexDirection: 'row',
    },
    safeArea: {
        flex: 1,
        paddingHorizontal: Spacing.four,
        alignItems: 'center',
        gap: Spacing.three,
        paddingBottom: BottomTabInset + Spacing.three,
        maxWidth: MaxContentWidth,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.two,
        paddingHorizontal: Spacing.four,
    },
    reason: {
        textAlign: 'center',
    },
});
