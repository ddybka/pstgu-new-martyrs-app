import type { Metadata } from 'expo-router/server';

import { InfoPage, InfoParagraph, InfoSection } from '@/components/info-page';
import { SITE_URL } from '@/constants/site';
import { LinkRow } from '@/components/link-row';

const CONTACT_EMAIL = 'daniil@dybka.ru';
const CONTACT_HREF = `mailto:${CONTACT_EMAIL}`;

export function generateMetadata(): Metadata {
    const title = 'Поддержка — Память новомучеников';
    const description =
        'Как приложение «Память новомучеников» обрабатывает данные пользователей.';

    return {
        title,
        description,
        keywords: [
            'поддержка',
            'Память новомучеников',
            'контакты',
        ],
        alternates: { canonical: `${SITE_URL}/support` },
        robots: { index: true, follow: true },
    };
}

export default function SupportScreen() {
    return (
        <InfoPage>
            <InfoSection title="Контактная информация">
                <InfoParagraph>
                    Есть вопросы или проблема? Напишите нам на почту
                </InfoParagraph>
                <LinkRow label={CONTACT_EMAIL} href={CONTACT_HREF} />
            </InfoSection>
        </InfoPage>
    );
}
