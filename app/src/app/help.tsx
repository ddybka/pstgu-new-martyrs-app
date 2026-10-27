import { InfoList, InfoPage, InfoParagraph, InfoSection } from "@/components/info-page";
import { LinkRow, mailtoHref } from "@/components/link-row";

import { Metadata } from "expo-router/server";
import { SITE_URL } from "@/constants/site";

export function generateMetadata(): Metadata {
    const title = 'Помощь в развитии проекта "Память новомучеников" и расширении базы данных за Христа пострадавших.';
    const description = 'Как помочь проекту "Память новомучиков": передать сведения, фотографии и документы о новомучениках, которых нет в базе, или дополнить существующие материалы. Контакты для связи.';

    const url = `${SITE_URL}/help`;

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

const CONTACT_EMAIL = 'pstbinm@yandex.ru';

const CONTACT_HREF = mailtoHref(CONTACT_EMAIL, {
    subject: 'Сведения о новомученике',
    body: [
        'ФИО новомученика:',
        '',
        'Описание найденных сведений:',
        '',
        'Источник информации:',
        '',
        'Ваши имя и контакты для обратной связи:',
        '',
    ].join('\n'),
});

export default function HelpScreen() {
    return (
        <InfoPage>
            <InfoSection title="Помощь в сборе информации">
                <InfoParagraph>
                    Если у вас есть сведения о новомучениках и исповедниках Церкви Русской, которых пока нет в базе, или дополнительные материалы об уже представленных людях, вы можете передать их проекту.
                </InfoParagraph>
                <InfoParagraph>
                    Это могут быть биографические данные, фотографии, документы, воспоминания, сведения о местах служения, ареста, ссылки, заключения или захоронения, ссылки на архивные и опубликованные источники, а также изображения икон новомучеников и другие материалы, которые могут дополнить существующие сведения.
                </InfoParagraph>
            </InfoSection>
            <InfoSection title="Как передать сведения">
                <InfoParagraph>
                    Отправьте материалы по электронной почте:
                </InfoParagraph>
                <LinkRow label={CONTACT_EMAIL} href={CONTACT_HREF} />
                <InfoParagraph>Укажите:</InfoParagraph>
                <InfoList
                    items={[
                        'ФИО новомученика',
                        'описание найденных сведений',
                        'источник информации',
                        'ваши имя и контакты для обратной связи',
                    ]}
                />
                <InfoParagraph>
                    Ваши контактные данные нужны для уточнения информации и проверки происхождения материалов. Все поступившие сведения проверяются перед добавлением в проект, поэтому их отправка не означает автоматического размещения в базе. Даже небольшое уточнение, семейное свидетельство, старая фотография или изображение иконы могут быть полезны.
                </InfoParagraph>
            </InfoSection>
            <InfoSection title="Как ещё можно помочь">
                <InfoParagraph>
                    Также вы можете помочь, распространяя информацию о проекте среди тех, кому она может быть полезна. Чем больше людей узнают о проекте, тем больше
                    возможностей найти новые сведения и сохранить память о тех, кто пострадал за веру.
                </InfoParagraph>
                <InfoParagraph>
                    Спасибо всем, кто помогает проекту и участвует в сохранении памяти о новомучениках!
                </InfoParagraph>
            </InfoSection>
        </InfoPage>
    )
}
