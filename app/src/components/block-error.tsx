import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Icon } from '@/components/ui/icon';
import { BottomTabInset, MaxContentWidth, Spacing, SurfaceRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { describeError } from '@/utils/api-fetch';

type IconName = ComponentProps<typeof Icon>['name'];

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
    description,
    style,
}: {
    error?: unknown;
    onRetry?: () => void;
    title?: string;
    /** Свой текст вместо разбора ошибки. Пустая строка — без описания. */
    description?: string;
    style?: StyleProp<ViewStyle>;
}) {
    const reason = description ?? describeError(error);

    return (
        <MessageCard
            icon={{ ios: 'exclamationmark.triangle', android: 'error', web: 'error' }}
            title={title}
            description={reason}
            style={style}>
            {onRetry && (
                <Pressable onPress={onRetry} hitSlop={Spacing.two} accessibilityRole="button">
                    <ThemedText type="linkPrimary">Повторить</ThemedText>
                </Pressable>
            )}
        </MessageCard>
    );
}

/**
 * Такая же плашка, как у ошибки, но без «Повторить»: подсказка о том, как
 * работает экран, или пустое состояние. Например, поиск без запроса.
 */
export function HintContent({
    icon,
    title,
    description,
    style,
}: {
    icon: IconName;
    title: string;
    description?: string;
    style?: StyleProp<ViewStyle>;
}) {
    return <MessageCard icon={icon} title={title} description={description} style={style} />;
}

function MessageCard({
    icon,
    title,
    description,
    style,
    children,
}: {
    icon: IconName;
    title: string;
    /** Пустая строка — без описания. */
    description?: string;
    style?: StyleProp<ViewStyle>;
    children?: ReactNode;
}) {
    const theme = useTheme();

    return (
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }, style]}>
            <Icon name={icon} size={28} tintColor={theme.textSecondary} />
            <ThemedText style={styles.title}>{title}</ThemedText>
            {description !== undefined && description !== '' && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.reason}>
                    {description}
                </ThemedText>
            )}
            {children}
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
    description,
}: {
    error?: unknown;
    onRetry?: () => void;
    title?: string;
    /** Свой текст вместо разбора ошибки. Пустая строка — без описания. */
    description?: string;
}) {
    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ErrorContent
                    error={error}
                    onRetry={onRetry}
                    title={title}
                    description={description}
                    style={styles.fullScreenCard}
                />
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
        fontWeight: 400
    },
});
