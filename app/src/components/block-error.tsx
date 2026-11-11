import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Icon } from '@/components/ui/icon';
import { BottomTabInset, MaxContentWidth, Spacing, SurfaceRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { describeError } from '@/utils/api-fetch';

/**
 * Содержимое ошибки: фон-плашка, иконка, заголовок, причина и «Повторить».
 *
 * Вынесено отдельно от `BlockError`, потому что тот занимает весь экран
 * (страница новомученика), а в списке «Сегодня» и «Календаря» такая же
 * плашка стоит внутри ленты — над кнопками подвала, которые должны
 * оставаться доступными и без связи с сервером.
 */
export function ErrorContent({
    error,
    onRetry,
    title = 'Не удалось загрузить данные',
    style,
}: {
    error?: unknown;
    onRetry?: () => void;
    title?: string;
    style?: StyleProp<ViewStyle>;
}) {
    const theme = useTheme();

    return (
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }, style]}>
            <Icon
                name={{ ios: 'exclamationmark.triangle', android: 'error', web: 'error' }}
                size={28}
                tintColor={theme.textSecondary}
            />
            <ThemedText style={styles.title}>{title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.reason}>
                {describeError(error)}
            </ThemedText>

            {onRetry && (
                <Pressable onPress={onRetry} hitSlop={Spacing.two} accessibilityRole="button">
                    <ThemedText type="linkPrimary">Повторить</ThemedText>
                </Pressable>
            )}
        </View>
    );
}

/**
 * Показывается при ошибке загрузки данных, приложения или страницы. Содержит
 * текст ошибки и кнопку «Повторить».
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
                <ErrorContent error={error} onRetry={onRetry} title={title} style={styles.fullScreenCard} />
            </SafeAreaView>
        </ThemedView>
    );
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
        justifyContent: 'center',
        gap: Spacing.three,
        paddingBottom: BottomTabInset + Spacing.three,
        maxWidth: MaxContentWidth,
    },
    card: {
        alignSelf: 'stretch',
        alignItems: 'center',
        gap: Spacing.two,
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.five,
        borderRadius: SurfaceRadius,
    },
    fullScreenCard: {
        width: '100%',
        maxWidth: 480,
        alignSelf: 'center',
    },
    title: {
        fontSize: 17,
        lineHeight: 22,
        fontWeight: '600',
        textAlign: 'center',
    },
    reason: {
        textAlign: 'center',
    },
});
