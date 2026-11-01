import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { GLOBAL_CSS } from '@/constants/global-css';
import { SITE_URL } from '@/constants/site';

export default function Root({ children }: PropsWithChildren) {
    const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();

    return (
        <html {...htmlAttributes} lang="ru">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
                <meta property="og:image" content={`${SITE_URL}/cap.jpg`} />
                <meta property="og:image:width" content="1024" />
                <meta property="og:image:height" content="500" />
                <meta property="og:image:alt" content="Память новомучеников" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:image" content={`${SITE_URL}/cap.jpg`} />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
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
                <meta name="author" content="Даниил Дыбка" />
            </head>
            <body {...bodyAttributes}>
                {children}
                {bodyNodes}
                <div style={{ display: 'none' }}>Автор проекта: Дыбка Даниил Викторович, daniil@dybka.ru</div>
            </body>
        </html>
    );
}
