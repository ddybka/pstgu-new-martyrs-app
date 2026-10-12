import { Pressable, StyleSheet, View } from 'react-native';

import { MONTHS_FOR_DATE } from '@/components/calendar/month-calendar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Полоса «показаны сохранённые данные».
 *
 * Появляется, когда сеть не ответила, а показать есть что. Число здесь
 * обязательно: «нет сети» без даты не даёт понять, насколько данные устарели.
 */

function formatMoment(time: number) {
    const date = new Date(time);
    const today = new Date();

    const sameDay =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    if (sameDay) return `сегодня в ${hours}:${minutes}`;

    return `${date.getDate()} ${MONTHS_FOR_DATE[date.getMonth()]} в ${hours}:${minutes}`;
}

export function OfflineNotice({
    updatedAt,
    onRetry,
}: {
    updatedAt: number | null;
    onRetry?: () => void;
}) {
    const theme = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
                {updatedAt === null
                    ? 'Нет связи с сервером — показаны сохранённые данные'
                    : `Нет связи с сервером. Данные загружены ${formatMoment(updatedAt)}`}
            </ThemedText>

            {onRetry && (
                <Pressable onPress={onRetry} hitSlop={Spacing.two} accessibilityRole="button">
                    <ThemedText type="linkPrimary">Обновить</ThemedText>
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.two,
        paddingHorizontal: Spacing.two,
        paddingVertical: Spacing.two,
        marginBottom: Spacing.three,
    },
    text: {
        flexShrink: 1,
    },
});
