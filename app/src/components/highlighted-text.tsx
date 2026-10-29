import { Text, type StyleProp, type TextStyle } from 'react-native';

import { ThemedText, type ThemedTextProps } from './themed-text';

import { useTheme } from '@/hooks/use-theme';
import { findMatches } from '@/utils/text-search';

/**
 * Текст с подсвеченными совпадениями поиска по странице (см. `text-search`).
 *
 * `first` — сквозной номер первого совпадения в этом тексте, `active` —
 * номер текущего совпадения на странице: оно выделено инверсно, остальные —
 * серой плашкой. Без запроса — обычный `ThemedText`.
 */
export function HighlightedText({
    children,
    needle,
    first = 0,
    active = null,
    style,
    ...rest
}: Omit<ThemedTextProps, 'children'> & {
    children: string;
    needle: string;
    first?: number;
    active?: number | null;
    style?: StyleProp<TextStyle>;
}) {
    const theme = useTheme();
    const matches = needle ? findMatches(children, needle) : [];

    if (matches.length === 0) {
        return (
            <ThemedText style={style} {...rest}>
                {children}
            </ThemedText>
        );
    }

    const parts: React.ReactNode[] = [];
    let cursor = 0;

    matches.forEach((start, index) => {
        if (start > cursor) parts.push(children.slice(cursor, start));
        const current = first + index === active;
        parts.push(
            <Text
                key={start}
                style={
                    current
                        ? { backgroundColor: theme.text, color: theme.background }
                        : { backgroundColor: theme.backgroundSelected }
                }>
                {children.slice(start, start + needle.length)}
            </Text>
        );
        cursor = start + needle.length;
    });
    if (cursor < children.length) parts.push(children.slice(cursor));

    return (
        <ThemedText style={style} {...rest}>
            {parts}
        </ThemedText>
    );
}
