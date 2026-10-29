/**
 * Типы точек в порядке показа в фильтре. Ключи — как в данных
 * (`clusterType` у map.nmbook.ru).
 */
export const POINT_KINDS = [
    { kind: 'репрессии', label: 'Репрессии' },
    { kind: 'служение', label: 'Служение' },
    { kind: 'кончина', label: 'Кончина' },
    { kind: 'другое', label: 'Другое' },
] as const;

/**
 * Цвет точки по типу. Светлый и тёмный наборы свои: на чёрной подложке
 * насыщенные цвета светлой темы проваливаются в фон.
 */
export const KIND_COLORS = {
    light: {
        репрессии: '#E03131',
        служение: '#1971C2',
        кончина: '#6741D9',
        другое: '#868E96',
    },
    dark: {
        репрессии: '#FF6B6B',
        служение: '#4DABF7',
        кончина: '#B197FC',
        другое: '#ADB5BD',
    },
} as const;

export type KindColors = (typeof KIND_COLORS)[keyof typeof KIND_COLORS];

export function kindColor(colors: KindColors, kind: string): string {
    return (colors as Record<string, string>)[kind] ?? colors.другое;
}
