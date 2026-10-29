import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { GLOBAL_CSS } from '@/constants/global-css';

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
