import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { ReactNode } from 'react';

export default function Root({ children }: { children: ReactNode }) {
    const {
        htmlAttributes,
        bodyAttributes,
        headNodes,
        bodyNodes,
    } = useServerDocumentContext();

    return (
        <html {...htmlAttributes} lang='ru'>
            <head>
                <meta charSet='utf-8' />
                <meta httpEquiv='X-UA-Compatible' content='IE=edge' />
                <meta
                    name='viewport'
                    content='width=device-width, initial-scale=1'
                />

                <meta name='theme-color' content='#1C1C1C' />

                {/*
                <link
                    rel="icon"
                    type="image/png"
                    href="assets/icon.png"
                /> */}

                {headNodes}
            </head>

            <body {...bodyAttributes}>
                <ScrollViewStyleReset />
                {children}
                {bodyNodes}
            </body>
        </html>
    );
}
