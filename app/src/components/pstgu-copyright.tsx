import { Image } from 'expo-image';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';

import {
    PSTGU_LABEL,
    PSTGU_LOGOS,
    PSTGU_MAX_WIDTHS,
    PSTGU_RATIOS,
    PSTGU_URL,
    type PstguCopyrightProps,
} from './pstgu-copyright-data';

import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { openLink } from '@/utils/open-link';

/** На телефоне логотип с подписью мельче, чем в вебе: 300 px не влезает. */
const PHONE_LOGO_WIDTH = 240;
const TABLET_MIN_WIDTH = 600;

/**
 * Ссылка на базу ПСТГУ под подвалом списков.
 *
 * Нативный вариант: `<a>` в React Native не существует, поэтому нажатие
 * обрабатывает `Pressable`, а ссылка открывается встроенным браузером
 * (см. `openLink`). Веб-вариант — в `pstgu-copyright.web.tsx`.
 */
export default function PstguCopyright({ center = true, compact = false }: PstguCopyrightProps) {
    const scheme = useColorScheme();
    const { width } = useWindowDimensions();
    const variant = compact ? 'compact' : 'large';

    // Ширину считаем в точках, а не в процентах: иначе `maxWidth` на iOS
    // иногда уступает `width: '100%'`, и логотип выходил за края экрана.
    const wanted = compact
        ? PSTGU_MAX_WIDTHS.compact
        : width >= TABLET_MIN_WIDTH
            ? PSTGU_MAX_WIDTHS.large
            : PHONE_LOGO_WIDTH;
    const logoWidth = Math.max(0, Math.min(wanted, width - Spacing.four * 2));

    return (
        <Pressable
            accessibilityRole="link"
            accessibilityLabel={PSTGU_LABEL}
            onPress={() => openLink(PSTGU_URL)}
            style={({ pressed }) => [styles.link, center && styles.center, pressed && styles.pressed]}>
            <Image
                style={{ width: logoWidth, aspectRatio: PSTGU_RATIOS[variant] }}
                source={PSTGU_LOGOS[variant][scheme]}
                contentFit="contain"
                transition={200}
                accessibilityLabel={PSTGU_LABEL}
            />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    link: {
        width: '100%',
        marginTop: Spacing.five,
    },
    center: {
        alignItems: 'center',
    },
    pressed: {
        opacity: 0.7,
    },
});
