import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { HeadingFonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Каркас текстовой страницы — «О проекте», «Помочь проекту».
 *
 * Страницы открываются поверх вкладок в корневом Stack, с кнопкой «назад», —
 * поэтому отступа под плавающую веб-шапку вкладок (WebHeaderInset) здесь нет.
 */
export function InfoPage({ children }: { children: ReactNode }) {
    const theme = useTheme();

    return (
        <ScrollView
            style={[styles.scroll, { backgroundColor: theme.background }]}
            contentContainerStyle={styles.content}
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}>
            {children}
        </ScrollView>
    );
}

export function InfoSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <View style={styles.section}>
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
        paddingHorizontal: Spacing.three,
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
        fontFamily: HeadingFonts.bold,
        marginBottom: Spacing.three,
        fontSize: 24,
        lineHeight: 28,
    },
    paragraph: {
        fontWeight: '400',
        fontSize: 17,
        lineHeight: 27,
        marginBottom: Spacing.two,
    },
    list: {
        gap: Spacing.two,
        marginBottom: Spacing.two,
        paddingLeft: Spacing.three,
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
