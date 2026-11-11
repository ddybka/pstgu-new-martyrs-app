import { InfoPage, InfoParagraph, InfoSection } from '@/components/info-page';
import { LinkRow } from '@/components/link-row';

import type { Metadata } from 'expo-router/server';
import { SITE_URL } from '@/constants/site';

export function generateMetadata(): Metadata {
    const title = 'Приложения — Память новомучеников';
    const description =
        'Приложения «Память новомучеников» для Android и iOS и веб-версия: дни памяти, биографии новомучеников и карта связанных с ними мест. Скачайте в RuStore или App Store.';

    const url = `${SITE_URL}/apps`;

    return {
        title,
        description,

        alternates: {
            canonical: url,
        },

        openGraph: {
            title,
            description,
            url,
            siteName: 'Память новомучеников',
            locale: 'ru_RU',
            type: 'website',
        },
    };
}

export default function AppsScreen() {
    return (
        <InfoPage>
            <InfoSection title="Мобильные приложения">
                <InfoParagraph>
                    «Память новомучеников» доступна на Android, iOS и в браузере. Везде — одни и те же дни
                    памяти, биографии и карта мест, связанных с жизнью новомучеников.
                </InfoParagraph>
            </InfoSection>
            <InfoSection title="Android">
                <InfoParagraph>
                    Приложение для Android можно установить из RuStore. Если магазин недоступен, скачайте
                    APK напрямую — файл откроется на телефоне или планшете.
                </InfoParagraph>
                <LinkRow
                    variant="button"
                    href="https://www.rustore.ru/catalog/app/com.dybka.pamyat_novomuchenikov"
                    label="RuStore"
                />
                <LinkRow variant="button" href={`${SITE_URL}/android.apk`} label="Скачать APK" />
            </InfoSection>
            <InfoSection title="iOS">
                <InfoParagraph>
                    Приложение для iPhone и iPad — в App Store. Откройте страницу приложения, чтобы
                    установить его или посмотреть список изменений.
                </InfoParagraph>
                <LinkRow
                    variant="button"
                    href="https://apps.apple.com/app/id6823608592"
                    label="App Store"
                />
            </InfoSection>
            <InfoSection title="Веб-сайт">
                <InfoParagraph>
                    Веб-версия работает в браузере на компьютере, планшете и телефоне — устанавливать
                    ничего не нужно. Её можно добавить на главный экран как обычное приложение.
                </InfoParagraph>
                <LinkRow variant="button" href="https://map.dybka.ru" label="Открыть сайт" />
            </InfoSection>
        </InfoPage>
    );
}
