import { Image } from 'expo-image';

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

/**
 * Веб-вариант ссылки на базу ПСТГУ: настоящий `<a>`, чтобы работали
 * открытие в новой вкладке и переход по ссылке поисковиком. Нативный
 * вариант — в `pstgu-copyright.tsx`.
 */
export default function PstguCopyright({ center = true, compact = false }: PstguCopyrightProps) {
    const scheme = useColorScheme();
    const variant = compact ? 'compact' : 'large';

    return (
        <a
            href={PSTGU_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={PSTGU_LABEL}
            style={{ display: 'block', marginTop: Spacing.five }}>
            <Image
                style={[
                    {
                        width: '100%',
                        maxWidth: PSTGU_MAX_WIDTHS[variant],
                        aspectRatio: PSTGU_RATIOS[variant],
                    },
                    center && { marginHorizontal: 'auto' },
                ]}
                source={PSTGU_LOGOS[variant][scheme]}
                contentFit="cover"
                transition={200}
                accessibilityLabel={PSTGU_LABEL}
            />
        </a>
    );
}
