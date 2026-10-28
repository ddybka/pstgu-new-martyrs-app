import { SymbolView } from 'expo-symbols';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Строка-ссылка во всю ширину страницы, с линиями сверху и снизу.
 * Отступ — у подписи внутри.
 */
export function LinkRow({ label, href, onPress }: { label: string; href?: string; onPress?: () => void }) {
    const theme = useTheme();
    const isMail = href?.startsWith('mailto:') ?? false;

    const handlePress = href
        ? isMail
            ? () => openMail(href)
            : () => openLink(href)
        : onPress;

    return (
        <Pressable
            accessibilityRole={href ? 'link' : 'button'}
            accessibilityHint={isMail ? 'Открывает почтовое приложение' : undefined}
            onPress={handlePress}
            style={({ pressed }) => [
                styles.blockLink,
                { borderColor: theme.separator, opacity: pressed ? 0.7 : 1 },
            ]}>
            <View style={styles.link}>
                {href && isMail && (
                    <SymbolView
                        name={{ ios: 'envelope', android: 'mail', web: 'mail' }}
                        size={18}
                        tintColor={theme.text}
                        weight="medium"
                    />
                )}
                <ThemedText style={styles.linkText}>{label}</ThemedText>
                {href && !isMail && (
                    <SymbolView
                        name={{ ios: 'arrow.up.right.square', android: 'open_in_new', web: 'open_in_new' }}
                        size={18}
                        tintColor={theme.text}
                        weight="medium"
                    />
                )}
            </View>
        </Pressable>
    );
}

/**
 * На телефоне — встроенный браузер поверх приложения, чтобы из него было
 * легко вернуться. В вебе — просто новая вкладка: `openBrowserAsync` там
 * открывает отдельное маленькое окно посреди экрана (window.open с
 * размерами), а на компьютере этого никто не ждёт.
 */
function openLink(href: string) {
    if (Platform.OS === 'web') {
        window.open(href, '_blank', 'noopener,noreferrer');
        return;
    }

    void openBrowserAsync(href, { presentationStyle: WebBrowserPresentationStyle.AUTOMATIC });
}

async function openMail(href: string) {
    const address = href.slice('mailto:'.length).split('?')[0];
    try {
        await Linking.openURL(href);
    } catch {
        // Нет настроенного почтового клиента — показываем адрес, чтобы его можно было переписать.
        const message = `Не удалось открыть почтовое приложение. Напишите на адрес ${address}`;
        if (Platform.OS === 'web') {
            window.alert(message);
        } else {
            Alert.alert('Почта', message);
        }
    }
}

export function mailtoHref(address: string, { subject, body }: { subject?: string; body?: string } = {}) {
    const params = [
        subject && `subject=${encodeURIComponent(subject)}`,
        body && `body=${encodeURIComponent(body)}`,
    ].filter(Boolean);
    return `mailto:${address}${params.length ? `?${params.join('&')}` : ''}`;
}

const styles = StyleSheet.create({
    blockLink: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        marginTop: Spacing.three,
        marginBottom: Spacing.five,
    },
    link: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.two,
        paddingVertical: Spacing.three,
        paddingHorizontal: Spacing.three,
    },
    linkText: {
        flexShrink: 1,
        textAlign: 'center',
        fontWeight: '500',
        fontSize: 17,
        lineHeight: 22,
    },
});
