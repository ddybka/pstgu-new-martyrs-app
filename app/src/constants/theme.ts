import { Platform } from 'react-native';

export const Colors = {
    light: {
        text: '#000000',
        background: '#ffffff',
        /**
         * Приподнятые поверхности поверх страницы: плавающая шапка веба,
         * выпадающие списки. В светлой теме их отделяет тень, в тёмной тень на
         * чёрном не видна — там их отделяет сам фон, чуть светлее страницы.
         */
        backgroundRaised: '#ffffff',
        /**
         * Слабый фон для целых блоков — едва отличим от страницы. На нём
         * обычные серые плашки (`backgroundElement`) по-прежнему читаются.
         */
        backgroundSubtle: '#F7F7F9',
        backgroundElement: '#F0F0F3',
        backgroundSelected: '#E0E1E6',
        textSecondary: '#60646C',
        /** Линии между строками: границы карточек в списках, кнопки-строки. */
        separator: '#C6C6C8',
        /** Чин святости над именем канонизированных — бордовый. */
        holiness: '#8E1B2C',
    },
    dark: {
        text: '#ffffff',
        background: '#000000',
        backgroundRaised: '#18191B',
        backgroundSubtle: '#0E0E10',
        backgroundElement: '#212225',
        backgroundSelected: '#2E3135',
        textSecondary: '#B0B4BA',
        separator: '#3A3A3C',
        // На чёрном тёмный бордовый не читается — светлее и теплее.
        holiness: '#E07585',
    },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
    ios: {
        sans: 'system-ui',
        serif: 'ui-serif',
        rounded: 'ui-rounded',
        mono: 'ui-monospace',
    },
    default: {
        sans: 'normal',
        serif: 'serif',
        rounded: 'normal',
        mono: 'monospace',
    },
    web: {
        sans: 'var(--font-display)',
        serif: 'var(--font-serif)',
        rounded: 'var(--font-rounded)',
        mono: 'var(--font-mono)',
    },
});

/**
 * Заголовочная гарнитура — PT Serif.
 */
export const HeadingFonts = {
    regular: 'PTSerif_400Regular',
    bold: 'PTSerif_700Bold',
} as const;

export const Spacing = {
    half: 2,
    one: 4,
    two: 8,
    three: 16,
    four: 24,
    five: 32,
    six: 64,
} as const;

/**
 * Ручной отступ под таб-бар.
 *
 * Нужен только там, где контент не в скролле с
 * `contentInsetAdjustmentBehavior="automatic"`: у нативных вкладок iOS 26 бар
 * плавает поверх контента, и систему инсетов надо либо отдать ей целиком, либо
 * компенсировать руками. Смешивать нельзя — получится пустая полоса под баром.
 */
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
/** Высота плавающей шапки веб-версии вместе с её внешними отступами. */
export const WebHeaderInset = 92;
export const MaxContentWidth = 800;
/**
 * Скругление кнопок-плашек: вкладки веб-шапки, «Кратко», «вернуться к дате».
 * Едва заметное — не капсулы.
 */
export const ButtonRadius = 6;
/** Скругление плавающих поверхностей: веб-шапка, выпадающие списки, шторка карты. */
export const SurfaceRadius = 10;
/** Тень плавающих поверхностей — мягкая, среднего размера. */
export const SurfaceShadow = '0 4px 16px rgba(0, 0, 0, 0.12)';
