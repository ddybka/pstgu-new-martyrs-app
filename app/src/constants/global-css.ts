/**
 * Глобальные стили веб-версии: переменные шрифтов, `@font-face` PT Serif,
 * подсказка поверх карты в странице.
 *
 * Строкой, а не файлом .css: стили встраиваются прямо в HTML (`<style>` в
 * `+html.tsx`). Файл .css подключался бы отдельным запросом в <head>, и
 * браузер не рисовал бы страницу, пока его не скачает.
 */
export const GLOBAL_CSS = `
:root {
    --font-display:
        Spline Sans, Inter, ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji,
        Segoe UI Symbol, Noto Color Emoji;
    --font-mono:
        ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace;
    --font-rounded: 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif;
    --font-serif: Georgia, 'Times New Roman', serif;
}

/*
 * PT Serif — заголовочная гарнитура (HeadingFonts в constants/theme), файлы
 * лежат в проекте: public/fonts (лицензия — public/fonts/OFL.txt).
 *
 * - woff2 — разбит на кириллицу и латиницу (\`unicode-range\`): браузер качает
 *   только тот, чьи буквы есть на странице, — по ~10 КБ;
 * - woff — целиком, для браузеров без woff2: они пропускают первый \`src\`
 *   и берут второй. Браузер с woff2 woff не качает вовсе.
 *
 * \`font-display: swap\` — текст виден сразу системным шрифтом и подменяется,
 * когда PT Serif загрузится, а не прячется до загрузки.
 *
 * Имена семейств — те же, под которыми шрифт грузится на телефоне
 * (\`PTSerif_400Regular\`, \`PTSerif_700Bold\`): у каждого начертания своё
 * семейство. Диапазон \`font-weight\` — чтобы браузер не дорисовывал
 * «жирность» поверх уже жирного начертания, если у текста задан fontWeight.
 */
@font-face {
    font-family: 'PTSerif_400Regular';
    font-style: normal;
    font-weight: 100 900;
    font-display: swap;
    src: url('/fonts/pt-serif-400-cyrillic.woff2') format('woff2'), url('/fonts/pt-serif-400.woff') format('woff');
    unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
}
@font-face {
    font-family: 'PTSerif_400Regular';
    font-style: normal;
    font-weight: 100 900;
    font-display: swap;
    src: url('/fonts/pt-serif-400-latin.woff2') format('woff2'), url('/fonts/pt-serif-400.woff') format('woff');
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
    font-family: 'PTSerif_700Bold';
    font-style: normal;
    font-weight: 100 900;
    font-display: swap;
    src: url('/fonts/pt-serif-700-cyrillic.woff2') format('woff2'), url('/fonts/pt-serif-700.woff') format('woff');
    unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
}
@font-face {
    font-family: 'PTSerif_700Bold';
    font-style: normal;
    font-weight: 100 900;
    font-display: swap;
    src: url('/fonts/pt-serif-700-latin.woff2') format('woff2'), url('/fonts/pt-serif-700.woff') format('woff');
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/*
 * Подсказка поверх карты в странице («прокручивайте с ⌘», «двумя пальцами»,
 * см. cooperativeGestures в martyrs-map.web): вместо простого затемнения —
 * лёгкое размытие карты под ней и затемнение слабее. Селектор с
 * \`.maplibregl-map\` — специфичнее библиотечного: стили maplibre-gl грузятся
 * вместе с картой, уже после этих, и иначе перекрыли бы их.
 */
.maplibregl-map .maplibregl-cooperative-gesture-screen {
    background: rgba(0, 0, 0, 0.25);
    -webkit-backdrop-filter: blur(6px);
    backdrop-filter: blur(6px);
    font-family: var(--font-display);
    font-size: 17px;
    font-weight: 600;
    text-align: center;
}
`;
