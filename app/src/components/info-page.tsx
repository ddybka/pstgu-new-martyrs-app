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
        fontSize: 20,
        lineHeight: 26,
        fontFamily: HeadingFonts.bold,
    },
    paragraph: {
        fontSize: 15,
        lineHeight: 22,
    },
});