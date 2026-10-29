import { StyleSheet, View, type DimensionValue } from 'react-native';

import { Pulse } from '@/components/ui/pulse';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Заглушка карточки на время загрузки — одна на оба вида.
 */

/**
 * Строка текста: высотой с настоящую строку (`lineHeight`), а полоса в ней —
 * с заглавную букву (`barHeight`).
 */
function Line({ width, lineHeight, barHeight }: { width: DimensionValue; lineHeight: number; barHeight: number }) {
    const theme = useTheme();

    return (
        <View style={[styles.line, { height: lineHeight }]}>
            <View style={[styles.bar, { width, height: barHeight, backgroundColor: theme.backgroundElement }]} />
        </View>
    );
}

const TITLE = { lineHeight: 24, barHeight: 16 };
const SUBTITLE = { lineHeight: 21, barHeight: 12 };
const TEXT = { lineHeight: 22, barHeight: 13 };

export function PersonCardSkeleton() {
    const theme = useTheme();

    return (
        <View style={[styles.card, { borderColor: theme.separator }]}>
            <Pulse>
                <View style={styles.title}>
                    <Line width="65%" {...TITLE} />
                </View>
                <View style={styles.subtitle}>
                    <Line width="40%" {...SUBTITLE} />
                </View>
                <View style={styles.text}>
                    <View style={styles.paragraph}>
                        <Line width="100%" {...TEXT} />
                        <Line width="70%" {...TEXT} />
                    </View>
                    <Line width="55%" {...TEXT} />
                </View>
            </Pulse>
        </View>
    );
}

/**
 * Несколько заглушек подряд — столько, сколько карточек обычно видно на экране.
 */
export function PersonCardsSkeleton({ count = 3 }: { count?: number }) {
    return (
        <View>
            {Array.from({ length: count }, (_, index) => (
                <PersonCardSkeleton key={index} />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        borderTopWidth: 0.5,
        paddingVertical: Spacing.five,
        paddingHorizontal: Spacing.three,
    },
    title: {
        marginBottom: Spacing.one,
    },
    subtitle: {
        marginBottom: Spacing.three,
    },
    text: {
        gap: Spacing.two,
    },
    paragraph: {
        marginBottom: Spacing.half,
    },
    line: {
        justifyContent: 'center',
    },
    bar: {
        borderRadius: Spacing.one,
    },
});
