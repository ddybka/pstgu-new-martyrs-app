import { Text, type StyleProp, type TextStyle } from 'react-native';

import { ThemedText } from './themed-text';

import { useTheme } from '@/hooks/use-theme';
import { capitalize } from '@/utils/person-name';

/**
 * Строка над именем: чин святости бордовым и, если передан, сан — серым:
 * «Исповедник · епископ». Так канонизированные видны в списке сразу, а само
 * имя остаётся таким же, как у всех.
 *
 * Без чина и сана строки нет. Части — вложенный `Text`, а не `ThemedText`:
 * размер и начертание они наследуют от строки, меняется только цвет.
 */
export function PersonRankLine({
    holiness,
    rank,
    style,
}: {
    holiness?: string | null;
    rank?: string | null;
    style?: StyleProp<TextStyle>;
}) {
    const theme = useTheme();
    const saint = capitalize(holiness);
    const office = rank?.trim() || null;

    if (!saint && !office) return null;

    return (
        <ThemedText themeColor="textSecondary" style={style}>
            {saint && <Text style={{ color: theme.holiness }}>{saint}</Text>}
            {saint && office && ' · '}
            {office && (saint ? office : capitalize(office))}
        </ThemedText>
    );
}
