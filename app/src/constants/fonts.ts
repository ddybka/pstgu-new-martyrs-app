import type { FontSource } from 'expo-font';

/**
 * Шрифты, которые на телефоне грузятся при запуске (см. `useFonts` в
 * корневом `_layout`). Файлы — в assets/fonts, имена — как в `HeadingFonts`.
 *
 * В вебе здесь пусто (`fonts.web.ts`): там PT Serif подключён через
 * `@font-face` в global.css — woff2/woff с `font-display: swap`, — и ждать
 * его до первой отрисовки незачем.
 */
export const FONT_SOURCES: Record<string, FontSource> = {
    PTSerif_400Regular: require('@/assets/fonts/PTSerif-Regular.ttf'),
    PTSerif_700Bold: require('@/assets/fonts/PTSerif-Bold.ttf'),
};
