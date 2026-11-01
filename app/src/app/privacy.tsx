import type { Metadata } from 'expo-router/server';

import { InfoPage, InfoParagraph, InfoSection } from '@/components/info-page';
import { SITE_URL } from '@/constants/site';

export function generateMetadata(): Metadata {
    const title = 'Политика конфиденциальности — Память новомучеников';
    const description =
        'Как приложение «Память новомучеников» обрабатывает данные пользователей.';

    return {
        title,
        description,
        keywords: [
            'политика конфиденциальности',
            'Память новомучеников',
            'персональные данные',
        ],
        alternates: { canonical: `${SITE_URL}/privacy` },
        robots: { index: true, follow: true },
    };
}

export default function PrivacyScreen() {
    return (
        <InfoPage>
            <InfoSection title="Общие положения">
                <InfoParagraph>
                    Приложение «Память новомучеников» не собирает, не запрашивает и не хранит
                    персональные данные пользователей. В приложении нет рекламных трекеров
                    и аналитики.
                </InfoParagraph>
                <InfoParagraph>
                    Настройки приложения, если они сохраняются на устройстве, остаются на
                    этом устройстве и не отправляются разработчикам.
                </InfoParagraph>
            </InfoSection>

            <InfoSection title="Сторонние сервисы">
                <InfoParagraph>
                    Для получения материалов приложение обращается к API проекта. Карты
                    загружаются с использованием сторонних картографических сервисов.
                    При сетевом запросе соответствующий сервис может получить технические
                    данные, необходимые для его обработки, например IP-адрес и сведения
                    о запросе. Эти данные обрабатываются по правилам самого сервиса.
                </InfoParagraph>
                <InfoParagraph>
                    Приложение не контролирует обработку данных сторонними сервисами.
                    При переходе по внешним ссылкам действуют политики конфиденциальности
                    соответствующих сайтов.
                </InfoParagraph>
            </InfoSection>

            <InfoSection title="Изменения и связь">
                <InfoParagraph>
                    При изменении функций приложения эта политика может обновляться.
                    Дата последнего обновления: 1 ноября 2026 года.
                </InfoParagraph>
                <InfoParagraph>
                    Контакт для вопросов о конфиденциальности: daniil@dybka.ru
                </InfoParagraph>
            </InfoSection>
        </InfoPage>
    );
}
