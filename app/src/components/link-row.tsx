import { Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { ThemedText } from '@/components/themed-text';
import { ButtonRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { openLink } from '@/utils/open-link';

/**
 * Строка-ссылка. По умолчанию — во всю ширину страницы, с линиями сверху и
 * снизу. `variant="button"` — такая же плашка, как кнопки «Помочь проекту» и
 * «Настройки» внизу главной: так ссылки на приложения стоят подряд, а не
 * разъезжаются на полэкрана.
 */
export function LinkRow({
    label,
    href,
    onPress,
    variant = 'row',
}: {
    label: string;
    href?: string;
    onPress?: () => void;
    variant?: 'row' | 'button';
}) {
    const theme = useTheme();
    const isMail = href?.startsWith('mailto:') ?? false;
    const isButton = variant === 'button';

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
                isButton && styles.blockButton,
                {
                    borderColor: theme.separator,
                    backgroundColor: isButton ? theme.backgroundElement : 'transparent',
                    opacity: pressed ? 0.7 : 1,
                },
            ]}>
            <View style={[styles.link, isButton && styles.linkButton]}>
                {href && isMail && (
                    <Icon
                        name={{ ios: 'envelope', android: 'mail', web: 'mail' }}
                        size={18}
                        tintColor={theme.text}
                        weight="medium"
                    />
                )}
                <ThemedText style={[styles.linkText, isButton && styles.buttonText]}>{label}</ThemedText>
                {href && !isMail && (
                    <Icon
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
    blockButton: {
        borderTopWidth: 0,
        borderBottomWidth: 0,
        borderRadius: ButtonRadius,
        marginTop: 0,
        marginBottom: Spacing.two,
        marginHorizontal: Spacing.three,
        overflow: 'hidden',
    },
    link: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.two,
        paddingVertical: Spacing.three,
        paddingHorizontal: Spacing.three,
    },
    linkButton: {
        paddingVertical: Spacing.three,
    },
    linkText: {
        flexShrink: 1,
        textAlign: 'center',
        fontWeight: '500',
        fontSize: 17,
        lineHeight: 22,
    },
    buttonText: {
        fontWeight: '600',
    },
});
