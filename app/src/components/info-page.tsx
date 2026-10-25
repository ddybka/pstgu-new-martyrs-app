import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { HeadingFonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useReportScroll } from '@/hooks/use-header-shadow';
import { useTheme } from '@/hooks/use-theme';

/**
 * Каркас текстовой страницы — «О проекте», «Помочь проекту».
 *
 * Страницы открываются поверх вкладок в корневом Stack, с кнопкой «назад», —
 * поэтому отступа под плавающую веб-шапку вкладок (WebHeaderInset) здесь нет.
 *
 * Боковой отступ — у текста, а не у страницы, как в списках «Сегодня» и
 * «Календаря»: фотографии и строки-ссылки с линиями идут от края до края,
 * а текст отступает на `INFO_INSET`. Своим блокам страницы его ставят сами.
 */
export const INFO_INSET = Spacing.three;

export function InfoPage({ children }: { children: ReactNode }) {
    const theme = useTheme();
    // Тень под веб-шапкой, когда страницу прокрутили (см. ContainedHeader).
    const reportScroll = useReportScroll();

    return (
        <ScrollView
            onScroll={({ nativeEvent }) => reportScroll(nativeEvent.contentOffset.y)}
            scrollEventThrottle={16}
            style={[styles.scroll, { backgroundColor: theme.background }]}
            contentContainerStyle={styles.content}
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}>
            {children}
        </ScrollView>
    );
}

export function InfoSection({
    title,
    children,
    style,
}: {
    title: string;
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
}) {
    return (
        <View style={[styles.section, style]}>
            <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
            {children}
        </View>
    );
}

export function InfoParagraph({ children }: { children: ReactNode }) {
    return <ThemedText style={styles.paragraph}>{children}</ThemedText>;
}

/**
 * Маркированный список: точка — отдельный кружок, а не символ в тексте,
 * поэтому перенесённые строки выравниваются по тексту, а не по маркеру.
 */
export function InfoList({ items }: { items: ReactNode[] }) {
    const theme = useTheme();

    return (
        <View style={styles.list}>
            {items.map((item, index) => (
                <View key={index} style={styles.listItem}>
                    <View style={[styles.bullet, { backgroundColor: theme.textSecondary }]} />
                    <ThemedText style={styles.listItemText}>{item}</ThemedText>
                </View>
            ))}
        </View>
    );
}

const BulletSize = 6;

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
    },
    content: {
        paddingBottom: Spacing.six,
        maxWidth: MaxContentWidth,
        width: '100%',
        alignSelf: 'center',
    },
    section: {
        marginTop: Spacing.four,
        gap: Spacing.two,
    },
    sectionTitle: {
        paddingHorizontal: INFO_INSET,
        fontFamily: HeadingFonts.bold,
        marginBottom: Spacing.one,
        fontSize: 24,
        lineHeight: 28,
    },
    paragraph: {
        paddingHorizontal: INFO_INSET,
        fontWeight: '400',
        fontSize: 17,
        lineHeight: 27,
        marginBottom: Spacing.two,
    },
    list: {
        gap: Spacing.two,
        marginBottom: Spacing.two,
        paddingLeft: INFO_INSET + Spacing.three,
        paddingRight: INFO_INSET,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.three,
    },
    bullet: {
        width: BulletSize,
        height: BulletSize,
        borderRadius: BulletSize / 2,
        marginTop: (27 - BulletSize) / 2,
    },
    listItemText: {
        flex: 1,
        fontWeight: '400',
        fontSize: 17,
        lineHeight: 22,
    },
});
