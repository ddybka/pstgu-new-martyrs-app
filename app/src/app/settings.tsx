import { InfoPage, InfoParagraph, InfoSection } from '@/components/info-page';

/** Страница «Настройки». Пока заглушка: текст ещё не написан. */
export default function SettingsScreen() {
    return (
        <InfoPage>
            <InfoSection title="Настройки">
                <InfoParagraph>
                    Здесь будут настройки: переключение темы, уведомления, поле скачивания кэша.
                </InfoParagraph>
                <InfoParagraph>
                    Текст страницы находится в подготовке.
                </InfoParagraph>
            </InfoSection>
        </InfoPage>
    );
}
