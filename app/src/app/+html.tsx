import type { PropsWithChildren } from 'react';

import { GLOBAL_CSS } from '@/constants/global-css';

/**
 * HTML-оболочка веб-версии — только для статической сборки, в приложении на
 * телефоне её нет.
 *
 * Повторяет стандартную оболочку expo-router (мета-теги, сброс прокрутки,
 * служебные узлы `headNodes`/`bodyNodes`) и добавляет к ней:
 *
 * - `lang="ru"` — сайт русскоязычный: так браузер правильно переносит слова
 *   и не предлагает перевести страницу;
 * - предзагрузку жирной кириллицы PT Serif: она нужна на первом же экране
 *   (заголовки) и качается вместе со страницей, а не когда браузер дойдёт до
 *   текста. Остальные файлы шрифта — по требованию (см. `GLOBAL_CSS`);
 * - глобальные стили прямо в HTML, а не отдельным файлом: так их загрузка не
 *   задерживает первую отрисовку;
 * - `preconnect` к серверам данных: пока качается и запускается JS, браузер
 *   уже открыл соединение и прошёл TLS, и первый запрос к API и первые фото
 *   приходят на сотни миллисекунд раньше. `crossorigin` у API — запросы к
 *   нему идут через fetch с заголовками, это отдельное соединение.
 */
export default function Root({ children }: PropsWithChildren) {
    const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();

    return (
        <html {...htmlAttributes} lang="ru">
            <head>
                <meta charSet="utf-8" />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
                <link rel="preconnect" href="https://api.nmbook.ru" crossOrigin="anonymous" />
                <link rel="preconnect" href="https://img.nmbook.ru" />
                <link
                    rel="preload"
                    href="/fonts/pt-serif-700-cyrillic.woff2"
                    as="font"
                    type="font/woff2"
                    crossOrigin="anonymous"
                />
                <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
                <ScrollViewStyleReset />
                {headNodes}
            </head>
            <body {...bodyAttributes}>
                {children}
                {bodyNodes}
            </body>
        </html>
    );
}
