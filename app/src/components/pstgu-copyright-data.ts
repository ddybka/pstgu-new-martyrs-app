/** Общие данные ссылки на базу ПСТГУ для нативного и веб-варианта. */

export type PstguCopyrightProps = {
    /** Выровнять логотип по центру (по умолчанию — да). */
    center?: boolean;
    /** Компактный логотип без подписи — для узких блоков. */
    compact?: boolean;
};

export const PSTGU_URL = 'https://pstgu.ru/baza-dannykh-za-khrista-postradavshie/';
export const PSTGU_LABEL = 'Православный Свято-Тихоновский гуманитарный университет';

export const PSTGU_LOGOS = {
    large: {
        light: require('@/assets/images/pstgu/pstgu-full-text.png'),
        dark: require('@/assets/images/pstgu/pstgu-full-text-dark.png'),
    },
    compact: {
        light: require('@/assets/images/pstgu/pstgu.png'),
        dark: require('@/assets/images/pstgu/pstgu-dark.png'),
    },
} as const;

export const PSTGU_RATIOS = {
    large: 1093 / 792,
    compact: 311 / 319,
} as const;

export const PSTGU_MAX_WIDTHS = {
    large: 300,
    compact: 120,
} as const;
