import type { Metadata } from 'expo-router/server';
import { Head } from 'expo-router/head';

import { InfoPage, InfoParagraph, InfoSection } from '@/components/info-page';
import { SITE_URL } from '@/constants/site';

const title = 'Страница новомученика — Память новомучеников';
const description =
    'Сведения о новомучениках и исповедниках Церкви Русской.';

export async function generateMetadata(
    _request: undefined,
    _params: { id: string },
): Promise<Metadata> {
    return {
        title,
        description,
        keywords: [
            'новомученики',
            'исповедники Церкви Русской',
            'православие',
            'история Церкви',
        ],
        robots: { index: false, follow: true },
    };
}

export default function PersonWebPlaceholder() {
    const jsonLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        description,
        isPartOf: {
            '@type': 'WebSite',
            name: 'Память новомучеников',
            url: SITE_URL,
        },
    }).replaceAll('<', '\\u003c');

    return (
        <>
            <Head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: jsonLd }}
                />
            </Head>
            <InfoPage>
                <InfoSection title="Страница новомученика">
                    <InfoParagraph>
                        Веб-страница новомученика временно недоступна. Откройте приложение,
                        чтобы воспользоваться материалами проекта.
                    </InfoParagraph>
                </InfoSection>
            </InfoPage>
        </>
    );
}
