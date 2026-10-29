import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconProps } from '@/components/ui/icon';
import { ThemedText } from '@/components/themed-text';
import { ButtonRadius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const PLATE_BUTTON_HEIGHT = 32;
const ICON_SIZE = 15;

/**
 * Кнопка-плашка: подпись и иконка справа на сером фоне, едва скруглённая.
 * «Вернуться к дате» в календаре, «Показать в биографии» на странице
 * новомученика, «Выбрать все» в настройках (без иконки).
 */
export function PlateButton({
    label,
    icon,
    onPress,
    accessibilityLabel,
    background = 'backgroundElement',
    style,
    iconStyle,
}: {
    label: string;
    icon?: IconProps['name'];
    onPress: () => void;
    accessibilityLabel?: string;
    /** Фон плашки. На сером фоне — цвет страницы, иначе плашка пропадёт. */
    background?: ThemeColor;
    style?: StyleProp<ViewStyle>;
    iconStyle?: StyleProp<ViewStyle>;
}) {
    const theme = useTheme();

    return (
        <Pressable
            onPress={onPress}
            hitSlop={Spacing.two}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? label}
            style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme[background] },
                pressed && styles.pressed,
                style,
            ]}>
            <ThemedText type="small">{label}</ThemedText>
            {icon && (
                <Icon
                    name={icon}
                    size={ICON_SIZE}
                    style={[styles.icon, iconStyle]}
                    tintColor={theme.text}
                    weight="medium"
                />
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        height: PLATE_BUTTON_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one,
        paddingHorizontal: Spacing.three,
        borderRadius: ButtonRadius,
    },
    icon: {
        transform: [{ translateY: -1 }],
    },
    pressed: {
        opacity: 0.7,
    },
});
